import { useState } from 'react';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  DEFAULT_CONFIRM_TIMEOUT_S,
  MTU_MAX,
  MTU_MIN,
  cliPush,
  confirmedCommit,
  editConfigXml,
  netconfPush,
  pushAll,
  startingDevices,
  uplinkChange,
  type Change,
  type Config,
  type DeviceOutcome,
  type ErrorCode,
  type Method,
} from './netconf';

type Answer = 'accepted' | 'clamped' | 'before-error' | 'nothing';
const ANSWERS: readonly Answer[] = ['accepted', 'clamped', 'before-error', 'nothing'];
const METHODS: readonly Method[] = ['netconf', 'netconf-all-or-none', 'cli'];
type Trial = 'mtu' | 'shut-mgmt';
const TRIALS: readonly Trial[] = ['mtu', 'shut-mgmt'];

const DEVICES = startingDevices();
const ASKED_DESCRIPTION = 'uplink to core';
const ASKED_MTU = '10000';
const askedAddress = (name: string) => `10.1.${name.slice(1)}.1/24`;

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
  verticalAlign: 'top',
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };
const input: React.CSSProperties = {
  minHeight: 44,
  fontFamily: 'monospace',
  fontSize: 14,
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 110,
};
const pre: React.CSSProperties = {
  margin: 0,
  padding: 8,
  background: 'var(--netlab-bg-surface)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 6,
  fontSize: 12,
  lineHeight: 1.5,
  overflowX: 'auto',
};

/** What R2's running configuration shows after a push, as an answer. */
function answerOf(before: Config, after: Config): Answer {
  const was = before.eth1!;
  const now = after.eth1!;
  if (now.mtu === MTU_MAX) return 'clamped';
  if (now.mtu === Number(ASKED_MTU)) return 'accepted';
  return now.description === was.description && now.addresses.length === was.addresses.length
    ? 'nothing'
    : 'before-error';
}

const addressList = (config: Config) =>
  config.eth1!.addresses.map((a) => `${a.ip}/${a.prefixLength}`).join(', ');

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function NetconfLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [method, setMethod] = useState<Method>('netconf');
  const [description, setDescription] = useState(ASKED_DESCRIPTION);
  const [mtus, setMtus] = useState<Record<string, string>>({
    R1: '9000',
    R2: ASKED_MTU,
    R3: '9000',
  });
  const [addresses, setAddresses] = useState<Record<string, string>>(
    Object.fromEntries(DEVICES.map((d) => [d.name, askedAddress(d.name)])),
  );
  const [trial, setTrial] = useState<Trial>('shut-mgmt');
  const [timeoutS, setTimeoutS] = useState(DEFAULT_CONFIRM_TIMEOUT_S);

  const r2 = DEVICES[1]!;
  const askedChange = uplinkChange(ASKED_DESCRIPTION, askedAddress('R2'), ASKED_MTU);
  const asked = netconfPush(r2.running, askedChange);
  const askedCli = cliPush(r2.running, askedChange);
  const truth = answerOf(r2.running, asked.running);

  const changesFor = (name: string) =>
    uplinkChange(description, addresses[name] ?? '', mtus[name] ?? '');
  const outcomes = pushAll(DEVICES, changesFor, method);
  const r2Changes = changesFor('R2');
  const r2Cli = cliPush(r2.running, r2Changes);
  const r2Netconf = netconfPush(r2.running, r2Changes);

  const CONFIRM_AFTER_S = 30;
  const trialChanges: Change[] =
    trial === 'mtu'
      ? uplinkChange(ASKED_DESCRIPTION, askedAddress('R2'), '9000')
      : [{ iface: 'eth0', leaf: 'enabled', value: 'false' }];
  const confirmed = confirmedCommit(r2.running, trialChanges, {
    timeoutS,
    confirmAfterS: CONFIRM_AFTER_S,
    sessionIface: 'eth0',
  });

  const answerName = (answer: Answer) =>
    ({
      accepted: t(
        'All three, MTU 10000 included: the device only warns',
        '3 つとも、MTU 10000 も含めて反映される（警告が出るだけ）',
      ),
      clamped: t(
        `All three, with the MTU lowered to the largest allowed value`,
        '3 つとも反映され、MTU は許される最大値に下げられる',
      ),
      'before-error': t(
        'The description and the address; the MTU stays at 1500',
        '説明とアドレスは反映され、MTU は 1500 のまま',
      ),
      nothing: t('None of them: R2 is exactly as before', 'どれも反映されない（R2 は元のまま）'),
    })[answer];
  const methodName = (m: Method) =>
    ({
      netconf: t('NETCONF, each router', 'NETCONF（ルータごと）'),
      'netconf-all-or-none': t('NETCONF, all or none', 'NETCONF（全台そろって）'),
      cli: t('CLI script', 'CLI スクリプト'),
    })[m];
  const statusName = (status: DeviceOutcome['status']) =>
    ({
      committed: t('committed', 'コミット済み'),
      rejected: t('rejected, nothing changed', '拒否（変更なし）'),
      aborted: t('discarded: another router failed', '破棄（他のルータが失敗）'),
      applied: t('applied', '反映済み'),
      'half-applied': t('stopped half-way', '途中で停止'),
    })[status];
  const errorName = (code: ErrorCode) =>
    ({
      'not-a-number': t('not an integer', '整数ではない'),
      'out-of-range': t(`outside ${MTU_MIN}..${MTU_MAX}`, `${MTU_MIN}〜${MTU_MAX} の範囲外`),
      'not-boolean': t('not true or false', 'true でも false でもない'),
      'bad-address': t('not an IPv4 address/prefix', 'IPv4 アドレス/プレフィックスではない'),
      'prefix-out-of-range': t('prefix length over 32', 'プレフィックス長が 32 を超える'),
      'duplicate-address': t('address already exists', 'アドレスがすでにある'),
      'unknown-interface': t('no such interface', 'そのインターフェースはない'),
    })[code];
  const trialName = (x: Trial) =>
    ({
      mtu: t('Raise eth1’s MTU (keeps the session)', 'eth1 の MTU を上げる（接続は保たれる）'),
      'shut-mgmt': t(
        'Shut eth0, the port the manager uses',
        'eth0（管理用につないでいるポート）を shutdown',
      ),
    })[x];

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
        <div style={LESSON_LABEL}>{t('Configuring by model', 'モデルで設定する')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Three routers, R1 to R3, each have an uplink eth1. A script is to give every eth1 a description, a second IPv4 address and a larger MTU. It talks to the routers with NETCONF: the routers describe their configuration with a YANG data model, and the script sends the change as structured data. NETCONF first writes the change into the candidate datastore, a working copy beside the running configuration; then asks the router to <validate> it against the model; then sends <commit>.',
            'R1〜R3 の 3 台のルータには、それぞれアップリンクの eth1 があります。スクリプトで全台の eth1 に説明、2 つ目の IPv4 アドレス、大きめの MTU を設定します。ルータとは NETCONF で話します。ルータは自分の設定を YANG のデータモデルで表し、スクリプトは変更を構造化されたデータとして送ります。NETCONF ではまず、動いている設定（running）とは別の作業用コピー、candidate データストアに変更を書き込みます。次にモデルに照らして <validate>（検証）させ、最後に <commit> を送ります。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="nc-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            `For R2, the script has a typo: the three edits are description “${ASKED_DESCRIPTION}”, address ${askedAddress('R2')}, and MTU ${ASKED_MTU}. This router’s model allows an MTU from ${MTU_MIN} to ${MTU_MAX}. After edit-config, validate and commit, what is in R2’s running configuration?`,
            `R2 向けのスクリプトに打ちまちがいがありました。3 つの変更は、説明「${ASKED_DESCRIPTION}」、アドレス ${askedAddress('R2')}、MTU ${ASKED_MTU} です。このルータのモデルでは MTU は ${MTU_MIN}〜${MTU_MAX} です。edit-config、validate、commit のあと、R2 の running の設定はどうなっている？`,
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
              data-testid={`nc-guess-${answer}`}
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
            data-testid="nc-reveal"
            data-right={String(guess === truth)}
            data-committed={String(asked.committed)}
            role="status"
            style={{ margin: '8px 0 0', lineHeight: 1.7 }}
          >
            <strong>
              {guess === truth
                ? t('As you predicted. ', '予想どおりです。')
                : t('Not what you predicted. ', '予想とちがいました。')}
            </strong>
            {t(
              `${answerName(truth)}. The first two edits went into the candidate without trouble, but <validate> found ${asked.errors.length} error (${asked.errors.map((e) => `${e.tag} at ${e.path}`).join('; ')}), so the script sent <discard-changes> instead of <commit>. Running still has MTU ${asked.running.eth1!.mtu} and ${asked.running.eth1!.addresses.length} address. A commit takes the whole candidate or nothing. The same three lines typed as a CLI script would have stopped at line ${(askedCli.failedLine ?? 0) + 1} of ${askedCli.lines.length}, leaving the description and the address live and the MTU at ${askedCli.running.eth1!.mtu}: half-configured.`,
              `${answerName(truth)}。最初の 2 つの変更は candidate に問題なく入りましたが、<validate> がエラーを ${asked.errors.length} 件見つけました（${asked.errors.map((e) => `${e.path} で ${e.tag}`).join('、')}）。そこでスクリプトは <commit> ではなく <discard-changes> を送りました。running は MTU ${asked.running.eth1!.mtu}、アドレス ${asked.running.eth1!.addresses.length} 個のままです。commit は candidate 全体を反映するか、何も反映しないかのどちらかです。同じ 3 行を CLI スクリプトで打っていたら、${askedCli.lines.length} 行中 ${(askedCli.failedLine ?? 0) + 1} 行目で止まり、説明とアドレスは反映され、MTU は ${askedCli.running.eth1!.mtu} のまま、という中途半端な設定が残ったはずです。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="nc-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Push the change', '変更を送る')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nc-push">
          <div style={LESSON_LABEL}>{t('Push to all three', '3 台に送る')}</div>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={method === m}
                data-testid={`nc-method-${m}`}
                onClick={() => setMethod(m)}
                style={{ ...lessonChoice(method === m), minHeight: 44 }}
              >
                {method === m ? '✓ ' : ''}
                {methodName(m)}
              </button>
            ))}
          </div>
          <label style={{ display: 'grid', gap: 4, marginTop: 10, fontSize: 13 }}>
            {t('Description (all routers)', '説明（全台共通）')}
            <input
              type="text"
              value={description}
              data-testid="nc-description"
              spellCheck={false}
              onChange={(event) => setDescription(event.target.value)}
              style={{ ...input, maxWidth: 360 }}
            />
          </label>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Router', 'ルータ')}</th>
                  <th style={cell}>{t('New address', '追加アドレス')}</th>
                  <th style={cell}>MTU</th>
                  <th style={cell}>{t('Result', '結果')}</th>
                  <th style={cell}>
                    {t('Running eth1 afterwards', '送ったあとの running の eth1')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((outcome) => (
                  <tr
                    key={outcome.device}
                    data-testid={`nc-row-${outcome.device}`}
                    data-status={outcome.status}
                    data-mtu={outcome.running.eth1!.mtu}
                    data-addresses={outcome.running.eth1!.addresses.length}
                  >
                    <td style={mono}>{outcome.device}</td>
                    <td style={cell}>
                      <input
                        type="text"
                        aria-label={t(`${outcome.device} address`, `${outcome.device} のアドレス`)}
                        value={addresses[outcome.device] ?? ''}
                        data-testid={`nc-address-${outcome.device}`}
                        spellCheck={false}
                        onChange={(event) =>
                          setAddresses({ ...addresses, [outcome.device]: event.target.value })
                        }
                        style={{ ...input, minWidth: 140 }}
                      />
                    </td>
                    <td style={cell}>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={t(`${outcome.device} MTU`, `${outcome.device} の MTU`)}
                        value={mtus[outcome.device] ?? ''}
                        data-testid={`nc-mtu-${outcome.device}`}
                        spellCheck={false}
                        onChange={(event) =>
                          setMtus({ ...mtus, [outcome.device]: event.target.value })
                        }
                        style={{ ...input, minWidth: 80 }}
                      />
                    </td>
                    <td style={cell}>
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {statusName(outcome.status)}
                      </div>
                      {outcome.errors.map((error) => (
                        <div
                          key={error.path}
                          style={{ fontSize: 12, color: 'var(--netlab-accent-red)' }}
                        >
                          {`${error.tag}: ${errorName(error.code)}`}
                        </div>
                      ))}
                    </td>
                    <td style={{ ...cell, fontFamily: 'monospace', fontSize: 12 }}>
                      <div
                        style={{ whiteSpace: 'nowrap' }}
                      >{`mtu ${outcome.running.eth1!.mtu}`}</div>
                      <div>{addressList(outcome.running)}</div>
                      <div>{`“${outcome.running.eth1!.description}”`}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'Each router’s commit is all or nothing, but three routers are three separate commits. To keep the network consistent, an orchestrator can edit and validate every candidate first and commit only when all are valid (“all or none”). Even then a commit can still fail on one router after another has committed, which is one reason confirmed commits exist (below).',
              '1 台の commit は「全部か無しか」ですが、3 台なら別々の 3 回の commit です。ネットワーク全体をそろえるには、オーケストレーターがまず全台の candidate に書き込んで検証し、全台が正しいときだけ commit する（「全台そろって」）方法があります。それでも、ある 1 台が commit したあとで別の 1 台の commit が失敗することはありえます。下の confirmed commit があるのは、それも理由のひとつです。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nc-cli">
          <div style={LESSON_LABEL}>
            {t('R2: what a script has to read back', 'R2：スクリプトが読み取るもの')}
          </div>
          <div
            style={{
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                {t('CLI, line by line', 'CLI（1 行ずつ）')}
              </div>
              <pre style={pre} data-testid="nc-cli-lines" data-failed-line={r2Cli.failedLine ?? -1}>
                {r2Cli.lines
                  .map((line, at) => {
                    const mark =
                      r2Cli.failedLine === at ? '✗' : at < r2Cli.appliedLines ? '✓' : ' ';
                    return `${mark} ${line.text}`;
                  })
                  .join('\n')}
                {r2Cli.error ? `\n% Invalid input detected` : ''}
              </pre>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                {t('NETCONF reply', 'NETCONF の応答')}
              </div>
              <pre style={pre} data-testid="nc-rpc-reply">
                {r2Netconf.errors.length === 0
                  ? '<rpc-reply message-id="102">\n  <ok/>\n</rpc-reply>'
                  : [
                      '<rpc-reply message-id="102">',
                      ...r2Netconf.errors.flatMap((error) => [
                        '  <rpc-error>',
                        '    <error-type>application</error-type>',
                        `    <error-tag>${error.tag}</error-tag>`,
                        '    <error-severity>error</error-severity>',
                        `    <error-path>${error.path.replace(/'/g, '&apos;')}</error-path>`,
                        '  </rpc-error>',
                      ]),
                      '</rpc-reply>',
                    ].join('\n')}
              </pre>
            </div>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'A CLI script “screen-scrapes”: it types text meant for people and has to guess from the text that comes back whether a line worked, and that text differs between vendors and software versions. Each accepted line is live at once, so a failure leaves whatever came before it. With a model, the change is data checked against a schema the router publishes, the reply is structured (an error-tag and the exact path), and reading the state back gives data in the same shape instead of text to parse.',
              'CLI スクリプトは「スクリーンスクレイピング」です。人間向けの文字を打ち込み、返ってきた文字からその行がうまくいったかを推測するしかありません。しかもその文字はベンダーやソフトウェアのバージョンでちがいます。受け付けられた行はすぐに反映されるので、途中で失敗すると、それまでの行だけが残ります。モデルを使えば、変更はルータが公開するスキーマで検査されるデータになり、応答も構造化されています（error-tag と、どこが悪いかを示すパス）。状態を読み出しても、解析すべき文字ではなく同じ形のデータが返ります。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nc-xml">
          <div style={LESSON_LABEL}>
            {t('The <edit-config> sent to R2', 'R2 に送る <edit-config>')}
          </div>
          <pre style={pre} data-testid="nc-xml-text">
            {editConfigXml(r2Changes)}
          </pre>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Generated from the change set above; edit the description or R2’s values and it follows. Characters such as & and < in a value are escaped. The new address carries nc:operation="create", so an address that already exists is an error (data-exists) rather than quietly merged. RESTCONF (RFC 8040) carries the same YANG data over HTTP, as JSON or XML, with GET, PUT, PATCH and DELETE on URLs such as /restconf/data/ietf-interfaces:interfaces.',
              '上の変更から作っています。説明や R2 の値を変えると、こちらも変わります。値に含まれる & や < などの文字はエスケープされます。追加するアドレスには nc:operation="create" が付いているので、すでにあるアドレスなら黙って上書きせずエラー（data-exists）になります。RESTCONF（RFC 8040）は、同じ YANG のデータを HTTP で、JSON か XML として運び、/restconf/data/ietf-interfaces:interfaces のような URL に GET・PUT・PATCH・DELETE を使います。',
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="nc-confirmed">
          <div style={LESSON_LABEL}>{t('Confirmed commit', 'confirmed commit')}</div>
          <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
            {t(
              `A valid change can still be a wrong one. With <commit><confirmed/>, the change goes live, but the router restores the previous configuration by itself unless a second, confirming <commit> arrives within the confirm-timeout (${DEFAULT_CONFIRM_TIMEOUT_S} s by default). Here the script sends that confirmation ${CONFIRM_AFTER_S} s after the commit, if it can still reach R2 through eth0.`,
              `正しい形の変更でも、内容がまちがっていることはあります。<commit><confirmed/> を使うと変更はすぐ反映されますが、confirm-timeout（初期値 ${DEFAULT_CONFIRM_TIMEOUT_S} 秒）以内に確定のための 2 回目の <commit> が来なければ、ルータは自分で元の設定に戻します。ここではスクリプトが、eth0 経由で R2 にまだ届くなら、commit の ${CONFIRM_AFTER_S} 秒後に確定を送ります。`,
            )}
          </p>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TRIALS.map((x) => (
              <button
                key={x}
                type="button"
                role="tab"
                aria-selected={trial === x}
                data-testid={`nc-trial-${x}`}
                onClick={() => setTrial(x)}
                style={{ ...lessonChoice(trial === x), minHeight: 44, textAlign: 'left' }}
              >
                {trial === x ? '✓ ' : ''}
                {trialName(x)}
              </button>
            ))}
          </div>
          <label
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            confirm-timeout
            <input
              type="range"
              min={10}
              max={600}
              step={10}
              value={timeoutS}
              data-testid="nc-timeout"
              onChange={(event) => setTimeoutS(Number(event.target.value))}
              style={{ minHeight: 44 }}
            />
            <span style={{ fontFamily: 'monospace' }}>{`${timeoutS} s`}</span>
          </label>
          <p
            data-testid="nc-confirmed-result"
            data-rolled-back={String(confirmed.rolledBackAtS !== null)}
            data-rolled-back-at={confirmed.rolledBackAtS ?? -1}
            data-final-mtu={confirmed.running.eth1!.mtu}
            data-eth0-enabled={String(confirmed.running.eth0!.enabled)}
            style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {confirmed.rolledBackAtS !== null
              ? t(
                  `${confirmed.reachable ? `The confirmation at ${CONFIRM_AFTER_S} s comes too late.` : 'The script loses R2 the moment eth0 shuts, so no confirmation arrives.'} At ${confirmed.rolledBackAtS} s R2 rolls back by itself: eth0 is ${confirmed.running.eth0!.enabled ? 'up' : 'down'} again, eth1 MTU ${confirmed.running.eth1!.mtu}.`,
                  `${confirmed.reachable ? `${CONFIRM_AFTER_S} 秒後の確定は間に合いません。` : 'eth0 が止まった瞬間にスクリプトは R2 に届かなくなり、確定は来ません。'}${confirmed.rolledBackAtS} 秒後、R2 は自分で元に戻します。eth0 は ${confirmed.running.eth0!.enabled ? '再び up' : 'down'}、eth1 の MTU は ${confirmed.running.eth1!.mtu} です。`,
                )
              : t(
                  `Confirmed at ${confirmed.confirmedAtS} s, within the ${timeoutS} s timeout: the change stays (eth1 MTU ${confirmed.running.eth1!.mtu}).`,
                  `${confirmed.confirmedAtS} 秒後、タイムアウト ${timeoutS} 秒以内に確定しました。変更は残ります（eth1 の MTU は ${confirmed.running.eth1!.mtu}）。`,
                )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD}>
          <div style={LESSON_LABEL}>{t('What is simplified', '簡略化していること')}</div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.7,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            {t(
              `The schema is a small slice of ietf-interfaces (RFC 8343) and ietf-ip: description, enabled, ipv4/mtu and the address list keyed by ip. ietf-ip lets the MTU start at ${MTU_MIN}; the upper limit of ${MTU_MAX} is this lesson’s routers, as a device would declare with a YANG (RFC 7950) deviation. Every check is done at <validate> here; a real router may reject some values already at <edit-config>, and either way nothing reaches running. Locking the datastore, sessions and capabilities (RFC 6241) are left out, and the CLI is a generic one.`,
              `スキーマは ietf-interfaces（RFC 8343）と ietf-ip のごく一部です（description、enabled、ipv4/mtu、ip をキーとするアドレスのリスト）。ietf-ip では MTU の下限は ${MTU_MIN} で、上限の ${MTU_MAX} はこのレッスンのルータの値です。実機なら YANG（RFC 7950）の deviation で宣言します。ここではすべての検査を <validate> で行いますが、実機は <edit-config> の時点で一部の値を拒否することもあります。どちらにしても running には何も入りません。データストアのロック、セッション、capability（RFC 6241）は省いていて、CLI は特定の製品のものではありません。`,
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function NetconfDemo() {
  return (
    <DemoShell
      title="NETCONF and YANG"
      desc="Configuring routers with a data model: candidate, validate and commit, compared with a CLI script"
    >
      <NetconfLesson />
    </DemoShell>
  );
}
