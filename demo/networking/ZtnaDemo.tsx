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
  APPS,
  POLICY,
  USERS,
  VPN_ACL,
  decide,
  exposure,
  vpnReachable,
  type AppId,
  type Device,
  type Group,
  type Reason,
  type User,
  type UserId,
} from './ztna';

type Answer = '1-1' | '5-1' | '5-5' | '0-1';
const ANSWERS: readonly Answer[] = ['1-1', '5-1', '5-5', '0-1'];

const cell: React.CSSProperties = {
  padding: 4,
  borderBottom: '1px solid var(--netlab-border)',
  fontSize: 13,
};
const mono: React.CSSProperties = { ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' };

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function ZtnaLesson() {
  const t = useT();
  const [guess, setGuess] = useState<Answer | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [userId, setUserId] = useState<UserId>('contractor');
  const [osFixed, setOsFixed] = useState<Partial<Record<UserId, boolean>>>({});

  const contractor = USERS.find((u) => u.id === 'contractor')!;
  const contractorVpn = exposure('vpn', contractor);
  const contractorZtna = exposure('ztna', contractor);
  const truth = `${contractorVpn.apps}-${contractorZtna.apps}` as Answer;
  const reachable = vpnReachable();

  const user = USERS.find((u) => u.id === userId)!;
  const device: Device = osFixed[userId] ? { ...user.device, osUpToDate: true } : user.device;
  const vpn = exposure('vpn', user, device);
  const ztna = exposure('ztna', user, device);

  const appName = (id: AppId) =>
    ({
      hr: t('HR system', '人事システム'),
      'code-repo': t('Code repository', 'コードリポジトリ'),
      'finance-db': t('Finance database', '経理データベース'),
      printers: t('Printer subnet', 'プリンタのサブネット'),
      'wifi-admin': t('Wi-Fi controller admin page', '無線 LAN コントローラの管理画面'),
    })[id];
  const userName = (id: UserId) =>
    ({
      engineer: t('Engineer, managed laptop', 'エンジニア（会社管理のノート PC）'),
      contractor: t('Contractor, personal laptop', '業務委託（私物のノート PC）'),
      'engineer-stale': t(
        'Engineer, laptop with an out-of-date OS',
        'エンジニア（OS が古いノート PC）',
      ),
    })[id];
  const groupName = (group: Group) =>
    ({
      employees: t('employees', '社員'),
      engineering: t('engineering', '開発'),
      contractors: t('contractors', '業務委託'),
      finance: t('finance', '経理'),
      netops: t('network operations', 'ネットワーク運用'),
    })[group];
  const deviceText = (d: Device) =>
    `${d.managed ? t('managed', '会社管理') : t('personal (unmanaged)', '私物（管理外）')}, ${
      d.osUpToDate ? t('OS up to date', 'OS は最新') : t('OS out of date', 'OS が古い')
    }`;
  const reasonName = (reason: Reason) =>
    ({
      allowed: t('allowed', '許可'),
      'not-in-group': t('denied: not in an allowed group', '拒否：許可されたグループにいない'),
      unmanaged: t('denied: device not managed', '拒否：管理外の端末'),
      'os-out-of-date': t('denied: OS out of date', '拒否：OS が古い'),
    })[reason];
  const answerName = (answer: Answer) => {
    const [v, z] = answer.split('-');
    return t(`VPN: ${v} apps · ZTNA: ${z} apps`, `VPN：${v} 個 ・ ZTNA：${z} 個`);
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
        <div style={LESSON_LABEL}>{t('Working from home', '自宅から社内アプリへ')}</div>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          {t(
            'A company has five internal apps, all inside 10.0.0.0/8. Three people work from home and need some of them. The company can let them in two ways.',
            'ある会社には 10.0.0.0/8 の中に 5 つの社内アプリがあります。自宅で働く 3 人が、そのうちいくつかを使います。会社が入口を用意するやり方は 2 通りです。',
          )}
        </p>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>
          <li>
            {t(
              `Remote-access VPN: once connected, the laptop gets an address on the internal network, and the VPN’s ACL permits ${VPN_ACL}.`,
              `リモートアクセス VPN：接続するとノート PC は社内ネットワークのアドレスをもらい、VPN の ACL は ${VPN_ACL} を許可します。`,
            )}
          </li>
          <li>
            {t(
              'Zero-trust network access (ZTNA): the apps have no route from the laptop at all. The laptop talks only to an access proxy, and a policy engine decides each request from who the user is, which app it is for, and the state of the device (its posture).',
              'ゼロトラストネットワークアクセス（ZTNA）：ノート PC からアプリへの経路はそもそもありません。ノート PC が話せるのはアクセスプロキシだけで、ポリシーエンジンがリクエストごとに「誰か」「どのアプリか」「端末の状態（ポスチャ）」から許可を決めます。',
            )}
          </li>
        </ul>
      </div>

      <div style={LESSON_CARD} data-testid="ztna-setup">
        <div style={LESSON_LABEL}>{t('Apps and the ZTNA policy', 'アプリと ZTNA のポリシー')}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('App', 'アプリ')}</th>
                <th style={cell}>{t('Address', 'アドレス')}</th>
                <th style={cell}>{t('Allowed groups', '許可するグループ')}</th>
                <th style={cell}>{t('Device must be', '端末の条件')}</th>
              </tr>
            </thead>
            <tbody>
              {APPS.map((app) => {
                const rule = POLICY.find((r) => r.app === app.id)!;
                return (
                  <tr key={app.id}>
                    <td style={cell}>{appName(app.id)}</td>
                    <td style={mono}>{app.prefix}</td>
                    <td style={cell}>{rule.groups.map(groupName).join(', ')}</td>
                    <td style={cell}>
                      {rule.posture === 'compliant'
                        ? t('managed and up to date', '会社管理で OS が最新')
                        : t('OS up to date (personal is fine)', 'OS が最新（私物でもよい）')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                <th style={cell}>{t('Person', '人')}</th>
                <th style={cell}>{t('Groups', 'グループ')}</th>
                <th style={cell}>{t('Device', '端末')}</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u: User) => (
                <tr key={u.id}>
                  <td style={cell}>{userName(u.id)}</td>
                  <td style={cell}>{u.groups.map(groupName).join(', ')}</td>
                  <td style={cell}>{deviceText(u.device)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={LESSON_CARD} data-testid="ztna-predict">
        <div style={LESSON_LABEL}>{t('Predict first', 'まず予想')}</div>
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
          {t(
            'Malware has taken over the contractor’s personal laptop. How many of the five apps can that laptop reach under each model?',
            '業務委託の人の私物ノート PC がマルウェアに乗っ取られました。5 つのアプリのうち、そのノート PC が届くのはそれぞれのやり方で何個？',
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
              data-testid={`ztna-guess-${answer}`}
              disabled={revealed}
              onClick={() => setGuess(answer)}
              style={{ ...lessonChoice(guess === answer), textAlign: 'left', minHeight: 44 }}
            >
              {guess === answer ? '✓ ' : ''}
              {answerName(answer)}
            </button>
          ))}
        </div>
        {revealed ? (
          <p
            data-testid="ztna-reveal"
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
              `VPN: ${contractorVpn.apps}, ZTNA: ${contractorZtna.apps}. The VPN checks who connects, then hands the laptop a place on the network: the ACL ${VPN_ACL} covers every app address, ${contractorVpn.addresses.toLocaleString('en')} addresses in all, whatever the user’s groups or device. Under ZTNA no app is reachable at the network level; the proxy forwards only requests the policy allows, and the contractor’s groups and personal device pass only the code repository’s rule.`,
              `VPN は ${contractorVpn.apps} 個、ZTNA は ${contractorZtna.apps} 個です。VPN は接続する人を確かめたあと、ノート PC をネットワークの中に置きます。ACL の ${VPN_ACL} はすべてのアプリのアドレスを含み、合計 ${contractorVpn.addresses.toLocaleString('ja')} アドレスに届きます。グループや端末の状態は関係ありません。ZTNA ではどのアプリにもネットワークとしては届かず、プロキシはポリシーが許可したリクエストだけを中継します。業務委託のグループと私物端末が通るのは、コードリポジトリのルールだけです。`,
            )}
          </p>
        ) : (
          <button
            type="button"
            data-testid="ztna-reveal-button"
            disabled={!guess}
            style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
            onClick={() => setRevealed(true)}
          >
            {guess
              ? t('Compare the two models', '2 つのやり方を比べる')
              : t('Predict first', '先に予想を選んでください')}
          </button>
        )}
      </div>

      {revealed ? (
        <div style={LESSON_CARD} data-testid="ztna-compare">
          <div style={LESSON_LABEL}>{t('Each person, each request', '人ごと、リクエストごと')}</div>
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                role="tab"
                aria-selected={userId === u.id}
                data-testid={`ztna-user-${u.id}`}
                onClick={() => setUserId(u.id)}
                style={{ ...lessonChoice(userId === u.id), minHeight: 44, textAlign: 'left' }}
              >
                {userId === u.id ? '✓ ' : ''}
                {userName(u.id)}
              </button>
            ))}
          </div>
          <p style={{ margin: '8px 0', fontSize: 13 }}>
            {t('Device now: ', '今の端末：')}
            <span style={{ fontFamily: 'monospace' }}>{deviceText(device)}</span>
          </p>
          {user.device.osUpToDate ? null : (
            <button
              type="button"
              aria-pressed={Boolean(osFixed[userId])}
              data-testid="ztna-os-toggle"
              onClick={() => setOsFixed({ ...osFixed, [userId]: !osFixed[userId] })}
              style={{ ...lessonChoice(Boolean(osFixed[userId])), minHeight: 44, marginBottom: 8 }}
            >
              {osFixed[userId]
                ? t('✓ OS updated (undo)', '✓ OS を更新した（元に戻す）')
                : t('Update the OS', 'OS を更新する')}
            </button>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
                  <th style={cell}>{t('App', 'アプリ')}</th>
                  <th style={cell}>{t('VPN: reachable', 'VPN：届く')}</th>
                  <th style={cell}>{t('ZTNA: decision', 'ZTNA：判定')}</th>
                </tr>
              </thead>
              <tbody>
                {APPS.map((app) => {
                  const decision = decide(user, app.id, device);
                  const inVpn = reachable.includes(app.id);
                  return (
                    <tr
                      key={app.id}
                      data-testid={`ztna-row-${app.id}`}
                      data-vpn={String(inVpn)}
                      data-ztna={String(decision.allow)}
                    >
                      <td style={cell}>{appName(app.id)}</td>
                      <td style={mono}>{inVpn ? t('yes', '届く') : t('no', '届かない')}</td>
                      <td style={cell}>{reasonName(decision.reason)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p
            data-testid="ztna-exposure"
            data-vpn-apps={vpn.apps}
            data-ztna-apps={ztna.apps}
            data-vpn-addresses={vpn.addresses}
            data-ztna-addresses={ztna.addresses}
            style={{ margin: '8px 0 0', fontWeight: 700, lineHeight: 1.7 }}
          >
            {t(
              `If this laptop is compromised — VPN: ${vpn.apps} apps and ${vpn.addresses.toLocaleString('en')} internal addresses it can scan. ZTNA: ${ztna.apps} apps, through the proxy only, and ${ztna.addresses} addresses.`,
              `このノート PC が乗っ取られたら ── VPN：${vpn.apps} 個のアプリと、探れる社内アドレス ${vpn.addresses.toLocaleString('ja')} 個。ZTNA：プロキシ経由で ${ztna.apps} 個のアプリ、直接届くアドレスは ${ztna.addresses} 個。`,
            )}
          </p>
        </div>
      ) : null}

      {revealed ? (
        <div style={LESSON_CARD} data-testid="ztna-notes">
          <div style={LESSON_LABEL}>{t('What to take away', 'まとめ')}</div>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            {t(
              'Because the policy engine decides every request, a laptop whose OS falls out of date is refused on its next request, not at its next login; updating it lets the next request through. The allowed apps can still be misused by a compromised device, so ZTNA narrows the blast radius rather than removing it. NIST SP 800-207 (Zero Trust Architecture) describes this split into a policy engine that decides and an enforcement point that sits in front of each resource. SASE (Secure Access Service Edge) delivers ZTNA from a cloud service together with a secure web gateway for the user’s internet traffic.',
              'ポリシーエンジンがリクエストごとに判定するので、OS が古くなった端末は次のログインではなく次のリクエストで拒否され、更新すれば次のリクエストから通ります。許可されたアプリは乗っ取られた端末からも悪用され得るので、ZTNA は被害の範囲を狭めるものであって、なくすものではありません。NIST SP 800-207（Zero Trust Architecture）は、判定するポリシーエンジンと、各リソースの前で判定を実行するポイントに分ける形を示しています。SASE（Secure Access Service Edge）は、ZTNA をクラウドのサービスとして、利用者のインターネット通信を守るセキュア Web ゲートウェイと一緒に提供します。',
            )}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
            {t(
              'Simplified: one VPN ACL for everyone and no posture check when the VPN connects (some VPN products check once, at connect time); posture is just “managed?” and “OS up to date?”; real policies also weigh MFA, location, time and risk signals.',
              '簡略化しています：VPN の ACL は全員共通で、接続時のポスチャ確認はありません（接続時に一度だけ確認する VPN 製品もあります）。ポスチャは「会社管理か」「OS が最新か」の 2 つだけです。実際のポリシーは MFA、場所、時刻、リスクの兆候なども使います。',
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function ZtnaDemo() {
  return (
    <DemoShell
      title="From VPN to zero-trust access"
      desc="A remote worker reaching company apps through a VPN or through an access proxy that checks identity and device"
    >
      <ZtnaLesson />
    </DemoShell>
  );
}
