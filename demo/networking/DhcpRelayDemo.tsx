import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  POOLS,
  RESERVATIONS,
  SCENARIOS,
  relay,
  scenario,
  type Leg,
  type RelayResult,
  type ScenarioId,
} from './dhcpRelay';

type Answer = 'first-pool' | 'giaddr' | 'mac' | 'none';
/** Display order: deliberate, so the right answers do not sit in one position across lessons. */
const ANSWERS: readonly Answer[] = ['giaddr', 'mac', 'first-pool', 'none'];

const PORTS = ['Gi1/0/5', 'Gi1/0/7'] as const;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Which answer a result matches. */
function answerOf(result: RelayResult): Answer {
  if (result.offered === null) return 'none';
  if (result.selectedBy === 'giaddr' && result.offered !== POOLS[0]!.first) return 'giaddr';
  return result.offered === POOLS[0]!.first ? 'first-pool' : 'mac';
}

/** The per-hop trace of one relay result. */
function HopTable({ result, testId }: { result: RelayResult; testId: string }) {
  const t = useT();
  const legName = (leg: Leg) =>
    ({
      'client-to-relay': t('Client → router', 'クライアント → ルータ'),
      'relay-to-server': t('Router (relay) → server', 'ルータ（リレー）→ サーバー'),
      'server-to-relay': t('Server → router (relay)', 'サーバー → ルータ（リレー）'),
      'relay-to-client': t('Router → client', 'ルータ → クライアント'),
    })[leg];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} data-testid={testId}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
            <th style={cell}>{t('Hop', '区間')}</th>
            <th style={cell}>{t('Message', 'メッセージ')}</th>
            <th style={cell}>{t('Source', '送信元')}</th>
            <th style={cell}>{t('Destination', '宛先')}</th>
            <th style={cell}>giaddr</th>
            <th style={cell}>hops</th>
            <th style={cell}>yiaddr</th>
          </tr>
        </thead>
        <tbody>
          {result.packets.map((packet) => (
            <tr
              key={packet.leg}
              data-testid={`${testId}-${packet.leg}`}
              data-src={packet.src}
              data-dst={packet.dst}
              data-giaddr={packet.giaddr}
              data-hops={packet.hops}
            >
              <td style={cell}>{legName(packet.leg)}</td>
              <td style={mono}>{packet.message}</td>
              <td style={mono}>{`${packet.src}:${packet.srcPort}`}</td>
              <td style={mono}>{`${packet.dst}:${packet.dstPort}`}</td>
              <td style={mono}>{packet.giaddr}</td>
              <td style={mono}>{packet.hops}</td>
              <td style={mono}>{packet.yiaddr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function DhcpRelayLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [shown, setShown] = useState<ScenarioId>('working');
  const [port, setPort] = useState<(typeof PORTS)[number]>(PORTS[0]);
  const working = scenario('working');
  const asked = relay(working.network, working.clientVlan);
  const truth = answerOf(asked);
  const giaddr = asked.packets[1]!.giaddr;
  const upstream = working.network.upstream;
  const picked = scenario(shown);
  const shownResult = relay(picked.network, picked.clientVlan);
  const portResult = relay(working.network, working.clientVlan, { circuitId: port });

  const answerName = (answer: Answer) =>
    ({
      'first-pool': t(
        'An address from the first pool in its list, which it uses for any relayed request',
        'リレー経由の要求に使う、設定の先頭にあるプールのアドレス',
      ),
      giaddr: t(
        'An address from the pool that matches what the router wrote into the request',
        'ルータがリクエストに書き込んだ情報に合うプールのアドレス',
      ),
      mac: t(
        'An address from the pool it picks by looking up the client’s MAC address',
        'クライアントの MAC アドレスを調べて選んだプールのアドレス',
      ),
      none: t(
        `Nothing: it matches the packet’s source, ${upstream}, and has no pool for that subnet`,
        `何も返さない。送信元 ${upstream} のサブネットで探すが、合うプールがない`,
      ),
    })[answer];
  const scenarioName = (id: ScenarioId) =>
    ({
      working: t('Relay on VLAN 20', 'VLAN 20 にリレー'),
      'no-relay': t('No relay', 'リレーなし'),
      'vlan10-only': t('Relay only on VLAN 10', 'VLAN 10 だけにリレー'),
      'no-pool': t('Client in VLAN 30 (no pool)', 'VLAN 30 のクライアント（プールなし）'),
    })[id];
  const outcomeText = (result: RelayResult, vlan: number) => {
    if (result.outcome === 'offered')
      return t(
        `Offered ${result.offered} from the pool for ${result.pool}/24.`,
        `${result.pool}/24 のプールから ${result.offered} が提示されます。`,
      );
    if (result.outcome === 'no-helper')
      return t(
        `No OFFER. Interface Vlan${vlan} has no helper address, so the broadcast DISCOVER ends at the router: routers do not forward broadcasts.`,
        `OFFER は来ません。インターフェース Vlan${vlan} に helper address がないので、ブロードキャストの DISCOVER はルータで止まります。ルータはブロードキャストを転送しません。`,
      );
    return t(
      `No OFFER. The DISCOVER reaches the server with giaddr ${result.packets[1]!.giaddr}, but the server has no pool for that subnet, so it does not answer. The client keeps retrying and may fall back to a 169.254.x.x address.`,
      `OFFER は来ません。DISCOVER は giaddr ${result.packets[1]!.giaddr} でサーバーに届きますが、そのサブネットのプールがないのでサーバーは答えません。クライアントは送り直し続け、169.254.x.x のアドレスを自分で付けることもあります。`,
    );
  };

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
        <div style={LESSON_LABEL}>{t('One server, many VLANs', '1 台のサーバーと複数の VLAN')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            `The DHCP server ${working.network.server} sits in the server VLAN, behind router R1. It has two address pools: ${POOLS.map((pool) => `${pool.subnet}/24`).join(' and ')}, for VLAN 10 and VLAN 20. A PC in VLAN 20 boots with no address and broadcasts a DHCP DISCOVER to 255.255.255.255. A router does not forward broadcasts, so R1’s VLAN 20 interface is set up as a DHCP relay:`,
            `DHCP サーバー ${working.network.server} はサーバー用 VLAN にあり、ルータ R1 の向こう側です。アドレスのプールは ${POOLS.map((pool) => `${pool.subnet}/24`).join(' と ')} の 2 つで、VLAN 10 用と VLAN 20 用です。VLAN 20 の PC はアドレスのないまま起動し、DHCP DISCOVER を 255.255.255.255 へブロードキャストします。ルータはブロードキャストを転送しないので、R1 の VLAN 20 のインターフェースを DHCP リレーとして設定しています。`,
          )}
        </p>
        <pre
          style={{
            margin: '8px 0 0',
            padding: 8,
            overflowX: 'auto',
            fontSize: 13,
            border: '1px solid var(--netlab-border)',
            borderRadius: 6,
          }}
        >
          {`interface Vlan20\n ip address ${giaddr} 255.255.255.0\n ip helper-address ${working.network.server}`}
        </pre>
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
          {t(
            `R1 now sends the DISCOVER on to the server as an ordinary unicast, from its address ${upstream} on the server VLAN.`,
            `R1 は DISCOVER を、サーバー側の VLAN にある自分のアドレス ${upstream} から、ふつうのユニキャストとしてサーバーへ送ります。`,
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="relay-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'The PC has no address yet, so nothing in its own packet says which subnet it is on. What does the server offer?',
            'PC にはまだアドレスがないので、PC 自身のパケットには自分がどのサブネットにいるかが書かれていません。サーバーは何を提示する？',
          )}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Your prediction', '予想')}
          style={{ display: 'grid', gap: 6 }}
        >
          {ANSWERS.map((answer) => (
            <button
              key={answer}
              type="button"
              role="radio"
              aria-checked={guess === answer}
              data-testid={`relay-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left' }}
            >
              {guess === answer ? '✓ ' : ''}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="relay-reveal"
            data-right={String(guess === truth)}
            data-offered={asked.offered ?? ''}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `It offers ${asked.offered}. When R1 relays the DISCOVER it writes the address of the interface the broadcast arrived on, ${giaddr}, into the packet’s giaddr field (“gateway IP address”). The server picks the pool whose subnet contains giaddr (RFC 2131), here ${asked.pool}/24. The packet’s source address ${upstream} is not used for this, and neither is the MAC address. The OFFER then goes back to ${giaddr}, not to the PC.`,
              `${asked.offered} を提示します。R1 は DISCOVER を中継するとき、ブロードキャストを受けたインターフェースのアドレス ${giaddr} を、パケットの giaddr フィールド（gateway IP address）に書き込みます。サーバーは giaddr を含むサブネットのプール、ここでは ${asked.pool}/24 を選びます（RFC 2131）。パケットの送信元 ${upstream} や MAC アドレスは使いません。OFFER は PC ではなく ${giaddr} へ返ります。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="relay-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Follow the packets', 'パケットを追う')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="relay-trace">
          <div style={LESSON_LABEL}>{t('Hop by hop', '区間ごとに')}</div>
          <div
            role="tablist"
            aria-label={t('Configuration', '設定')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}
          >
            {SCENARIOS.map(({ id }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={shown === id}
                data-testid={`relay-scenario-${id}`}
                onClick={() => setShown(id)}
                style={{ ...lessonChoice(shown === id), minHeight: 44 }}
              >
                {shown === id ? '✓ ' : ''}
                {scenarioName(id)}
              </button>
            ))}
          </div>
          <HopTable result={shownResult} testId="relay-hops" />
          <p
            data-testid="relay-outcome"
            data-outcome={shownResult.outcome}
            data-offered={shownResult.offered ?? ''}
            data-packets={shownResult.packets.length}
            style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {outcomeText(shownResult, picked.clientVlan)}
          </p>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'The relay adds 1 to hops each time it forwards a request, so a server or relay can drop a request that has crossed too many relays; the server’s reply carries hops 0. The server and relay talk on UDP port 67 at both ends; only the last hop goes to the client’s port 68. Here the PC did not set the BROADCAST flag, so R1 sends the OFFER straight to the offered address and the PC’s MAC address; with the flag set it would broadcast it on VLAN 20.',
              'リレーは要求を転送するたびに hops を 1 増やします。そのため、多くのリレーを渡ってきた要求をサーバーやリレーが捨てられます。サーバーの応答の hops は 0 です。サーバーとリレーの間は両端とも UDP 67 番ポートで、クライアントの 68 番ポートへ送るのは最後の区間だけです。この PC は BROADCAST フラグを立てていないので、R1 は OFFER を、提示したアドレスと PC の MAC アドレス宛てに直接送ります。フラグが立っていれば VLAN 20 にブロードキャストします。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="relay-option82">
          <div style={LESSON_LABEL}>
            {t('Option 82: choosing by switch port', 'オプション 82：スイッチのポートで選ぶ')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `giaddr tells the server the subnet, not which device. A relay can also add option 82 (relay agent information, RFC 3046); its circuit ID names the port the request came in on. Here the server keeps ${Object.entries(
                RESERVATIONS,
              )
                .map(([id, ip]) => `${ip} for port ${id}`)
                .join(', ')}. Which port is the PC on?`,
              `giaddr でわかるのはサブネットで、どの機器かまではわかりません。リレーはオプション 82（relay agent information、RFC 3046）を付け加えることもでき、その circuit ID は要求が入ってきたポートを表します。ここではサーバーが ${Object.entries(
                RESERVATIONS,
              )
                .map(([id, ip]) => `ポート ${id} に ${ip}`)
                .join('、')} を確保しています。PC はどのポートにつながっている？`,
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Switch port', 'スイッチのポート')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {PORTS.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={port === id}
                data-testid={`relay-port-${id.replace(/\//g, '-')}`}
                onClick={() => setPort(id)}
                style={{ ...lessonChoice(port === id), minHeight: 44 }}
              >
                {port === id ? '✓ ' : ''}
                {id}
              </button>
            ))}
          </div>
          <p
            data-testid="relay-port-result"
            data-offered={portResult.offered ?? ''}
            data-selected-by={portResult.selectedBy ?? ''}
            style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {portResult.selectedBy === 'circuit-id'
              ? t(
                  `Offered ${portResult.offered}: the reservation for circuit ID ${port}.`,
                  `${portResult.offered} を提示します。circuit ID ${port} 用に確保したアドレスです。`,
                )
              : t(
                  `Offered ${portResult.offered}: no reservation for ${port}, so the pool for giaddr decides.`,
                  `${portResult.offered} を提示します。${port} 用の確保はないので、giaddr のプールで決まります。`,
                )}
          </p>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {portResult.packets.map((packet) => (
                  <tr key={packet.leg}>
                    <td style={mono}>{`${packet.message} ${packet.src} → ${packet.dst}`}</td>
                    <td style={mono}>
                      {packet.circuitId === null
                        ? t('no option 82', 'オプション 82 なし')
                        : `circuit ID ${packet.circuitId}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'The server echoes option 82 back, and the relay removes it before the OFFER reaches the PC. In many networks the access switch adds option 82 instead of the router, as part of DHCP snooping.',
              'サーバーはオプション 82 をそのまま返し、リレーは OFFER を PC へ渡す前にそれを取り除きます。多くのネットワークでは、ルータではなくアクセススイッチが DHCP スヌーピングの一部としてオプション 82 を付けます。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            'Simplified: only DISCOVER and OFFER are shown (REQUEST and ACK cross the relay the same way); the server offers the first address of a pool; all subnets are /24. Some routers send the relayed request from the giaddr address rather than from their interface towards the server.',
            '簡略化しています。DISCOVER と OFFER だけを示しています（REQUEST と ACK も同じようにリレーを通ります）。サーバーはプールの先頭のアドレスを提示し、サブネットはすべて /24 としました。中継した要求を、サーバー側のインターフェースではなく giaddr のアドレスから送るルータもあります。',
          )}
        </p>
      ) : null}
    </div>
  );
}

export default function DhcpRelayDemo() {
  return (
    <DemoShell
      title="DHCP relay"
      desc="One DHCP server, many VLANs: what a router does with a DHCP broadcast, and what the server reads to choose an address"
    >
      <DhcpRelayLesson />
    </DemoShell>
  );
}
