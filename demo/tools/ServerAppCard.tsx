import { useEffect, useRef, useState } from 'react';
import type { AppSandbox } from '../../src/terminal/serverApp/appSandbox';
import type { ServerApp } from '../../src/terminal/types';
import { LESSON_BUTTON, LESSON_CARD, LESSON_LABEL } from '../components/lessonStyles';
import { useT } from '../localeContext';

/** Where this viewer's app code is kept: this browser only, never the page address (REQ-416). */
const STORAGE_KEY = 'netlab-terminal-www-app';

export const STARTER_APP = `// www's web server. Press Start, then in the terminal:
//   curl http://www.example.test/hello?name=Ada
//   curl -v http://www.example.test/big
let visits = 0;

app.get('/hello', (req, res) => {
  visits += 1;
  res.send('Hello ' + (req.query.name ?? 'world') + ' (visit ' + visits + ')');
});

app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'user ' + req.params.id });
});

// About 3 KB: more than one TCP segment (at most 1400 bytes each).
app.get('/big', (req, res) => {
  const lines = [];
  for (let i = 1; i <= 60; i += 1) lines.push('line ' + String(i).padStart(2, '0') + ' ' + '-'.repeat(40));
  res.set('Content-Type', 'text/plain').send(lines.join('\\n'));
});
`;

function readCode(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? STARTER_APP;
  } catch {
    return STARTER_APP;
  }
}

function saveCode(code: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Storage may be blocked; the code still runs for this visit.
  }
}

/** What www serves: its built-in pages, the learner's app, or nothing. */
export type WwwMode = 'built-in' | 'app' | 'stopped';

/**
 * The learner's app for www (REQ-416): edit, Start and Stop. The code runs in
 * its own Web Worker, loaded only when Start is pressed; its console output
 * and errors appear in the log.
 */
export function ServerAppCard({
  onChange,
}: {
  /** Called with the app while it runs, and with null when www should not answer. */
  onChange: (mode: WwwMode, app: ServerApp | null) => void;
}) {
  const t = useT();
  const [code, setCode] = useState(readCode);
  const [mode, setMode] = useState<WwwMode>('built-in');
  const [log, setLog] = useState<string[]>([]);
  const sandbox = useRef<AppSandbox | null>(null);
  const append = (lines: readonly string[]) =>
    setLog((previous) => [...previous, ...lines].slice(-40));

  useEffect(() => () => sandbox.current?.stop(), []);

  const stop = (next: WwwMode) => {
    sandbox.current?.stop();
    sandbox.current = null;
    setMode(next);
    onChange(next, null);
  };

  const start = async () => {
    sandbox.current?.stop();
    saveCode(code);
    setLog([]);
    const { createAppSandbox } = await import('../../src/terminal/serverApp/appSandbox');
    const created = createAppSandbox(code, { timeoutMs: 1000 });
    const loaded = await created.start();
    if (!loaded.ok) {
      append([
        loaded.kind === 'stopped'
          ? t('The app stopped.', 'アプリが止まりました。')
          : `${loaded.kind === 'syntax' ? 'SyntaxError' : 'Error'}: ${loaded.message}`,
      ]);
      created.stop();
      setMode('stopped');
      onChange('stopped', null);
      return;
    }
    append(loaded.log);
    sandbox.current = created;
    const app: ServerApp = {
      handle: async (raw) => {
        const result = await created.handle(raw);
        const firstLine = raw.split('\r\n')[0] ?? '';
        if (result.ok) {
          append([...result.log, `${firstLine} → ${result.response.status}`]);
        } else {
          append([
            ...result.log,
            result.kind === 'timeout'
              ? t(
                  `${firstLine}: no answer within 1000 ms; the app was stopped.`,
                  `${firstLine}：1000 ms 以内に応答がなく、アプリを止めました。`,
                )
              : `${firstLine}: ${result.message}`,
          ]);
          if (!created.running) {
            sandbox.current = null;
            setMode('stopped');
            onChange('stopped', null);
          }
        }
        return result;
      },
    };
    setMode('app');
    onChange('app', app);
  };

  const status =
    mode === 'app'
      ? t('Running on www, port 80', 'www の 80 番で動作中')
      : mode === 'stopped'
        ? t('Stopped: www refuses connections', '停止中：www は接続を受け付けません')
        : t('www serves its built-in pages', 'www は組み込みのページを返しています');

  return (
    <div style={LESSON_CARD} data-testid="server-app">
      <div style={LESSON_LABEL}>{t('Write www’s server', 'www のサーバを書く')}</div>
      <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
        {t(
          'Write the web server as an app in JavaScript, in the style of Express: app.get(path, (req, res) => …), with req.query, req.params, req.body and res.status, res.set, res.send, res.json. Start it and curl it from the client: the request and the response travel through the network, and a large response is split into segments.',
          'Web サーバを Express 風の JavaScript のアプリとして書きます。app.get(パス, (req, res) => …) の中で req.query・req.params・req.body と res.status・res.set・res.send・res.json が使えます。起動して client から curl すると、要求と応答がネットワークを通り、大きな応答はセグメントに分かれて届きます。',
        )}
      </p>
      <textarea
        data-testid="server-app-code"
        aria-label={t('www’s app code', 'www のアプリのコード')}
        value={code}
        spellCheck={false}
        onChange={(event) => setCode(event.target.value)}
        rows={14}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'monospace',
          fontSize: 13,
          padding: 8,
          borderRadius: 6,
          border: '1px solid var(--netlab-border)',
          background: 'var(--netlab-bg-surface)',
          color: 'var(--netlab-text-primary)',
        }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <button
          type="button"
          data-testid="server-app-start"
          style={LESSON_BUTTON}
          onClick={() => void start()}
        >
          {mode === 'app' ? t('Restart', '再起動') : t('Start', '起動')}
        </button>
        <button
          type="button"
          data-testid="server-app-stop"
          style={LESSON_BUTTON}
          disabled={mode !== 'app'}
          onClick={() => stop('stopped')}
        >
          {t('Stop', '停止')}
        </button>
        <button
          type="button"
          data-testid="server-app-builtin"
          style={LESSON_BUTTON}
          disabled={mode === 'built-in'}
          onClick={() => stop('built-in')}
        >
          {t('Back to the built-in pages', '組み込みのページに戻す')}
        </button>
        <button
          type="button"
          data-testid="server-app-reset"
          style={LESSON_BUTTON}
          onClick={() => setCode(STARTER_APP)}
        >
          {t('Starter code', '最初のコードに戻す')}
        </button>
      </div>
      <p
        data-testid="server-app-status"
        data-mode={mode}
        role="status"
        style={{ margin: '8px 0 0', fontWeight: 700 }}
      >
        {status}
      </p>
      {log.length > 0 ? (
        <pre
          data-testid="server-app-log"
          style={{
            margin: '8px 0 0',
            padding: 8,
            fontSize: 12,
            maxHeight: 160,
            overflow: 'auto',
            background: 'var(--netlab-bg-surface)',
            borderRadius: 6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {log.join('\n')}
        </pre>
      ) : null}
      <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
        {t(
          'Your code runs in a separate worker of this page, with no network access of its own, and is stopped if a request takes over 1000 ms. It is kept only in this browser.',
          'コードはこのページの別のワーカーで動き、自分でネットワークにはアクセスできません。1 つの要求に 1000 ms 以上かかると止められます。コードはこのブラウザの中にだけ保存されます。',
        )}
      </p>
    </div>
  );
}
