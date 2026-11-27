import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
  predictionMark,
} from '../components/lessonStyles';
import { LessonChallenges } from '../components/LessonChallenges';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  BACKEND_POD,
  CLIENT_POD,
  EXTERNAL,
  NODE_IP,
  SERVICE,
  healthCheck,
  trace,
  type Change,
  type Hop,
  type NodeId,
  type Policy,
  type Target,
  type Trace,
} from './k8sNetworking';
import { k8sNetworkingChallenges } from './k8sNetworkingChallenges';

type First = 'pod' | 'node' | 'cluster-ip';
const FIRSTS: readonly First[] = ['node', 'cluster-ip', 'pod'];
/** The NodePort outcomes: answered with the client's address, with a node's, or not at all. */
type Outcome = 'kept' | 'snat' | 'dropped';
const OUTCOMES: readonly Outcome[] = ['kept', 'snat', 'dropped'];

const outcomeOf = (result: Trace): Outcome =>
  !result.delivered ? 'dropped' : result.backendSees === EXTERNAL.ip ? 'kept' : 'snat';

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const num: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

const endpoint = (address: string, port: number) => `${address}:${port}`;

/** The cluster: two nodes, the client Pod on one and the backend on the other. */
function ClusterDiagram() {
  const t = useT();
  const nodes: readonly { id: NodeId; x: number; pod: string; podIp: string }[] = [
    { id: 'node-a', x: 4, pod: t('client Pod', 'クライアント Pod'), podIp: CLIENT_POD.ip },
    { id: 'node-b', x: 184, pod: t('backend Pod', 'バックエンド Pod'), podIp: BACKEND_POD.ip },
  ];
  return (
    <svg
      data-testid="k8s-cluster-diagram"
      viewBox="0 0 360 150"
      style={{ width: '100%', maxWidth: 520, display: 'block' }}
      role="img"
      aria-label={t(
        `Two nodes: the client Pod ${CLIENT_POD.ip} on node-a, the backend Pod ${BACKEND_POD.ip} on node-b`,
        `2 台のノード。node-a にクライアント Pod ${CLIENT_POD.ip}、node-b にバックエンド Pod ${BACKEND_POD.ip}`,
      )}
    >
      {nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={4}
            width={172}
            height={110}
            rx={8}
            fill="var(--netlab-bg-surface)"
            stroke="var(--netlab-border-strong)"
          />
          <text x={node.x + 10} y={24} fontSize={13} fill="var(--netlab-text-primary)">
            {`${node.id}  ${NODE_IP[node.id]}`}
          </text>
          <rect
            x={node.x + 10}
            y={40}
            width={152}
            height={56}
            rx={6}
            fill="var(--netlab-bg-primary)"
            stroke="var(--netlab-accent-cyan)"
          />
          <text x={node.x + 20} y={62} fontSize={13} fill="var(--netlab-text-primary)">
            {node.pod}
          </text>
          <text x={node.x + 20} y={82} fontSize={13} fill="var(--netlab-text-primary)">
            {node.podIp}
          </text>
        </g>
      ))}
      <text x={180} y={140} textAnchor="middle" fontSize={13} fill="var(--netlab-text-secondary)">
        {t(
          `Service: ${SERVICE.clusterIp}:${SERVICE.port}, NodePort ${SERVICE.nodePort}`,
          `Service：${SERVICE.clusterIp}:${SERVICE.port}、NodePort ${SERVICE.nodePort}`,
        )}
      </text>
    </svg>
  );
}

/** Every place the request and its reply pass, with the addresses as they leave it. */
function HopTable({ result, testId }: { result: Trace; testId: string }) {
  const t = useT();
  const where = (at: Hop['at']) =>
    ({
      'client-pod': t('client Pod', 'クライアント Pod'),
      'backend-pod': t('backend Pod', 'バックエンド Pod'),
      internet: t('internet client', 'インターネットのクライアント'),
      'node-a': 'node-a',
      'node-b': 'node-b',
    })[at];
  const what: Record<Change, string> = {
    sent: t('sends the request', '要求を送る'),
    dnat: t('kube-proxy rules: DNAT to the Pod', 'kube-proxy のルールで Pod へ DNAT'),
    'dnat-snat': t('DNAT to the Pod, SNAT to this node', 'Pod へ DNAT、送信元をこのノードへ SNAT'),
    forward: t('forwarded, not rewritten', '書き換えずに転送'),
    deliver: t('receives it', '受け取る'),
    drop: t('no backend on this node: dropped', 'このノードにバックエンドがないので破棄'),
    reply: t('replies', '返信する'),
    reverse: t('conntrack undoes the rewrite', 'conntrack が書き換えを戻す'),
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        data-testid={testId}
        data-delivered={String(result.delivered)}
        data-backend-sees={result.backendSees ?? ''}
        data-extra-hops={result.extraHops}
        style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}
      >
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
            <th style={cell}>{t('Where', '場所')}</th>
            <th style={cell}>{t('What happens', '起きること')}</th>
            <th style={cell}>{t('Source', '送信元')}</th>
            <th style={cell}>{t('Destination', '宛先')}</th>
          </tr>
        </thead>
        <tbody>
          {result.hops.map((hop, index) => (
            <tr key={index} data-change={hop.change}>
              <td style={{ ...cell, whiteSpace: 'nowrap' }}>{where(hop.at)}</td>
              <td style={cell}>{what[hop.change]}</td>
              <td style={num}>{endpoint(hop.packet.src, hop.packet.srcPort)}</td>
              <td style={num}>{endpoint(hop.packet.dst, hop.packet.dstPort)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevealButton({
  testId,
  ready,
  onReveal,
}: {
  testId: string;
  ready: boolean;
  onReveal: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={!ready}
      style={{ ...(ready ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
      onClick={onReveal}
    >
      {ready ? t('Send the request', '要求を送る') : t('Predict first', '先に予想を選んでください')}
    </button>
  );
}

/** A prediction about a NodePort request entering node-a under one policy. */
function NodePortQuestion({
  policy,
  prefix,
  guess,
  setGuess,
  shown,
  onReveal,
}: {
  policy: Policy;
  prefix: string;
  guess: Outcome | null;
  setGuess: (outcome: Outcome) => void;
  shown: boolean;
  onReveal: () => void;
}) {
  const t = useT();
  const result = trace('node-port', 'node-a', policy);
  const truth = outcomeOf(result);
  const name: Record<Outcome, string> = {
    kept: t(
      `Answered; the backend sees ${EXTERNAL.ip}`,
      `応答する。バックエンドには ${EXTERNAL.ip} が見える`,
    ),
    snat: t(
      `Answered; the backend sees ${NODE_IP['node-a']}`,
      `応答する。バックエンドには ${NODE_IP['node-a']} が見える`,
    ),
    dropped: t('Not answered', '応答しない'),
  };
  const explain =
    policy === 'Cluster'
      ? t(
          `Answered, and the backend sees ${result.backendSees}. Under Cluster every node accepts the NodePort and may pick a backend on any node. node-a has none, so it DNATs to ${endpoint(BACKEND_POD.ip, BACKEND_POD.port)} and forwards across to node-b: ${result.extraHops} extra hop. It also rewrites the source to its own address, because the reply must come back through node-a for conntrack to undo the DNAT; if the Pod replied straight to ${EXTERNAL.ip}, the client would get an answer from an address it never contacted. The cost: the backend cannot see who the client is.`,
          `応答し、バックエンドには ${result.backendSees} が見えます。Cluster ではどのノードも NodePort を受け付け、どのノードのバックエンドでも選べます。node-a にはバックエンドがないので、${endpoint(BACKEND_POD.ip, BACKEND_POD.port)} へ DNAT して node-b へ転送します。余分なホップが ${result.extraHops} つ増えます。さらに送信元を自分のアドレスに書き換えます。conntrack が DNAT を戻せるよう、返信が node-a を通って戻る必要があるからです。Pod が ${EXTERNAL.ip} へ直接返すと、クライアントは自分が接続していないアドレスから応答を受け取ることになります。代わりに、バックエンドからはクライアントが誰か見えません。`,
        )
      : t(
          `Not answered. Under Local a node sends NodePort traffic only to backends on itself, so the client’s address can be kept (no SNAT, no extra hop). node-a has no backend, so the request is dropped there. That is why Local is used behind a load balancer (a Service of type LoadBalancer): Kubernetes then allocates a health-check port that kube-proxy answers on every node. node-a answers ${healthCheck('node-a', 'Local')} and node-b ${healthCheck('node-b', 'Local')}, so only node-b gets traffic.`,
          `応答しません。Local では、ノードは NodePort の通信を自分の上のバックエンドにしか送りません。そのおかげでクライアントのアドレスを残せます（SNAT も余分なホップもありません）。node-a にはバックエンドがないので、要求はそこで破棄されます。だから Local はロードバランサの後ろ（LoadBalancer 型の Service）で使います。その場合 Kubernetes がヘルスチェック用のポートを割り当て、各ノードの kube-proxy がそれに応答します。node-a は ${healthCheck('node-a', 'Local')}、node-b は ${healthCheck('node-b', 'Local')} を返すので、node-b だけに通信が送られます。`,
        );
  return (
    <div style={LESSON_CARD} data-testid={`${prefix}-card`}>
      <div style={LESSON_LABEL}>{t(`NodePort with ${policy}`, `NodePort と ${policy}`)}</div>
      <p style={{ margin: '0 0 6px', lineHeight: 1.7 }}>
        {t(
          `The Service is also of type NodePort, so every node listens on port ${SERVICE.nodePort}. Its policy is:`,
          `この Service は NodePort 型でもあり、どのノードもポート ${SERVICE.nodePort} で待ち受けます。ポリシーは次のとおりです。`,
        )}
      </p>
      <code
        style={{ display: 'block', margin: '0 0 6px' }}
      >{`externalTrafficPolicy: ${policy}`}</code>
      <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
        {t(
          `A client on the internet, ${EXTERNAL.ip}, connects to ${endpoint(NODE_IP['node-a'], SERVICE.nodePort)}: node-a, which runs no backend Pod. The only backend is on node-b. kube-proxy runs in iptables mode. What happens?`,
          `インターネットのクライアント ${EXTERNAL.ip} が ${endpoint(NODE_IP['node-a'], SERVICE.nodePort)} に接続します。node-a にはバックエンド Pod がなく、唯一のバックエンドは node-b にあります。kube-proxy は iptables モードです。どうなる？`,
        )}
      </p>
      <div
        role="radiogroup"
        aria-label={t('Your prediction', '予想')}
        style={{ display: 'grid', gap: 6 }}
      >
        {OUTCOMES.map((answer) => (
          <button
            key={answer}
            type="button"
            role="radio"
            aria-checked={guess === answer}
            data-testid={`${prefix}-guess-${answer}`}
            disabled={shown}
            onClick={() => setGuess(answer)}
            style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
          >
            {predictionMark(answer, guess, truth, shown)}
            {name[answer]}
          </button>
        ))}
      </div>
      {shown ? (
        <>
          <p
            data-testid={`${prefix}-reveal`}
            data-right={String(guess === truth)}
            data-delivered={String(result.delivered)}
            data-backend-sees={result.backendSees ?? ''}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {explain}
          </p>
          <HopTable result={result} testId={`${prefix}-hops`} />
        </>
      ) : (
        <RevealButton
          testId={`${prefix}-reveal-button`}
          ready={guess !== null}
          onReveal={onReveal}
        />
      )}
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function K8sNetworkingLesson() {
  const t = useT();
  const [first, setFirst] = useState<First | null>(null);
  const [firstShown, setFirstShown] = useState(false);
  const [cluster, setCluster] = useState<Outcome | null>(null);
  const [clusterShown, setClusterShown] = useState(false);
  const [local, setLocal] = useState<Outcome | null>(null);
  const [localShown, setLocalShown] = useState(false);
  const [target, setTarget] = useState<Target>('node-port');
  const [entry, setEntry] = useState<NodeId>('node-b');
  const [policy, setPolicy] = useState<Policy>('Local');

  const viaService = trace('cluster-ip');
  const firstAddress: Record<First, string> = {
    pod: CLIENT_POD.ip,
    node: NODE_IP[CLIENT_POD.node],
    'cluster-ip': SERVICE.clusterIp,
  };
  const firstTruth = FIRSTS.find((answer) => firstAddress[answer] === viaService.backendSees);
  const firstName: Record<First, string> = {
    pod: t(`${CLIENT_POD.ip} (the client Pod)`, `${CLIENT_POD.ip}（クライアント Pod）`),
    node: t(`${NODE_IP['node-a']} (node-a)`, `${NODE_IP['node-a']}（node-a）`),
    'cluster-ip': t(`${SERVICE.clusterIp} (the ClusterIP)`, `${SERVICE.clusterIp}（ClusterIP）`),
  };
  const explored = trace(target, entry, policy);
  const targetName: Record<Target, string> = {
    pod: t('Pod IP, from the client Pod', 'Pod の IP へ（クライアント Pod から）'),
    'cluster-ip': t('ClusterIP, from the client Pod', 'ClusterIP へ（クライアント Pod から）'),
    'node-port': t('NodePort, from the internet', 'NodePort へ（インターネットから）'),
  };

  const tabs = <T extends string>(
    label: string,
    options: readonly T[],
    value: T,
    set: (v: T) => void,
    name: (v: T) => string,
    testPrefix: string,
  ) => (
    <div
      role="tablist"
      aria-label={label}
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          data-testid={`${testPrefix}-${option}`}
          onClick={() => set(option)}
          style={lessonChoice(value === option)}
        >
          {value === option ? '✓ ' : ''}
          {name(option)}
        </button>
      ))}
    </div>
  );

  return (
    <div
      style={{
        maxWidth: 820,
        margin: '0 auto',
        padding: 16,
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'minmax(0, 1fr)',
        alignContent: 'start',
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('The cluster', 'クラスタ')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `Kubernetes gives every Pod its own IP address, and its networking model requires that any Pod can reach any other Pod at that address, on any node, without NAT. How the packets travel between nodes is left to the CNI plugin (routes, an overlay, or cloud routing). Pods come and go, so clients use a Service instead: a stable virtual address, the ClusterIP, that no Pod holds (in iptables mode no interface holds it at all). Here a Service named web has ClusterIP ${SERVICE.clusterIp} port ${SERVICE.port}, sending to port ${BACKEND_POD.port} of its one backend Pod.`,
            `Kubernetes はすべての Pod に専用の IP アドレスを与えます。ネットワークモデルは、どの Pod もどのノードのほかの Pod にもそのアドレスで、NAT なしで届くことを求めます。ノード間でパケットをどう運ぶか（経路、オーバーレイ、クラウドのルーティング）は CNI プラグインに任されています。Pod は作られては消えるので、クライアントは代わりに Service を使います。どの Pod も持たない変わらない仮想アドレス ClusterIP です（iptables モードではどのインターフェースも持ちません）。ここでは web という Service が ClusterIP ${SERVICE.clusterIp} のポート ${SERVICE.port} を持ち、唯一のバックエンド Pod のポート ${BACKEND_POD.port} へ送ります。`,
          )}
        </p>
        <ClusterDiagram />
      </div>

      <div style={LESSON_CARD} data-testid="k8s-predict">
        <div style={LESSON_LABEL}>
          {t('Predict first: through the ClusterIP', 'まず予想：ClusterIP 経由')}
        </div>
        <p style={{ margin: '0 0 6px', lineHeight: 1.7 }}>
          {t(
            `The client Pod on node-a runs this. kube-proxy runs in iptables mode with its default settings.`,
            `node-a のクライアント Pod が次を実行します。kube-proxy は iptables モードで、設定は既定のままです。`,
          )}
        </p>
        <code
          style={{ display: 'block', margin: '0 0 6px' }}
        >{`curl http://${SERVICE.clusterIp}/`}</code>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'What source address does the backend Pod on node-b see?',
            'node-b のバックエンド Pod には、どの送信元アドレスが見える？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {FIRSTS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={first === answer}
              data-testid={`k8s-guess-${answer}`}
              disabled={firstShown}
              onClick={() => setFirst(answer)}
              style={{ ...lessonChoice(first === answer), textAlign: 'left' }}
            >
              {predictionMark(answer, first, firstTruth, firstShown)}
              {firstName[answer]}
            </button>
          ))}
        </div>
        {firstShown ? (
          <>
            <p
              data-testid="k8s-reveal"
              data-right={String(first === firstTruth)}
              data-backend-sees={viaService.backendSees ?? ''}
              data-reply-from={viaService.reply?.src ?? ''}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.7 }}
            >
              <strong>
                {first === firstTruth
                  ? t('As you predicted. ', '予想どおりです。')
                  : t('Not what you predicted. ', '予想とちがいました。')}
              </strong>
              {t(
                `${viaService.backendSees}, the client Pod itself. Nothing answers at ${SERVICE.clusterIp}: kube-proxy has written rules into node-a’s kernel that rewrite the destination (DNAT) to a chosen backend, ${endpoint(BACKEND_POD.ip, BACKEND_POD.port)}, as the packet leaves the Pod. The source is left alone, because Pod-to-Pod traffic needs no NAT. On the way back conntrack on node-a undoes the DNAT, so the client sees the reply come from ${viaService.reply ? endpoint(viaService.reply.src, viaService.reply.srcPort) : ''}, the address it asked.`,
                `${viaService.backendSees}、クライアント Pod 自身です。${SERVICE.clusterIp} で応答するものは何もありません。kube-proxy が node-a のカーネルにルールを書き込んでおり、パケットが Pod を出るときに宛先を選んだバックエンド ${endpoint(BACKEND_POD.ip, BACKEND_POD.port)} へ書き換えます（DNAT）。Pod 同士の通信に NAT は要らないので、送信元はそのままです。帰りは node-a の conntrack が DNAT を戻すので、クライアントには自分が尋ねたアドレス ${viaService.reply ? endpoint(viaService.reply.src, viaService.reply.srcPort) : ''} から返事が来たように見えます。`,
              )}
            </p>
            <HopTable result={viaService} testId="k8s-hops" />
          </>
        ) : (
          <RevealButton
            testId="k8s-reveal-button"
            ready={first !== null}
            onReveal={() => setFirstShown(true)}
          />
        )}
      </div>

      {firstShown ? (
        <NodePortQuestion
          policy="Cluster"
          prefix="k8s-cluster"
          guess={cluster}
          setGuess={setCluster}
          shown={clusterShown}
          onReveal={() => setClusterShown(true)}
        />
      ) : null}

      {clusterShown ? (
        <NodePortQuestion
          policy="Local"
          prefix="k8s-local"
          guess={local}
          setGuess={setLocal}
          shown={localShown}
          onReveal={() => setLocalShown(true)}
        />
      ) : null}

      {localShown ? (
        <div style={LESSON_CARD} data-testid="k8s-explore">
          <div style={LESSON_LABEL}>{t('Try each path', 'それぞれの経路を試す')}</div>
          {tabs(
            t('Request', '要求'),
            ['pod', 'cluster-ip', 'node-port'] as const,
            target,
            setTarget,
            (v) => targetName[v],
            'k8s-target',
          )}
          {target === 'node-port' ? (
            <>
              {tabs(
                t('Node the request enters', '要求が入るノード'),
                ['node-a', 'node-b'] as const,
                entry,
                setEntry,
                (v) => `${v} ${NODE_IP[v]}`,
                'k8s-entry',
              )}
              {tabs(
                t('externalTrafficPolicy', 'externalTrafficPolicy'),
                ['Cluster', 'Local'] as const,
                policy,
                setPolicy,
                (v) => v,
                'k8s-policy',
              )}
            </>
          ) : null}
          <HopTable result={explored} testId="k8s-trace" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <tbody>
                <tr>
                  <td style={cell}>{t('Backend sees the source', 'バックエンドに見える送信元')}</td>
                  <td style={num}>{explored.backendSees ?? t('(not reached)', '（届かない）')}</td>
                </tr>
                <tr>
                  <td style={cell}>{t('Extra node-to-node hops', '余分なノード間ホップ')}</td>
                  <td style={num}>{explored.extraHops}</td>
                </tr>
                {target === 'node-port' ? (
                  <tr data-testid="k8s-health" data-status={healthCheck(entry, policy) ?? 'none'}>
                    <td style={cell}>
                      {t(
                        `Health check on ${entry} (type LoadBalancer)`,
                        `${entry} のヘルスチェック（LoadBalancer 型の場合）`,
                      )}
                    </td>
                    <td style={num}>
                      {healthCheck(entry, policy) ??
                        t(
                          'none: no health-check port under Cluster',
                          'なし（Cluster では割り当てられない）',
                        )}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: two nodes and one backend; source ports are kept through SNAT (a real masquerade may change them); the trip between nodes is one hop, whatever the CNI plugin does on the way. The rewrites are those of kube-proxy in iptables or IPVS mode, which is an implementation, not part of the model: kube-proxy can be set to masquerade Pod-to-ClusterIP traffic too, and CNI plugins that replace kube-proxy (for example with eBPF) may keep the client address under Cluster or let the backend answer directly. The health-check port is allocated by Kubernetes for a Local Service of type LoadBalancer; a NodePort-only Service has no load balancer to read it. SNAT is shown as the node’s address; strictly it is the address of the interface the packet leaves by, which with some CNI plugins is a bridge or tunnel address.',
              '簡略化しています。ノードは 2 台、バックエンドは 1 つです。SNAT でも送信元ポートはそのまま（実際のマスカレードでは変わることがあります）とし、ノード間は CNI プラグインが途中で何をしても 1 ホップとしました。書き換えは iptables または IPVS モードの kube-proxy のもので、ネットワークモデルの一部ではなく実装です。kube-proxy は Pod から ClusterIP への通信もマスカレードするよう設定でき、kube-proxy を置き換える CNI プラグイン（eBPF など）は Cluster でもクライアントのアドレスを残したり、バックエンドから直接返したりできます。ヘルスチェック用のポートは、Local の LoadBalancer 型 Service に Kubernetes が割り当てるものです。NodePort だけの Service には、それを読むロードバランサがありません。SNAT 後の送信元はノードのアドレスとしています。厳密には出ていくインターフェースのアドレスで、CNI プラグインによってはブリッジやトンネルのアドレスになります。',
            )}
          </p>
        </div>
      ) : null}

      {localShown ? (
        <LessonChallenges
          lessonId="k8s-networking"
          challenges={k8sNetworkingChallenges({ target, entry, policy })}
        />
      ) : null}
    </div>
  );
}

export default function K8sNetworkingDemo() {
  return (
    <DemoShell
      title="Kubernetes networking"
      desc="Pod IPs, a Service’s ClusterIP and a NodePort: follow the addresses as kube-proxy rewrites them"
    >
      <K8sNetworkingLesson />
    </DemoShell>
  );
}
