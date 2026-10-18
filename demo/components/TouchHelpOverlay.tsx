import { useEffect } from 'react';

/**
 * Help for a touch screen.
 *
 * The shell's help button opened the keyboard shortcut list wherever it was
 * pressed; on a phone that is a list of keys the learner does not have. Where
 * the screen is touched, help says what to tap instead.
 */
export interface TouchHelpOverlayProps {
  open: boolean;
  onClose: () => void;
  locale: 'en' | 'ja';
}

const LINES: readonly { readonly en: string; readonly ja: string }[] = [
  {
    en: 'Tap a device on the diagram to open its details. Tap ✕ on that card to close it.',
    ja: '図の機器をタップすると、その機器の詳細が開きます。閉じるときは、そのカードの ✕ をタップします。',
  },
  {
    en: 'Tap the lesson’s own buttons, such as Send and Next Step. Next Step moves the packet on by one device.',
    ja: 'レッスンのボタン（「送る」や「次のステップ」など）をタップします。「次のステップ」で、パケットが機器 1 台ぶん進みます。',
  },
  {
    en: 'Tap a row of the timeline to see that moment on the diagram.',
    ja: 'タイムラインの行をタップすると、その時点の様子が図に出ます。',
  },
  {
    en: 'Under the diagram, + and − zoom in and out, and “fit” brings the whole network back on screen.',
    ja: '図の下の + と − で拡大・縮小し、「fit」でネットワーク全体を画面に戻します。',
  },
  {
    en: 'In the bar at the bottom, ⊞ goes back to all lessons, ▶ marks the lesson you are in, and ? opens this help.',
    ja: '下のバーの ⊞ でレッスン一覧に戻ります。▶ はいまのレッスン、? はこのヘルプです。',
  },
];

export function TouchHelpOverlay({ open, onClose, locale }: TouchHelpOverlayProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const say = (line: { en: string; ja: string }) => (locale === 'ja' ? line.ja : line.en);

  return (
    <div
      role="none"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'color-mix(in srgb, var(--netlab-bg-primary) 60%, transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        data-testid="touch-help"
        role="dialog"
        aria-modal="true"
        aria-label={locale === 'ja' ? '使い方' : 'How to use this page'}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(520px, calc(100% - 32px))',
          maxHeight: 'calc(100% - 64px)',
          overflow: 'auto',
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 12,
          padding: '16px 18px',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 15,
          lineHeight: 1.6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <strong style={{ fontSize: 16 }}>
            {locale === 'ja' ? '使い方（タッチ操作）' : 'How to use this page by touch'}
          </strong>
          <button
            type="button"
            data-testid="touch-help-close"
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              minWidth: 44,
              minHeight: 44,
              borderRadius: 8,
              border: '1px solid var(--netlab-border)',
              background: 'var(--netlab-bg-primary)',
              color: 'var(--netlab-text-primary)',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {locale === 'ja' ? '閉じる' : 'Close'}
          </button>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
          {LINES.map((line) => (
            <li key={line.en}>{say(line)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
