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
  NAT_BEHAVIOUR,
  NAT_TYPES,
  ONE_WAY_MS,
  TYPE_PREFERENCE,
  candidatePriority,
  pathCost,
  show,
  traverseTypes,
  type CandidateType,
  type NatType,
  type Pair,
  type Side,
  type Traversal,
} from './natTraversal';

type Answer = 'direct' | 'one-way' | 'relay' | 'nothing';
const ANSWERS: readonly Answer[] = ['relay', 'direct', 'one-way', 'nothing'];
const ASKED: Readonly<Record<Side, NatType>> = { A: 'symmetric', B: 'port-restricted-cone' };

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** Which answer a run without a relay, and one with, match. */
function answerOf(direct: Traversal, withRelay: Traversal): Answer {
  if (direct.directWorks) return 'direct';
  if (direct.direct.A.arrived || direct.direct.B.arrived) return 'one-way';
  return withRelay.selected ? 'relay' : 'nothing';
}

const pairId = (pair: Pair) => `${pair.local.type}>${pair.remote.type}`;

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function NatTraversalLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [natA, setNatA] = useState<NatType>(ASKED.A);
  const [natB, setNatB] = useState<NatType>(ASKED.B);
  const [bitrate, setBitrate] = useState(2000);

  const asked = traverseTypes(ASKED.A, ASKED.B, false);
  const askedIce = traverseTypes(ASKED.A, ASKED.B);
  const truth = answerOf(asked, askedIce);
  const ice = traverseTypes(natA, natB);
  const cost = ice.selected ? pathCost(ice.selected, bitrate) : null;

  const natName = (type: NatType) =>
    ({
      'full-cone': t('Full cone', 'フルコーン'),
      'restricted-cone': t('Restricted cone', 'アドレス制限コーン'),
      'port-restricted-cone': t('Port-restricted cone', 'ポート制限コーン'),
      symmetric: t('Symmetric', 'シンメトリック'),
    })[type];
  const natTerms = (type: NatType) =>
    `${NAT_BEHAVIOUR[type].mapping} + ${NAT_BEHAVIOUR[type].filtering}`;
  const typeName = (type: CandidateType) =>
    ({
      host: t('host', 'ホスト'),
      prflx: t('peer-reflexive', 'ピア反射'),
      srflx: t('server-reflexive', 'サーバ反射'),
      relay: t('relay', 'リレー'),
    })[type];
  const answerName = (answer: Answer) =>
    ({
      direct: t('They connect directly, both ways', '直接つながる（双方向）'),
      'one-way': t('Packets get through in one direction only', '片方向だけパケットが届く'),
      relay: t('No direct path; they need a TURN relay', '直接はつながらず、TURN のリレーが必要'),
      nothing: t('They cannot talk at all, even with TURN', 'TURN を使ってもつながらない'),
    })[answer];
  const yesNo = (value: boolean) => (value ? '✓' : '✗');

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
        <div style={LESSON_LABEL}>{t('A call between two NATs', '2 つの NAT をまたぐ通話')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Peer A (10.0.0.2) and peer B (192.168.1.2) want a video call with packets going straight between them, not through a server. Each sits behind its own NAT, so neither knows the public address the other must send to. Each first asks a STUN server “what address do you see me as?” (its server-reflexive address), the two swap those answers through the call’s signalling server, and then both send to each other at the same moment, hoping each NAT has opened a hole for the other’s packets.',
            'ピア A（10.0.0.2）とピア B（192.168.1.2）は、サーバを通さずパケットを直接やり取りしてビデオ通話をしたいと考えています。どちらも別々の NAT の内側にいるので、相手が送るべき公開アドレスを知りません。そこでまず STUN サーバに「自分はどのアドレスに見えますか？」と尋ね（サーバ反射アドレス）、その答えを通話のシグナリングサーバ経由で交換し、同時に相手へ送ります。それぞれの NAT が相手のパケット用に穴を開けてくれることを期待して送るのです。',
          )}
        </p>
        <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
          {t(
            'RFC 4787 describes a NAT by two behaviours. Mapping: is the same public port reused for every destination (endpoint-independent, EIM), only for the same destination IP (address-dependent, ADM), or only for the same IP and port (address-and-port-dependent, APDM)? Filtering: may anyone send in to that port (EIF), only IPs the host has sent to (ADF), or only the exact IP and port it sent to (APDF)?',
            'RFC 4787 は NAT を 2 つの振る舞いで表します。マッピング：同じ公開ポートを、どの宛先にも使い回すか（endpoint-independent、EIM）、同じ宛先 IP に限るか（address-dependent、ADM）、同じ IP とポートに限るか（address-and-port-dependent、APDM）。フィルタリング：そのポートへ誰でも送り込めるか（EIF）、ホストが送ったことのある IP だけか（ADF）、送ったことのある IP とポートの組だけか（APDF）。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="nt-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `A’s NAT is ${natName(ASKED.A).toLowerCase()} (${natTerms(ASKED.A)}); B’s is a ${natName(ASKED.B).toLowerCase()} (${natTerms(ASKED.B)}). Both learn their address from STUN, swap them and send at once. What happens?`,
            `A の NAT は${natName(ASKED.A)}（${natTerms(ASKED.A)}）、B の NAT は${natName(ASKED.B)}（${natTerms(ASKED.B)}）です。どちらも STUN で自分のアドレスを知り、交換して同時に送ります。どうなる？`,
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
              data-testid={`nt-guess-${answer}`}
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
            data-testid="nt-reveal"
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
              `${answerName(truth)}. STUN told A it is ${show(asked.reflexive.A)}, but that is the port A’s NAT chose for the STUN server. Sending to B, the symmetric NAT made a new mapping, ${show(asked.usedTowardPeer.A)}. B’s NAT lets in only the exact address B sent to (${show(asked.reflexive.A)}), so A’s packet is dropped. B’s packet goes to ${show(asked.reflexive.A)}, which A’s NAT opened only for the STUN server, so it is dropped too. ICE falls back to B’s TURN relay, ${show(askedIce.selected!.remote.address)}: A sends there like to any server, and the relay forwards to B over B’s own connection to it.`,
              `${answerName(truth)}。STUN は A に「${show(asked.reflexive.A)} に見えます」と答えましたが、これは A の NAT が STUN サーバ向けに選んだポートです。B へ送るとき、シンメトリック NAT は新しいマッピング ${show(asked.usedTowardPeer.A)} を作りました。B の NAT は B が送ったことのある組（${show(asked.reflexive.A)}）からしか入れないので、A のパケットは捨てられます。B のパケットは ${show(asked.reflexive.A)} に届きますが、A の NAT はここを STUN サーバ向けにしか開けていないので、これも捨てられます。ICE は B の TURN リレー ${show(askedIce.selected!.remote.address)} を使います。A はふつうのサーバへ送るのと同じようにそこへ送り、リレーは B が張っている接続を通して B へ転送します。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="nt-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Punch the holes', '穴を開けてみる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nt-trace">
          <div style={LESSON_LABEL}>{t('What each NAT did', 'それぞれの NAT がしたこと')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Peer', 'ピア')}</th>
                  <th style={cell}>{t('STUN saw', 'STUN が見たアドレス')}</th>
                  <th style={cell}>{t('Used toward the peer', '相手へ送ったアドレス')}</th>
                  <th style={cell}>{t('Request got in', '要求が届いた')}</th>
                  <th style={cell}>{t('Answer got back', '応答が戻った')}</th>
                </tr>
              </thead>
              <tbody>
                {(['A', 'B'] as const).map((side) => (
                  <tr
                    key={side}
                    data-testid={`nt-trace-${side}`}
                    data-reflexive={show(asked.reflexive[side])}
                    data-used={show(asked.usedTowardPeer[side])}
                    data-arrived={String(asked.direct[side].arrived)}
                  >
                    <td style={cell}>{`${side} (${natName(ASKED[side])})`}</td>
                    <td style={mono}>{show(asked.reflexive[side])}</td>
                    <td style={mono}>{show(asked.usedTowardPeer[side])}</td>
                    <td style={mono}>{yesNo(asked.direct[side].arrived)}</td>
                    <td style={mono}>{yesNo(asked.direct[side].answered)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nt-grid">
          <div style={LESSON_LABEL}>
            {t('Does hole punching connect them directly?', 'ホールパンチングで直接つながる？')}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('A ↓ / B →', 'A ↓ / B →')}</th>
                  {NAT_TYPES.map((b) => (
                    <th key={b} style={cell}>
                      {natName(b)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NAT_TYPES.map((a) => (
                  <tr key={a}>
                    <th style={{ ...cell, textAlign: 'left' }}>
                      {natName(a)}
                      <span style={{ fontFamily: 'monospace', fontWeight: 400 }}>
                        {` ${natTerms(a)}`}
                      </span>
                    </th>
                    {NAT_TYPES.map((b) => {
                      const works = traverseTypes(a, b, false).directWorks;
                      return (
                        <td
                          key={b}
                          style={mono}
                          data-testid={`nt-grid-${a}-${b}`}
                          data-works={String(works)}
                        >
                          {yesNo(works)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'A symmetric NAT still connects to a full or restricted cone: its packet is let in (that NAT accepts any port from the IP it sent to), and the peer learns the new port from it. Against another NAT that filters by exact port, the new port is never let in.',
              'シンメトリック NAT でも、フルコーンやアドレス制限コーンが相手ならつながります。相手の NAT は送ったことのある IP からならどのポートでも入れるのでパケットが届き、相手はそのパケットから新しいポートを知ります。ポートまで厳密に見る NAT が相手だと、新しいポートは入れてもらえません。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nt-ice">
          <div style={LESSON_LABEL}>{t('ICE picks a pair', 'ICE がペアを選ぶ')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              'ICE (RFC 8445) gathers every candidate address, pairs them, checks each pair with STUN and uses the highest-priority pair that works. Candidate priority = 2²⁴ × type preference + 2⁸ × local preference + (256 − component). Pair priority = 2³² × min(G, D) + 2 × max(G, D) + (G > D ? 1 : 0), G being the controlling agent’s (A’s) candidate.',
              'ICE（RFC 8445）は候補となるアドレスをすべて集めてペアにし、各ペアを STUN で確かめ、つながるペアのうち優先度が最も高いものを使います。候補の優先度 = 2²⁴ × タイプ優先度 + 2⁸ × ローカル優先度 + (256 − コンポーネント)。ペアの優先度 = 2³² × min(G, D) + 2 × max(G, D) + (G > D なら 1)。G は制御側（A）の候補です。',
            )}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Candidate type', '候補のタイプ')}</th>
                  <th style={cell}>{t('Type preference', 'タイプ優先度')}</th>
                  <th style={cell}>{t('Priority (component 1)', '優先度（コンポーネント 1）')}</th>
                </tr>
              </thead>
              <tbody>
                {(['host', 'prflx', 'srflx', 'relay'] as const).map((type) => (
                  <tr key={type}>
                    <td style={cell}>{typeName(type)}</td>
                    <td style={mono}>{TYPE_PREFERENCE[type]}</td>
                    <td
                      style={mono}
                      data-testid={`nt-priority-${type}`}
                      data-priority={candidatePriority(type)}
                    >
                      {candidatePriority(type)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(['A', 'B'] as const).map((side) => (
            <div key={side} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {t(`${side}’s NAT`, `${side} の NAT`)}
              </div>
              <div
                role="tablist"
                aria-label={t(`${side}’s NAT`, `${side} の NAT`)}
                style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
              >
                {NAT_TYPES.map((type) => {
                  const chosen = (side === 'A' ? natA : natB) === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="tab"
                      aria-selected={chosen}
                      data-testid={`nt-nat-${side}-${type}`}
                      onClick={() => (side === 'A' ? setNatA(type) : setNatB(type))}
                      style={{ ...lessonChoice(chosen), minHeight: 44 }}
                    >
                      {chosen ? '✓ ' : ''}
                      {natName(type)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('A’s candidate', 'A の候補')}</th>
                  <th style={cell}>{t('B’s candidate', 'B の候補')}</th>
                  <th style={cell}>{t('Pair priority', 'ペアの優先度')}</th>
                  <th style={cell}>{t('Check', '確認')}</th>
                </tr>
              </thead>
              <tbody>
                {ice.pairs.map((pair) => (
                  <tr
                    key={pairId(pair)}
                    data-testid={`nt-pair-${pairId(pair)}`}
                    data-works={String(pair.works)}
                    data-priority={pair.priority.toString()}
                    style={pair === ice.selected ? { fontWeight: 700 } : undefined}
                  >
                    <td
                      style={mono}
                    >{`${typeName(pair.local.type)} ${show(pair.local.address)}`}</td>
                    <td style={mono}>
                      {`${typeName(pair.remote.type)} ${show(pair.remote.address)}`}
                    </td>
                    <td style={mono}>{pair.priority.toString()}</td>
                    <td style={mono}>{yesNo(pair.works)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            data-testid="nt-selected"
            data-pair={ice.selected ? pairId(ice.selected) : 'none'}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {ice.selected
              ? t(
                  `Selected: A’s ${typeName(ice.selected.local.type)} → B’s ${typeName(ice.selected.remote.type)} ${show(ice.selected.remote.address)}.`,
                  `選ばれたペア：A の${typeName(ice.selected.local.type)} → B の${typeName(ice.selected.remote.type)} ${show(ice.selected.remote.address)}。`,
                )
              : t('No pair works.', 'つながるペアはありません。')}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Host-to-host pairs have the highest priority but fail here: the peers are on different private networks. A’s server-reflexive candidate is not checked on its own: A sends from its host address and the NAT translates it, so ICE prunes it into the host pair. When B’s check reaches A from a port A was never told about, A learns it as a peer-reflexive candidate.',
              'ホスト同士のペアは優先度が最も高いのですが、ここでは失敗します。2 つのピアは別々のプライベートネットワークにいるからです。A のサーバ反射候補は単独では確かめません。A はホストのアドレスから送り、NAT がそれを変換するので、ICE はそのペアをホストのペアにまとめます（pruning）。B の確認が、A の知らないポートから届いたときは、A はそれをピア反射候補として覚えます。',
            )}
          </p>
        </div>
      ) : null}

      {revealed && ice.selected && cost ? (
        <div style={LESSON_CARD} data-testid="nt-cost">
          <div style={LESSON_LABEL}>{t('What a relay costs', 'リレーのコスト')}</div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {t('Video, each way', '映像（片方向）')}
            <input
              type="range"
              min={500}
              max={5000}
              step={500}
              value={bitrate}
              data-testid="nt-bitrate"
              onChange={(event) => setBitrate(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${bitrate} kbit/s`}</span>
          </label>
          <p
            data-testid="nt-cost-result"
            data-rtt={cost.rttMs}
            data-turn={cost.turnKbps}
            style={{ margin: '8px 0 0', fontWeight: 700 }}
          >
            {cost.relayed
              ? t(
                  `Through the relay: ${cost.rttMs} ms round trip, and the TURN server receives and sends ${cost.turnKbps} kbit/s for this one call.`,
                  `リレー経由：往復 ${cost.rttMs} ms。TURN サーバはこの 1 通話のために ${cost.turnKbps} kbit/s を受け取り、同じだけ送り出します。`,
                )
              : t(
                  `Direct: ${cost.rttMs} ms round trip, and the TURN server carries nothing.`,
                  `直接：往復 ${cost.rttMs} ms。TURN サーバは何も運びません。`,
                )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Assumed one-way delays: A–B ${ONE_WAY_MS.direct} ms, A–TURN ${ONE_WAY_MS.aToTurn} ms, TURN–B ${ONE_WAY_MS.turnToB} ms. A relay always works, because each peer only ever talks out to a server, but its operator pays for every relayed bit, which is why ICE tries every direct pair first.`,
              `片方向の遅延は A–B ${ONE_WAY_MS.direct} ms、A–TURN ${ONE_WAY_MS.aToTurn} ms、TURN–B ${ONE_WAY_MS.turnToB} ms と仮定しています。各ピアはサーバへ向けて外に送るだけなので、リレーは必ずつながります。ただし運用者は中継するすべてのビットを負担します。だから ICE は先に直接のペアをすべて試します。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
          {t(
            'Simplified: one host and one public IP per NAT, ports handed out in order, mappings that never time out, every check retransmitted until both NATs have opened every hole they will, and only A’s check list shown. Real NATs may also predict ports, hairpin or time mappings out after tens of seconds; ICE also nominates the pair and keeps it alive.',
            '簡略化しています。NAT ごとにホストと公開 IP は 1 つ、ポートは順に払い出し、マッピングは期限切れにならず、すべての確認は両方の NAT が開ける穴をすべて開けるまで再送されるものとし、A の確認リストだけを示しました。実際の NAT にはポートの予測、ヘアピン、数十秒でのマッピングの期限切れなどもあります。ICE はさらにペアを指名（nomination）し、維持します。',
          )}
        </p>
      ) : null}
    </div>
  );
}

export default function NatTraversalDemo() {
  return (
    <DemoShell
      title="NAT traversal: STUN, TURN and ICE"
      desc="Two peers behind NATs try to reach each other directly for a call"
    >
      <NatTraversalLesson />
    </DemoShell>
  );
}
