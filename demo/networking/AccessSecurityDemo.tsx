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
  DEVICES,
  EAP_TRIES,
  EAP_TX_PERIOD_S,
  FRAME_KINDS,
  GUEST_VLAN,
  ROGUE_PORT,
  SNOOP_FRAMES,
  UPLINK,
  VIOLATION_MODES,
  authenticate,
  inspect,
  portForwards,
  portSecurity,
  unauthorisedPasses,
  type DeviceId,
  type FrameKind,
  type SnoopFrame,
  type SnoopReason,
  type ViolationMode,
} from './accessSecurity';

type Answer = 'nothing' | 'eapol-only' | 'eapol-dhcp' | 'everything';
/** Display order: deliberate, so the right answers do not sit in one position across lessons. */
const ANSWERS: readonly Answer[] = ['everything', 'nothing', 'eapol-dhcp', 'eapol-only'];

const HUB_MACS = ['aa:bb:cc:00:00:01', 'aa:bb:cc:00:00:02', 'aa:bb:cc:00:00:03'] as const;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Which answer the set of frames an unauthorised port forwards matches. */
function answerOf(passes: readonly FrameKind[]): Answer {
  if (passes.length === 0) return 'nothing';
  if (passes.length === FRAME_KINDS.length) return 'everything';
  return passes.includes('dhcp') ? 'eapol-dhcp' : 'eapol-only';
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function AccessSecurityLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [guestOn, setGuestOn] = useState(false);
  const [mode, setMode] = useState<ViolationMode>('shutdown');
  const [maxMacs, setMaxMacs] = useState(1);
  const [trustRogue, setTrustRogue] = useState(false);
  const passes = unauthorisedPasses();
  const truth = answerOf(passes);
  const blocked = FRAME_KINDS.filter((kind) => !passes.includes(kind));
  const security = portSecurity(maxMacs, mode, HUB_MACS);
  const trusted = trustRogue ? [UPLINK, ROGUE_PORT] : [UPLINK];
  const snoop = inspect(SNOOP_FRAMES, trusted);

  const answerName = (answer: Answer) =>
    ({
      nothing: t('Nothing at all', '何も通さない'),
      'eapol-only': t('Only its 802.1X (EAPOL) frames', '802.1X（EAPOL）のフレームだけ'),
      'eapol-dhcp': t(
        '802.1X and DHCP, so it can get an address first',
        '802.1X と、先にアドレスをもらうための DHCP',
      ),
      everything: t(
        'Everything: 802.1X only records who is connected',
        'すべて通す（802.1X はだれがつないだかを記録するだけ）',
      ),
    })[answer];
  const frameName = (kind: FrameKind) =>
    ({
      eapol: t('EAPOL (802.1X)', 'EAPOL（802.1X）'),
      dhcp: 'DHCP DISCOVER',
      arp: t('ARP request', 'ARP 要求'),
      dns: t('DNS query', 'DNS の問い合わせ'),
      web: 'HTTPS',
    })[kind];
  const deviceName = (id: DeviceId) =>
    ({
      employee: t('Employee laptop (802.1X)', '社員のノート PC（802.1X）'),
      contractor: t('Contractor laptop (802.1X)', '協力会社のノート PC（802.1X）'),
      printer: t(
        'Printer, no supplicant, MAC registered',
        'プリンター（サプリカントなし、MAC 登録済み）',
      ),
      camera: t('Camera, no supplicant, MAC unknown', 'カメラ（サプリカントなし、MAC 未登録）'),
    })[id];
  const modeName = (m: ViolationMode) =>
    ({ protect: 'protect', restrict: 'restrict', shutdown: 'shutdown' })[m];
  const portName = (port: string) =>
    ({
      [UPLINK]: t('uplink: DHCP server, gateway', 'アップリンク：DHCP サーバー、ゲートウェイ'),
      'Gi0/2': t('PC', 'PC'),
      'Gi0/3': t('host with a static address', '固定アドレスのホスト'),
      [ROGUE_PORT]: t('home router plugged in by mistake', 'まちがえてつながれた家庭用ルータ'),
    })[port] ?? port;
  const frameText = (frame: SnoopFrame) =>
    frame.kind === 'dhcp'
      ? `DHCP ${frame.message}${frame.ip ? ` ${frame.ip}` : ''}`
      : t(
          `ARP: ${frame.senderIp} is at ${frame.senderMac}`,
          `ARP：${frame.senderIp} は ${frame.senderMac}`,
        );
  const reasonText = (reason: SnoopReason) =>
    ({
      'client-message': t('a client message: allowed', 'クライアントのメッセージなので通す'),
      'server-on-untrusted': t(
        'a server message on an untrusted port',
        '信頼しないポートから来たサーバーのメッセージ',
      ),
      'server-on-trusted': t(
        'a server message on a trusted port',
        '信頼するポートからのサーバーのメッセージ',
      ),
      'trusted-arp': t('trusted port: not inspected', '信頼するポートなので検査しない'),
      'binding-match': t('matches a binding', 'バインディングと一致'),
      'no-binding': t(
        'no binding for this IP and MAC here',
        'この IP と MAC のバインディングがない',
      ),
    })[reason];

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
        <div style={LESSON_LABEL}>{t('Who is on this port?', 'このポートにいるのはだれ？')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Anyone can walk up to a wall socket in an office and plug something in. The access switch behind it is the first place the network can decide who gets in, how many devices may share a port, and which DHCP and ARP messages to believe. This lesson looks at four switch features that do that: 802.1X with a RADIUS server, port security, DHCP snooping and dynamic ARP inspection (DAI).',
            'オフィスの壁のポートには、だれでも何かをつなげます。その先のアクセススイッチは、だれを入れるか、1 つのポートに何台まで許すか、どの DHCP と ARP のメッセージを信じるかを決められる最初の場所です。このレッスンでは、それを行う 4 つのスイッチ機能を見ます。RADIUS サーバーと組む 802.1X、ポートセキュリティ、DHCP スヌーピング、ダイナミック ARP インスペクション（DAI）です。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="acc-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'The port has 802.1X turned on. A laptop is plugged in and has not authenticated yet. Which of the laptop’s frames does the switch forward?',
            'ポートでは 802.1X が有効です。ノート PC をつなぎましたが、まだ認証は終わっていません。スイッチはノート PC のどのフレームを転送する？',
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
              data-testid={`acc-guess-${answer}`}
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
            data-testid="acc-reveal"
            data-right={String(guess === truth)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${answerName(truth)}. Until the RADIUS server answers Access-Accept, the port is unauthorised: of the ${FRAME_KINDS.length} kinds of frame below, it forwards ${passes.length} and drops ${blocked.length} (${blocked.map(frameName).join(', ')}). The laptop cannot even get an address before it has proved who it is. EAPOL carries that proof; the switch relays it to RADIUS and opens the port only on the answer.`,
              `${answerName(truth)}です。RADIUS サーバーが Access-Accept を返すまで、ポートは未認証の状態です。下の ${FRAME_KINDS.length} 種類のフレームのうち転送するのは ${passes.length} 種類で、${blocked.length} 種類（${blocked.map(frameName).join('、')}）は捨てます。ノート PC は、だれなのかを証明するまでアドレスももらえません。その証明を運ぶのが EAPOL で、スイッチはそれを RADIUS へ中継し、答えを見てからポートを開きます。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="acc-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('See what the port forwards', 'ポートが通すものを見る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="acc-frames">
          <div style={LESSON_LABEL}>
            {t('1. 802.1X: before and after', '1. 802.1X：認証の前と後')}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Frame from the laptop', 'ノート PC からのフレーム')}</th>
                  <th style={cell}>{t('Unauthorised', '未認証')}</th>
                  <th style={cell}>{t('Authorised', '認証済み')}</th>
                </tr>
              </thead>
              <tbody>
                {FRAME_KINDS.map((kind) => {
                  const before = portForwards('unauthorised', kind) ? 'forward' : 'drop';
                  const after = portForwards('authorised', kind) ? 'forward' : 'drop';
                  const label = (action: string) =>
                    action === 'forward' ? t('forwarded', '転送') : t('dropped', '破棄');
                  return (
                    <tr
                      key={kind}
                      data-testid={`acc-frame-${kind}`}
                      data-unauth={before}
                      data-auth={after}
                    >
                      <td style={cell}>{frameName(kind)}</td>
                      <td style={mono}>{label(before)}</td>
                      <td style={mono}>{label(after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="acc-devices">
          <div style={LESSON_LABEL}>
            {t('Which VLAN does each device land in?', 'どの VLAN に入るか')}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'The RADIUS server can do more than say yes. In its Access-Accept it can name a VLAN with three attributes (RFC 3580): Tunnel-Type = 13 (VLAN), Tunnel-Medium-Type = 6 (802) and Tunnel-Private-Group-ID = the VLAN. The switch puts the port in that VLAN, so the same wall socket gives each person the network their role allows. A device with no 802.1X software never answers EAPOL; after the switch has asked a few times it can try MAC Authentication Bypass (MAB), sending the device’s MAC address to RADIUS as its name.',
              'RADIUS サーバーは「許可」と言うだけではありません。Access-Accept の中で、3 つの属性（RFC 3580）で VLAN を指定できます。Tunnel-Type = 13（VLAN）、Tunnel-Medium-Type = 6（802）、Tunnel-Private-Group-ID = VLAN 番号です。スイッチはポートをその VLAN に入れるので、同じ壁のポートでも人の役割に応じたネットワークにつながります。802.1X のソフトウェアがない機器は EAPOL に答えません。スイッチは何度か問いかけたあと、MAC 認証バイパス（MAB）を試せます。機器の MAC アドレスを名前として RADIUS へ送る方法です。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Guest VLAN', 'ゲスト VLAN')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}
          >
            {[false, true].map((on) => (
              <button
                key={String(on)}
                type="button"
                role="tab"
                aria-selected={guestOn === on}
                data-testid={`acc-guest-${on ? 'on' : 'off'}`}
                onClick={() => setGuestOn(on)}
                style={{ ...lessonChoice(guestOn === on), minHeight: 44 }}
              >
                {guestOn === on ? '✓ ' : ''}
                {on
                  ? t(`Guest VLAN ${GUEST_VLAN}`, `ゲスト VLAN ${GUEST_VLAN}`)
                  : t('No guest VLAN', 'ゲスト VLAN なし')}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Device', '機器')}</th>
                  <th style={cell}>{t('Method', '方式')}</th>
                  <th style={cell}>{t('RADIUS answer', 'RADIUS の答え')}</th>
                  <th style={cell}>Tunnel-Private-Group-ID</th>
                  <th style={cell}>VLAN</th>
                  <th style={cell}>{t('Waits', '待ち時間')}</th>
                </tr>
              </thead>
              <tbody>
                {DEVICES.map((device) => {
                  const result = authenticate(device, guestOn ? GUEST_VLAN : null);
                  return (
                    <tr
                      key={device.id}
                      data-testid={`acc-device-${device.id}`}
                      data-vlan={result.vlan ?? 'none'}
                      data-method={result.method}
                    >
                      <td style={cell}>{deviceName(device.id)}</td>
                      <td style={mono}>{result.method}</td>
                      <td style={mono}>{result.radius}</td>
                      <td style={mono}>{result.attributes?.tunnelPrivateGroupId ?? '—'}</td>
                      <td style={mono}>
                        {result.vlan === null
                          ? t('no access', 'アクセスなし')
                          : result.guest
                            ? t(`${result.vlan} (guest)`, `${result.vlan}（ゲスト）`)
                            : String(result.vlan)}
                      </td>
                      <td style={mono}>{result.waitS > 0 ? `${result.waitS} s` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `The ${EAP_TX_PERIOD_S * EAP_TRIES} s wait is ${EAP_TRIES} EAP requests ${EAP_TX_PERIOD_S} s apart, the defaults of a common switch; many networks shorten it, or try MAB first. A MAC address is easy to copy, so a device let in by MAB belongs in a VLAN that can reach only what it needs — here the printer’s VLAN 40.`,
              `${EAP_TX_PERIOD_S * EAP_TRIES} 秒の待ち時間は、${EAP_TX_PERIOD_S} 秒おきに ${EAP_TRIES} 回 EAP の要求を送るという、よくあるスイッチの初期設定によるものです。多くのネットワークではこれを短くするか、MAB を先に試します。MAC アドレスは簡単にまねできるので、MAB で入れた機器は必要な相手にしか届かない VLAN に入れます。ここではプリンター用の VLAN 40 です。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="acc-port-security">
          <div style={LESSON_LABEL}>{t('2. Port security', '2. ポートセキュリティ')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'Port security limits how many MAC addresses a port may learn. Someone plugs a small unmanaged switch into a wall socket and connects three devices to it, which send their first frames one after another. What happens to the extra devices depends on the violation mode.',
              'ポートセキュリティは、1 つのポートが覚えてよい MAC アドレスの数を制限します。だれかが壁のポートに小さなアンマネージドスイッチをつなぎ、3 台の機器を接続しました。3 台は順に最初のフレームを送ります。上限を超えた機器がどうなるかは、違反時の動作（violation モード）で決まります。',
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Violation mode', '違反時の動作')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {VIOLATION_MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                data-testid={`acc-ps-mode-${m}`}
                onClick={() => setMode(m)}
                style={{ ...lessonChoice(mode === m), minHeight: 44 }}
              >
                {mode === m ? '✓ ' : ''}
                {modeName(m)}
              </button>
            ))}
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            {t('Maximum MAC addresses', 'MAC アドレスの上限')}
            <input
              type="range"
              min={1}
              max={4}
              value={maxMacs}
              data-testid="acc-ps-max"
              onChange={(event) => setMaxMacs(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{maxMacs}</span>
          </label>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {HUB_MACS.map((mac, index) => (
                  <tr
                    key={mac}
                    data-testid={`acc-ps-device-${index + 1}`}
                    data-allowed={String(security.allowed[index])}
                  >
                    <td style={cell}>{t(`Device ${index + 1}`, `機器 ${index + 1}`)}</td>
                    <td style={mono}>{mac}</td>
                    <td style={mono}>
                      {security.allowed[index]
                        ? t('gets through', '通る')
                        : t('blocked', '止められる')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            data-testid="acc-ps-result"
            data-port={security.port}
            data-access={security.withAccess}
            data-dropped={security.dropped}
            data-logged={String(security.logged)}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {security.port === 'err-disabled'
              ? t(
                  `The port is err-disabled: 0 of ${HUB_MACS.length} devices have access, even the first. An administrator must bring it back up (or an automatic recovery timer must expire).`,
                  `ポートは err-disabled になりました。${HUB_MACS.length} 台中 0 台がつながりません。最初の 1 台もです。管理者が戻す（または自動復旧のタイマーが切れる）まで止まったままです。`,
                )
              : t(
                  `The port stays up: ${security.withAccess} of ${HUB_MACS.length} devices have access; ${security.dropped} frames dropped${security.dropped > 0 ? (security.logged ? ', logged and counted as violations' : ' silently, with no log') : ''}.`,
                  `ポートは上がったままです。${HUB_MACS.length} 台中 ${security.withAccess} 台がつながり、${security.dropped} 個のフレームを捨てました${security.dropped > 0 ? (security.logged ? '（ログに残し、違反として数えます）' : '（ログには何も残しません）') : ''}。`,
                )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'protect drops quietly, so nobody learns why a device does not work; restrict drops and tells the network team; shutdown takes the whole port down, which is the default on many switches. Each device here sends just one frame.',
              'protect は黙って捨てるので、機器がつながらない理由がだれにもわかりません。restrict は捨てたうえでネットワーク担当者に知らせます。shutdown はポートごと止めます。多くのスイッチでは shutdown が初期設定です。ここでは各機器が 1 フレームだけ送るものとしています。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="acc-snooping">
          <div style={LESSON_LABEL}>
            {t(
              '3. DHCP snooping and dynamic ARP inspection',
              '3. DHCP スヌーピングとダイナミック ARP インスペクション',
            )}
          </div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `Only the uplink ${UPLINK} leads to the real DHCP server, so only it is marked trusted. DHCP snooping drops server messages (OFFER, ACK) that arrive on any other port, and writes down each lease the real server acknowledges: MAC, IP and port. DAI then drops any ARP from an untrusted port whose sender IP and MAC are not in that binding table, so a device cannot claim another device’s address. Here a home router has been plugged into ${ROGUE_PORT} by mistake and answers DHCP itself.`,
              `本物の DHCP サーバーにつながるのはアップリンクの ${UPLINK} だけなので、信頼するポートはそこだけです。DHCP スヌーピングは、それ以外のポートから来たサーバーのメッセージ（OFFER、ACK）を捨て、本物のサーバーが確定した貸し出しを MAC・IP・ポートの組で記録します。DAI は、信頼しないポートから来た ARP のうち、送信元の IP と MAC がそのバインディングテーブルにないものを捨てます。だから、ほかの機器のアドレスを名乗ることはできません。ここでは ${ROGUE_PORT} に家庭用ルータがまちがえてつながれ、自分で DHCP に答えています。`,
            )}
          </p>
          <div
            role="tablist"
            aria-label={t('Trusted ports', '信頼するポート')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {[false, true].map((on) => (
              <button
                key={String(on)}
                type="button"
                role="tab"
                aria-selected={trustRogue === on}
                data-testid={`acc-trust-${on ? 'both' : 'uplink'}`}
                onClick={() => setTrustRogue(on)}
                style={{ ...lessonChoice(trustRogue === on), minHeight: 44 }}
              >
                {trustRogue === on ? '✓ ' : ''}
                {on
                  ? t(
                      `Trusted: ${UPLINK} and ${ROGUE_PORT} (a mistake)`,
                      `信頼：${UPLINK} と ${ROGUE_PORT}（設定ミス）`,
                    )
                  : t(`Trusted: ${UPLINK} only`, `信頼：${UPLINK} だけ`)}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Port', 'ポート')}</th>
                  <th style={cell}>{t('Frame', 'フレーム')}</th>
                  <th style={cell}>{t('Switch', 'スイッチ')}</th>
                  <th style={cell}>{t('Why', '理由')}</th>
                </tr>
              </thead>
              <tbody>
                {SNOOP_FRAMES.map((frame, index) => {
                  const decision = snoop.decisions[index]!;
                  return (
                    <tr
                      key={index}
                      data-testid={`acc-snoop-${index + 1}`}
                      data-action={decision.action}
                    >
                      <td style={cell}>
                        <span style={{ fontFamily: 'monospace' }}>{frame.port}</span>{' '}
                        <span style={{ color: 'var(--netlab-text-secondary)' }}>
                          {portName(frame.port)}
                        </span>
                      </td>
                      <td style={mono}>{frameText(frame)}</td>
                      <td style={{ ...mono, fontWeight: 700 }}>
                        {decision.action === 'forward' ? t('forward', '転送') : t('drop', '破棄')}
                      </td>
                      <td style={cell}>{reasonText(decision.reason)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ ...LESSON_LABEL, marginTop: 12 }}>
            {t('Binding table', 'バインディングテーブル')}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ borderCollapse: 'collapse' }}
              data-testid="acc-bindings"
              data-count={snoop.bindings.length}
            >
              <tbody>
                {snoop.bindings.map((binding) => (
                  <tr key={binding.mac}>
                    <td style={mono}>{binding.mac}</td>
                    <td style={mono}>{binding.ip}</td>
                    <td style={mono}>{binding.port}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'The host with a static address has no lease, so DAI drops its ARP too: such hosts need a static binding or an ARP ACL. Simplified: real switches also rate-limit DHCP and ARP on untrusted ports, check more fields, and may add option 82.',
              '固定アドレスのホストには貸し出しの記録がないので、DAI はその ARP も捨てます。こうしたホストには静的なバインディングか ARP ACL が必要です。簡略化しています。実際のスイッチは、信頼しないポートの DHCP と ARP の量も制限し、ほかの項目も確かめ、option 82 を付けることもあります。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function AccessSecurityDemo() {
  return (
    <DemoShell
      title="Protecting access ports"
      desc="802.1X and RADIUS, port security, DHCP snooping and dynamic ARP inspection on an access switch"
    >
      <AccessSecurityLesson />
    </DemoShell>
  );
}
