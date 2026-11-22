import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import type { AppSandbox } from '../../src/terminal/serverApp/appSandbox';
import type { ServerApp } from '../../src/terminal/types';
import { useViewport } from '../../src/utils/useViewport';
import { LESSON_BUTTON, LESSON_CARD, LESSON_LABEL, lessonChoice } from '../components/lessonStyles';
import { useGalleryLocale, useT } from '../localeContext';

/** Where this viewer's app code is kept: this browser only, never the page address (REQ-416). */
const STORAGE_KEY = 'netlab-terminal-www-app';

/** The starter app, its comments in the reader's language; the code is the same in both. */
export function starterApp(locale: 'en' | 'ja'): string {
  const ja = locale === 'ja';
  return `${ja ? '// www の Web サーバです。起動してから、端末で次を打ってください：' : "// www's web server. Press Start, then in the terminal:"}
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

${ja ? '// 約 3 KB：1 つの TCP セグメント（最大 1400 バイト）には収まりません。' : '// About 3 KB: more than one TCP segment (at most 1400 bytes each).'}
app.get('/big', (req, res) => {
  const lines = [];
  for (let i = 1; i <= 60; i += 1) lines.push('line ' + String(i).padStart(2, '0') + ' ' + '-'.repeat(40));
  res.set('Content-Type', 'text/plain').send(lines.join('\\n'));
});
`;
}

/** True when the code is the starter, in either language: nothing of the learner's would be lost. */
function isStarter(code: string): boolean {
  return code === starterApp('en') || code === starterApp('ja');
}

function readCode(locale: 'en' | 'ja'): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? starterApp(locale);
  } catch {
    return starterApp(locale);
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
  cardRef,
}: {
  /** Called with the app while it runs, and with null when www should not answer. */
  onChange: (mode: WwwMode, app: ServerApp | null) => void;
  /** The card's element, for the link beside the terminal that scrolls to it. */
  cardRef?: Ref<HTMLDivElement>;
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const phone = useViewport().isNarrow;
  const [code, setCode] = useState(() => readCode(locale));
  // The code the running app was started with: an edit applies only on Restart.
  const [runningCode, setRunningCode] = useState<string | null>(null);
  const [mode, setMode] = useState<WwwMode>('built-in');
  const [failed, setFailed] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const sandbox = useRef<AppSandbox | null>(null);
  // Escape then Tab leaves the editor; Tab alone indents.
  const escaped = useRef(false);
  const append = (lines: readonly string[]) =>
    setLog((previous) => [...previous, ...lines].slice(-40));

  useEffect(() => () => sandbox.current?.stop(), []);

  // The language switched: an untouched starter follows it (only its comments differ).
  useEffect(() => {
    const other = starterApp(locale === 'ja' ? 'en' : 'ja');
    const mine = starterApp(locale);
    setCode((current) => (current === other ? mine : current));
    setRunningCode((current) => (current === other ? mine : current));
  }, [locale]);

  const stop = (next: WwwMode) => {
    sandbox.current?.stop();
    sandbox.current = null;
    setRunningCode(null);
    setFailed(false);
    setMode(next);
    onChange(next, null);
  };

  const start = async () => {
    sandbox.current?.stop();
    saveCode(code);
    setLog([]);
    setFailed(false);
    const { createAppSandbox } = await import('../../src/terminal/serverApp/appSandbox');
    const created = createAppSandbox(code, { timeoutMs: 1000 });
    const loaded = await created.start();
    if (!loaded.ok) {
      // A syntax error's message is the engine's own text; the kind names it once.
      append(
        loaded.kind === 'stopped'
          ? [t('The app stopped.', 'アプリが止まりました。')]
          : [
              ...loaded.log,
              loaded.kind === 'syntax' ? `SyntaxError: ${loaded.message}` : loaded.message,
            ],
      );
      created.stop();
      sandbox.current = null;
      setRunningCode(null);
      setFailed(loaded.kind !== 'stopped');
      setMode('stopped');
      onChange('stopped', null);
      return;
    }
    append(loaded.log);
    sandbox.current = created;
    setRunningCode(code);
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
            setRunningCode(null);
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

  const dirty = mode === 'app' && runningCode !== null && code !== runningCode;

  const status =
    mode === 'app'
      ? t('Running on www, port 80', 'www の 80 番で動作中')
      : mode === 'stopped'
        ? failed
          ? t(
              'The code has an error and could not start.',
              'コードにエラーがあり、起動できませんでした。',
            )
          : t('Stopped: www refuses connections', '停止中：www は接続を受け付けません')
        : t('www serves its built-in pages', 'www は組み込みのページを返しています');

  const resetToStarter = () => {
    if (
      !isStarter(code) &&
      !window.confirm(
        t(
          'Replace your code with the starter code? Your changes will be lost.',
          '今のコードを最初のコードに置き換えますか？書き換えた部分は失われます。',
        ),
      )
    ) {
      return;
    }
    setCode(starterApp(locale));
  };

  // Tab indents by two spaces; Escape then Tab (or Shift+Tab) moves on, so the keyboard is never trapped.
  const onEditorKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const leaving = escaped.current;
    escaped.current = event.key === 'Escape';
    if (event.key !== 'Tab' || event.shiftKey || leaving) return;
    event.preventDefault();
    const editor = event.currentTarget;
    const { selectionStart, selectionEnd } = editor;
    setCode(`${code.slice(0, selectionStart)}  ${code.slice(selectionEnd)}`);
    requestAnimationFrame(() => editor.setSelectionRange(selectionStart + 2, selectionStart + 2));
  };

  return (
    <div ref={cardRef} style={LESSON_CARD} data-testid="server-app">
      {/* Not upper-cased: "WWW のサーバを書く" read as a different name. */}
      <div style={{ ...LESSON_LABEL, textTransform: 'none' }}>
        {t('Write www’s server', 'www のサーバを書く')}
      </div>
      <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
        {t(
          'Write the web server as an app in JavaScript, in the style of Express: app.get(path, (req, res) => …), with req.query, req.params, req.body and res.status, res.set, res.send, res.json. Start it and curl it from the client: the request and the response travel through the network, and a large response is split into segments.',
          'Web サーバを Express 風の JavaScript のアプリとして書きます。app.get(パス, (req, res) => …) の中で req.query・req.params・req.body と res.status・res.set・res.send・res.json が使えます。起動して client から curl すると、要求と応答がネットワークを通り、大きな応答はセグメントに分かれて届きます。',
        )}
      </p>
      <textarea
        data-testid="server-app-code"
        aria-label={t('www’s app code', 'www のアプリのコード')}
        aria-describedby="server-app-keys"
        value={code}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        onChange={(event) => setCode(event.target.value)}
        onKeyDown={onEditorKey}
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
          // Code is not wrapped: a long line scrolls sideways, as in an editor.
          whiteSpace: 'pre',
          overflowX: 'auto',
          ...(phone ? { minHeight: '40vh' } : {}),
        }}
      />
      <p
        id="server-app-keys"
        style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--netlab-text-secondary)' }}
      >
        {t(
          'Tab indents. To leave the editor: Escape, then Tab.',
          'Tab で字下げします。エディタから出るには Escape を押してから Tab を押します。',
        )}
      </p>
      {dirty ? (
        <p
          data-testid="server-app-dirty"
          role="status"
          style={{ margin: '8px 0 0', fontWeight: 700, color: 'var(--netlab-text-primary)' }}
        >
          {t(
            'Code changed — Restart to apply it.',
            'コードが変わりました。再起動すると反映されます。',
          )}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <button
          type="button"
          data-testid="server-app-start"
          style={lessonChoice(dirty)}
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
          onClick={resetToStarter}
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
      {mode === 'stopped' ? (
        <p
          data-testid="server-app-stopped-note"
          style={{ margin: '4px 0 0', lineHeight: 1.6, color: 'var(--netlab-text-secondary)' }}
        >
          {t(
            'Stopped: nothing listens on port 80, so curl is refused — yet ping still reaches www.',
            '停止中：80 番で待ち受けているものがないので curl は拒否されます。ping は www に届きます。',
          )}
        </p>
      ) : null}
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
