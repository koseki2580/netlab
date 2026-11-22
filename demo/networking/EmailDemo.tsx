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
  CASES,
  ENVELOPE,
  MESSAGES,
  MX_RECORDS,
  deliver,
  deliveryOrder,
  dnsData,
  evaluate,
  smtpTranscript,
  type Action,
  type CaseId,
  type DmarcPolicy,
} from './email';

type Answer = 'pass' | 'fail' | 'none';
const ANSWERS: readonly Answer[] = ['pass', 'fail', 'none'];
const POLICIES: readonly DmarcPolicy[] = ['none', 'quarantine', 'reject'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function EmailLesson() {
  const t = useT();
  const [down, setDown] = useState<ReadonlySet<string>>(new Set());
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [policy, setPolicy] = useState<DmarcPolicy>('reject');

  const delivery = deliver(MX_RECORDS, down);
  const transcript = delivery.deliveredTo ? smtpTranscript(delivery.deliveredTo, ENVELOPE) : [];
  const asked = evaluate(MESSAGES.forwarded, dnsData('reject'));
  const truth: Answer = asked.dmarc;
  const dns = dnsData(policy);

  const toggle = (host: string) =>
    setDown((current) => {
      const next = new Set(current);
      if (next.has(host)) next.delete(host);
      else next.add(host);
      return next;
    });

  const answerName = (answer: Answer) =>
    ({
      pass: t('DMARC passes: Bob gets it', 'DMARC は pass：Bob に届く'),
      fail: t('DMARC fails: it is rejected', 'DMARC は fail：拒否される'),
      none: t(
        'No DMARC verdict: forwarded mail is not checked',
        'DMARC の判定なし：転送されたメールは確認されない',
      ),
    })[answer];
  const caseName = (id: CaseId) =>
    ({
      direct: t('Sent directly', '直接送信'),
      list: t('Through a mailing list', 'メーリングリスト経由'),
      forwarded: t('Forwarded', '転送'),
      forged: t('Forged From:', 'From: の偽装'),
    })[id];
  const actionName = (action: Action) =>
    ({
      deliver: t('inbox', '受信箱へ'),
      quarantine: t('spam folder', '迷惑メールへ'),
      reject: t('rejected (550)', '拒否（550）'),
    })[action];
  const mark = (ok: boolean) => (ok ? t('aligned', '一致') : t('not aligned', '不一致'));

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
        <div style={LESSON_LABEL}>
          {t('Part 1: finding the server', 'パート 1：届け先のサーバーを探す')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Alice’s mail server (mail.example.com) has a message for bob@example.org. It asks DNS for the MX records of example.org: each names a mail server and a preference. It tries the lowest preference first, and moves to the next only if that one does not answer. Switch the servers off and on.',
            'Alice のメールサーバー（mail.example.com）に bob@example.org 宛てのメールがあります。サーバーは DNS に example.org の MX レコードを問い合わせます。MX レコードはそれぞれメールサーバーの名前と優先度（preference）を持っています。送り手は優先度の値がいちばん小さいサーバーから試し、応答がないときだけ次へ進みます。サーバーを止めたり動かしたりしてみてください。',
          )}
        </p>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('Try', '試す順')}</th>
                <th style={cell}>{t('MX record', 'MX レコード')}</th>
                <th style={cell}>{t('Server', 'サーバー')}</th>
              </tr>
            </thead>
            <tbody>
              {deliveryOrder(MX_RECORDS).map((record, index) => {
                const isDown = down.has(record.host);
                const short = record.host.split('.')[0] ?? record.host;
                return (
                  <tr key={record.host}>
                    <td style={mono}>{index + 1}</td>
                    <td style={mono}>{`MX ${record.preference} ${record.host}`}</td>
                    <td style={cell}>
                      <button
                        type="button"
                        aria-pressed={isDown}
                        data-testid={`mail-mx-toggle-${short}`}
                        onClick={() => toggle(record.host)}
                        style={{ ...lessonChoice(isDown), minHeight: 44 }}
                      >
                        {isDown ? `✓ ${t('Down', '停止中')}` : t('Up', '稼働中')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p
          data-testid="mail-delivered"
          data-host={delivery.deliveredTo ?? ''}
          data-attempts={delivery.attempts.length}
          style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
        >
          {delivery.attempts
            .map((attempt) =>
              attempt.answered
                ? t(`${attempt.host} answers.`, `${attempt.host} が応答します。`)
                : t(`${attempt.host}: no answer.`, `${attempt.host}：応答なし。`),
            )
            .join(' ')}{' '}
          {delivery.deliveredTo
            ? t(
                `Delivered after ${delivery.attempts.length} attempt(s).`,
                `${delivery.attempts.length} 回目の試行で届きました。`,
              )
            : t(
                'No server accepts it, so the message stays in the queue and is retried later, typically for several days before Alice gets a bounce.',
                'どのサーバーも受け取らないので、メールは送信キューに残り、あとで再送されます。Alice にエラーメールが返るのは、ふつう何日も再送を続けたあとです。',
              )}
        </p>
        {transcript.length > 0 ? (
          <>
            <div style={{ ...LESSON_LABEL, marginTop: 12 }}>
              {t(
                'The SMTP dialogue (S = server, C = client)',
                'SMTP のやりとり（S = サーバー、C = クライアント）',
              )}
            </div>
            <pre
              data-testid="mail-transcript"
              data-server={delivery.deliveredTo ?? ''}
              style={{
                margin: 0,
                overflowX: 'auto',
                fontSize: 12,
                lineHeight: 1.5,
                padding: 8,
                border: '1px solid var(--netlab-border)',
                borderRadius: 6,
                color: 'var(--netlab-text-primary)',
              }}
            >
              {transcript
                .map((line) => `${line.from === 'server' ? 'S' : 'C'}: ${line.text}`)
                .join('\n')}
            </pre>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 13,
                color: 'var(--netlab-text-secondary)',
                lineHeight: 1.7,
              }}
            >
              {t(
                'A 2xx code means done, 354 means “go ahead, send the message”, 4xx is a temporary failure (try again later) and 5xx a permanent one. After STARTTLS the rest of the dialogue is encrypted, and the client says EHLO again. MAIL FROM and RCPT TO are the envelope; the From: line inside DATA is what Bob’s mail app shows, and nothing in SMTP forces the two to match. The TLS handshake itself is left out here.',
                '2xx は完了、354 は「本文を送ってください」、4xx は一時的な失敗（あとで再送）、5xx は恒久的な失敗です。STARTTLS のあとのやりとりは暗号化され、クライアントはもう一度 EHLO を送ります。MAIL FROM と RCPT TO は「封筒」で、DATA の中の From: 行が Bob のメールアプリに表示される差出人です。SMTP にはこの 2 つを一致させる決まりがありません。TLS のハンドシェイクそのものは省いています。',
              )}
            </p>
          </>
        ) : null}
      </div>

      <div style={LESSON_CARD}>
        <div style={{ ...LESSON_LABEL, textTransform: 'none' }}>
          {t('Part 2: is it really from example.com?', 'パート 2：本当に example.com から？')}
        </div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'Because the From: header can say anything, the receiving server checks three things. SPF (RFC 7208): the MAIL FROM domain publishes in DNS which IP addresses may send its mail; is the connecting server one of them? DKIM (RFC 6376): the sending server signed the message with a key published under a domain, named in the signature as d=; does the signature still verify? DMARC (RFC 9989, which replaced RFC 7489): the From: domain publishes a policy, and the check passes only if SPF or DKIM passed for a domain that aligns with the From: domain — here, with the same organisational domain, so mail.example.com aligns with example.com. A failing message gets what the policy says: p=none (deliver anyway), p=quarantine (spam folder) or p=reject.',
            'From: ヘッダーには何でも書けてしまうので、受信側のサーバーは 3 つを確かめます。SPF（RFC 7208）：MAIL FROM のドメインは、自分のメールを送ってよい IP アドレスを DNS で公開しています。接続してきたサーバーはその中にあるか。DKIM（RFC 6376）：送信側のサーバーは、あるドメインで公開した鍵でメールに署名し、そのドメインを署名の d= に書きます。署名はいまも正しく検証できるか。DMARC（RFC 9989。RFC 7489 の後継）：From: のドメインはポリシーを公開しています。SPF か DKIM のどちらかが、From: のドメインと一致（アライメント）するドメインで pass したときだけ、DMARC も pass です。ここでの「一致」は組織ドメインが同じことで、mail.example.com は example.com と一致します。fail したメールはポリシーに従って扱われます。p=none（そのまま配送）、p=quarantine（迷惑メールへ）、p=reject（拒否）です。',
          )}
        </p>
      </div>

      <div style={LESSON_CARD} data-testid="mail-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'example.com publishes p=reject and lets only 192.0.2.0/24 send its mail. Alice (alice@example.com) writes to Bob’s old address, which forwards everything unchanged from its own server, 203.0.113.5, keeping MAIL FROM alice@example.com. The message carries Alice’s DKIM signature with d=mail.example.com. What does Bob’s new provider decide?',
            'example.com は p=reject を公開し、自分のメールを送ってよいのは 192.0.2.0/24 だけとしています。Alice（alice@example.com）が Bob の古いアドレスへ送ると、そのアドレスはメールを何も変えずに自分のサーバー 203.0.113.5 から転送します。MAIL FROM は alice@example.com のままです。メールには d=mail.example.com の Alice の DKIM 署名が付いています。Bob の新しいプロバイダーはどう判定する？',
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
              data-testid={`mail-guess-${answer}`}
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
            data-testid="mail-reveal"
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
              `DMARC ${asked.dmarc}, so the message goes to the ${actionName(asked.action)}. SPF gives “${asked.spf}”: ${MESSAGES.forwarded.connectingIp} is not in example.com’s list, because the forwarder, not Alice’s server, connected. But DKIM gives “${asked.dkim}”: nothing in the message changed, and d=mail.example.com is ${mark(asked.dkimAligned)} with example.com. One aligned pass is enough.`,
              `DMARC は ${asked.dmarc} なので、メールは${actionName(asked.action)}届きます。SPF は「${asked.spf}」です。接続してきたのは Alice のサーバーではなく転送サーバーで、${MESSAGES.forwarded.connectingIp} は example.com のリストにないからです。しかし DKIM は「${asked.dkim}」です。メールは何も変わっておらず、d=mail.example.com は example.com と${mark(asked.dkimAligned)}しています。一致したまま pass したものが 1 つあれば十分です。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="mail-reveal-button"
            disabled={!guess}
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 8, opacity: guess ? 1 : 0.5 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Run the checks', '確認を実行する')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="mail-cases">
          <div style={{ ...LESSON_LABEL, textTransform: 'none' }}>
            {t('Four messages, all with From: example.com', 'From: が example.com の 4 通')}
          </div>
          <div
            role="tablist"
            aria-label={t('example.com’s DMARC policy', 'example.com の DMARC ポリシー')}
            style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}
          >
            {POLICIES.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={policy === p}
                data-testid={`mail-policy-${p}`}
                onClick={() => setPolicy(p)}
                style={{ ...lessonChoice(policy === p), minHeight: 44 }}
              >
                {`${policy === p ? '✓ ' : ''}p=${p}`}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('Message', 'メール')}</th>
                  <th style={cell}>{t('Connecting IP', '接続元 IP')}</th>
                  <th style={cell}>MAIL FROM</th>
                  <th style={cell}>SPF</th>
                  <th style={cell}>DKIM</th>
                  <th style={cell}>DMARC</th>
                  <th style={cell}>{t('Action', '扱い')}</th>
                </tr>
              </thead>
              <tbody>
                {CASES.map((id) => {
                  const message = MESSAGES[id];
                  const verdict = evaluate(message, dns);
                  return (
                    <tr
                      key={id}
                      data-testid={`mail-case-${id}`}
                      data-spf={verdict.spf}
                      data-dkim={verdict.dkim}
                      data-dmarc={verdict.dmarc}
                      data-action={verdict.action}
                    >
                      <td style={cell}>{caseName(id)}</td>
                      <td style={mono}>{message.connectingIp}</td>
                      <td style={mono}>{message.mailFromDomain}</td>
                      <td style={mono}>
                        {verdict.spf === 'pass' ? `pass, ${mark(verdict.spfAligned)}` : verdict.spf}
                      </td>
                      <td style={mono}>
                        {message.dkim
                          ? `${verdict.dkim} d=${message.dkim.d}${verdict.dkim === 'pass' ? `, ${mark(verdict.dkimAligned)}` : ''}`
                          : t('none (unsigned)', 'none（署名なし）')}
                      </td>
                      <td style={{ ...mono, fontWeight: 700 }}>{verdict.dmarc}</td>
                      <td style={mono}>{actionName(verdict.action)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {t(
              'The mailing list adds a subject tag and a footer, which breaks Alice’s signature, and its own SPF pass is for lists.example.net, which does not align with example.com. The forged message passes SPF too — for other.example, its own domain — which says nothing about example.com. Change the policy: it only decides what happens to messages that fail; a pass is delivered under any policy. Domains usually start at p=none and read the aggregate reports receivers send back before moving to reject.',
              'メーリングリストは件名にタグを、本文の最後に署名欄を足すので、Alice の署名が壊れます。リスト自身の SPF の pass は lists.example.net に対するもので、example.com とは一致しません。偽装されたメールも SPF は pass しますが、それは自分のドメイン other.example に対してで、example.com については何も示しません。ポリシーを切り替えてみてください。ポリシーが決めるのは fail したメールの扱いだけで、pass したメールはどのポリシーでも届きます。ドメインはふつう p=none から始め、受信側から届く集計レポートを読んでから reject へ進めます。',
            )}
          </p>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: 'var(--netlab-text-secondary)',
              lineHeight: 1.7,
            }}
          >
            {t(
              'Simplified: signatures are not really computed — a signature counts as valid unless the message was changed after signing, which is what breaks a real one. SPF records here hold only ip4: ranges, and the organisational domain is taken as the last two labels (real receivers find it with RFC 9989’s DNS tree walk, or with the older Public Suffix List). Alignment is relaxed, DMARC’s default. In practice, many lists rewrite From: to the list’s own address, forwarders can rewrite MAIL FROM (SRS) so SPF passes for them, and ARC (RFC 8617) lets a receiver see the results an earlier hop recorded.',
              '簡略化しています。署名は実際には計算していません。署名後にメールが変わらなければ正しいとみなします。本物の署名が壊れるのも、署名後の変更が原因です。SPF レコードは ip4: の範囲だけを扱い、組織ドメインは末尾の 2 ラベルとしました（実際の受信側は RFC 9989 の DNS ツリーウォーク、または従来の Public Suffix List で求めます）。アライメントは DMARC の初期値である relaxed です。実際には、多くのメーリングリストは From: をリスト自身のアドレスに書き換え、転送サーバーは MAIL FROM を書き換えて（SRS）自分の SPF で pass させることができます。また ARC（RFC 8617）を使うと、受信側は途中のサーバーが記録した確認結果を見られます。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function EmailDemo() {
  return (
    <DemoShell
      title="Email delivery and authentication"
      desc="How mail finds the recipient’s server, and how the receiver checks who really sent it"
    >
      <EmailLesson />
    </DemoShell>
  );
}
