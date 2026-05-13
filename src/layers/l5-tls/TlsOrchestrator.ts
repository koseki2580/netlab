import { FakeDeterministicProvider } from '../../crypto/FakeDeterministicProvider';
import type { CryptoProvider } from '../../crypto/CryptoProvider';
import type { PacketHop, PacketTrace } from '../../types/simulation';
import type { TlsAnnotation, TlsConnectionContext, TlsServerConfig } from '../../types/tls';
import {
  TLS_AES_128_GCM_SHA256,
  TLS_GROUP_X25519,
  TLS_SIGNATURE_ED25519,
  TLS_VERSION_1_3,
} from '../../types/tls';
import { negotiateAlpn } from './TlsAlpn';
import { INITIAL_TLS_CONTEXT, transitionTls } from './TlsHandshake';
import {
  serializeClientHello,
  serializeOpaqueHandshake,
  serializeServerHello,
  TLS_HANDSHAKE_TYPES,
} from './TlsHandshakeMessages';
import { deriveEarlySecret, deriveHandshakeSecrets, deriveMasterSecrets } from './TlsKeySchedule';
import { serializeTlsRecord } from './TlsRecord';

export interface TlsHandshakeOptions {
  readonly clientNodeId: string;
  readonly serverNodeId: string;
  readonly clientIp: string;
  readonly serverIp: string;
  readonly clientAlpn: readonly string[];
  readonly server: TlsServerConfig;
  readonly hostname?: string;
  readonly provider?: CryptoProvider;
}

export interface TlsHandshakeRun {
  readonly context: TlsConnectionContext;
  readonly annotations: readonly TlsAnnotation[];
  readonly traces: readonly PacketTrace[];
  readonly records: readonly Uint8Array[];
  readonly secrets: readonly { label: string; value: Uint8Array }[];
}

function baseHop(
  step: number,
  nodeId: string,
  label: string,
  action: NonNullable<PacketHop['action']>,
  tlsTrace: TlsAnnotation,
): PacketHop {
  return {
    step,
    nodeId,
    nodeLabel: label,
    srcIp: '0.0.0.0',
    dstIp: '0.0.0.0',
    ttl: 64,
    protocol: 'TCP',
    event: 'forward',
    action,
    tlsTrace,
    timestamp: step,
  };
}

function traceFor(
  index: number,
  clientNodeId: string,
  serverNodeId: string,
  annotation: TlsAnnotation,
): PacketTrace {
  const fromClient =
    annotation.kind === 'tls:client-hello' ||
    (annotation.kind === 'tls:finished' && annotation.who === 'client') ||
    annotation.kind === 'tls:application-data';
  const srcNodeId = fromClient ? clientNodeId : serverNodeId;
  const dstNodeId = fromClient ? serverNodeId : clientNodeId;
  return {
    packetId: `tls-${index}-${annotation.kind}`,
    label: annotation.kind,
    srcNodeId,
    dstNodeId,
    status: annotation.kind === 'tls:alert' ? 'dropped' : 'delivered',
    hops: [baseHop(index, srcNodeId, srcNodeId, annotation.kind, annotation)],
  };
}

export class TlsOrchestrator {
  constructor(private readonly defaultProvider: CryptoProvider = new FakeDeterministicProvider()) {}

  async runHandshake(options: TlsHandshakeOptions): Promise<TlsHandshakeRun> {
    const provider = options.provider ?? this.defaultProvider;
    const clientKey = await provider.generateKeyPair('X25519');
    const serverKey = await provider.generateKeyPair('X25519');
    const selected = negotiateAlpn(options.clientAlpn, options.server.alpnProtocols);
    const annotations: TlsAnnotation[] = [];
    const records: Uint8Array[] = [];
    let context: TlsConnectionContext = INITIAL_TLS_CONTEXT;

    const serverName = options.hostname ?? options.server.hostname;
    const ch = {
      random: provider.randomBytes(32, 0x81f1),
      cipherSuites: [TLS_AES_128_GCM_SHA256],
      keyShare: { group: TLS_GROUP_X25519, pub: clientKey.pub },
      alpnProtocols: options.clientAlpn,
      ...(serverName !== undefined ? { serverName } : {}),
      signatureAlgorithms: [TLS_SIGNATURE_ED25519],
      supportedVersions: [TLS_VERSION_1_3],
    } as const;
    const chBytes = serializeClientHello(ch);
    records.push(
      serializeTlsRecord({ contentType: 'handshake', version: 0x0303, payload: chBytes }),
    );
    const chAnnotation: TlsAnnotation = {
      kind: 'tls:client-hello',
      keyShareLen: clientKey.pub.length,
      alpnList: options.clientAlpn,
    };
    annotations.push(chAnnotation);
    context = transitionTls(context, { type: 'start', bytes: chBytes });

    if ('fatalAlert' in selected) {
      const alert: TlsAnnotation = {
        kind: 'tls:alert',
        level: 'fatal',
        description: selected.fatalAlert,
      };
      annotations.push(alert);
      return {
        context: { ...context, state: 'closed', alert },
        annotations,
        traces: annotations.map((annotation, index) =>
          traceFor(index, options.clientNodeId, options.serverNodeId, annotation),
        ),
        records,
        secrets: [],
      };
    }

    const sh = {
      random: provider.randomBytes(32, 0x81f2),
      cipherSuite: TLS_AES_128_GCM_SHA256,
      keyShare: { group: TLS_GROUP_X25519, pub: serverKey.pub },
      supportedVersion: TLS_VERSION_1_3,
      selectedAlpn: selected.selected,
    } as const;
    const shBytes = serializeServerHello(sh);
    records.push(
      serializeTlsRecord({ contentType: 'handshake', version: 0x0303, payload: shBytes }),
    );
    annotations.push({ kind: 'tls:server-hello', selectedAlpn: selected.selected });
    context = transitionTls(context, {
      type: 'recvServerHello',
      selectedAlpn: selected.selected,
      bytes: shBytes,
    });

    const { earlySecret } = await deriveEarlySecret(provider, null);
    const dheSecret = await provider.deriveSharedSecret(clientKey.priv, serverKey.pub);
    const handshakeSecrets = await deriveHandshakeSecrets(
      provider,
      earlySecret,
      dheSecret,
      context.transcriptHash,
    );
    const certBytes = provider.randomBytes(256, 0x81f3);
    const certMessage = serializeOpaqueHandshake(TLS_HANDSHAKE_TYPES.certificate, certBytes);
    records.push(
      serializeTlsRecord({
        contentType: 'application_data',
        version: 0x0303,
        payload: certMessage,
      }),
    );
    annotations.push({ kind: 'tls:certificate', certBytes: certBytes.length });
    context = transitionTls(context, { type: 'recvCertificate', bytes: certMessage });

    const signature = await provider.signEd25519(serverKey.priv, context.transcriptHash);
    const cvMessage = serializeOpaqueHandshake(TLS_HANDSHAKE_TYPES.certificate_verify, signature);
    records.push(
      serializeTlsRecord({ contentType: 'application_data', version: 0x0303, payload: cvMessage }),
    );
    annotations.push({ kind: 'tls:certificate-verify', sigBytes: signature.length });
    context = transitionTls(context, { type: 'recvCertificateVerify', bytes: cvMessage });

    const serverFinished = serializeOpaqueHandshake(
      TLS_HANDSHAKE_TYPES.finished,
      await provider.hkdfExpandLabel(
        handshakeSecrets.handshakeSecret,
        'finished',
        context.transcriptHash,
        32,
      ),
    );
    records.push(
      serializeTlsRecord({
        contentType: 'application_data',
        version: 0x0303,
        payload: serverFinished,
      }),
    );
    annotations.push({ kind: 'tls:finished', who: 'server' });
    context = transitionTls(context, {
      type: 'recvFinished',
      who: 'server',
      bytes: serverFinished,
    });

    const masterSecrets = await deriveMasterSecrets(
      provider,
      handshakeSecrets.handshakeSecret,
      context.transcriptHash,
    );
    const clientFinished = serializeOpaqueHandshake(
      TLS_HANDSHAKE_TYPES.finished,
      await provider.hkdfExpandLabel(
        masterSecrets.masterSecret,
        'finished',
        context.transcriptHash,
        32,
      ),
    );
    records.push(
      serializeTlsRecord({
        contentType: 'application_data',
        version: 0x0303,
        payload: clientFinished,
      }),
    );
    annotations.push({ kind: 'tls:finished', who: 'client' });
    context = transitionTls(context, {
      type: 'recvFinished',
      who: 'client',
      bytes: clientFinished,
    });

    const appData = new TextEncoder().encode('GET / HTTP/1.1');
    annotations.push({ kind: 'tls:application-data', bytes: appData.length });

    return {
      context: {
        ...context,
        handshakeSecret: handshakeSecrets.handshakeSecret,
        clientHandshakeKey: handshakeSecrets.clientHsKey,
        clientHandshakeIv: handshakeSecrets.clientHsIv,
        serverHandshakeKey: handshakeSecrets.serverHsKey,
        serverHandshakeIv: handshakeSecrets.serverHsIv,
        clientAppKey: masterSecrets.clientAppKey,
        clientAppIv: masterSecrets.clientAppIv,
        serverAppKey: masterSecrets.serverAppKey,
        serverAppIv: masterSecrets.serverAppIv,
      },
      annotations,
      traces: annotations.map((annotation, index) =>
        traceFor(index, options.clientNodeId, options.serverNodeId, annotation),
      ),
      records,
      secrets: [
        { label: 'earlySecret', value: earlySecret },
        { label: 'handshakeSecret', value: handshakeSecrets.handshakeSecret },
        { label: 'clientAppKey', value: masterSecrets.clientAppKey },
        { label: 'serverAppKey', value: masterSecrets.serverAppKey },
      ],
    };
  }
}
