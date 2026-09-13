import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
  NetlabAudience,
  NetlabCbSafe,
  NetlabContrast,
  NetlabDensity,
  NetlabPalette,
} from '../../src/theme';
import { useT } from '../localeContext';

/** English first, Japanese second — see `useT`. */
type Translate = (en: string, ja: string) => string;

export type GallerySettingsThemeMode = 'dark' | 'light';

export interface GallerySettings {
  themeMode: GallerySettingsThemeMode;
  palette: NetlabPalette;
  density: NetlabDensity;
  audience: NetlabAudience;
  colorBlindSafe: NetlabCbSafe;
  contrast: NetlabContrast;
}

export interface SettingsPopoverProps {
  settings: GallerySettings;
  onChange: (next: GallerySettings) => void;
  /** Optional label for the trigger button (defaults to the translated "Settings"). */
  label?: string;
}

interface AxisOption<V extends string> {
  value: V;
  label: string;
}

function themeOptions(t: Translate): AxisOption<GallerySettingsThemeMode>[] {
  return [
    { value: 'dark', label: t('Dark', 'ダーク') },
    { value: 'light', label: t('Light', 'ライト') },
  ];
}

function paletteOptions(t: Translate): AxisOption<NetlabPalette>[] {
  return [
    { value: 'studio', label: t('Studio (current)', 'スタジオ（既定）') },
    { value: 'academic', label: t('Academic muted', '落ち着いた配色') },
  ];
}

function densityOptions(t: Translate): AxisOption<NetlabDensity>[] {
  return [
    { value: 'compact', label: t('Compact', 'せまい') },
    { value: 'standard', label: t('Standard', 'ふつう') },
    { value: 'relaxed', label: t('Relaxed', 'ひろい') },
  ];
}

function audienceOptions(t: Translate): AxisOption<NetlabAudience>[] {
  return [
    { value: 'learner', label: t('Learner', '学習者') },
    { value: 'pro', label: t('Pro', '実務者') },
  ];
}

function cbsafeOptions(t: Translate): AxisOption<NetlabCbSafe>[] {
  return [
    { value: 'off', label: t('Off', 'オフ') },
    { value: 'on', label: t('On', 'オン') },
  ];
}

function contrastOptions(t: Translate): AxisOption<NetlabContrast>[] {
  return [
    { value: 'normal', label: t('Normal', 'ふつう') },
    { value: 'more', label: t('More', '高める') },
  ];
}

const GEAR_ICON = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

function AxisGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  groupName,
}: {
  label: string;
  options: AxisOption<V>[];
  value: V;
  onChange: (next: V) => void;
  groupName: string;
}) {
  return (
    <fieldset
      style={{
        border: '1px solid var(--netlab-border)',
        borderRadius: 8,
        padding: '8px 10px',
        margin: 0,
        background: 'color-mix(in srgb, var(--netlab-bg-surface) 90%, var(--netlab-bg-elevated))',
      }}
    >
      <legend
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          color: 'var(--netlab-text-muted)',
          textTransform: 'uppercase',
          padding: '0 4px',
        }}
      >
        {label}
      </legend>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <label
              key={opt.value}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                // Darkened blue (vs raw accent) so the selected label clears
                // WCAG AA on its light blue-tinted background.
                color: selected
                  ? 'color-mix(in srgb, var(--netlab-accent-blue) 45%, var(--netlab-text-primary))'
                  : 'var(--netlab-text-secondary)',
                background: selected
                  ? 'color-mix(in srgb, var(--netlab-accent-blue) 16%, transparent)'
                  : 'transparent',
                border: `1px solid ${
                  selected
                    ? 'color-mix(in srgb, var(--netlab-accent-blue) 32%, var(--netlab-border))'
                    : 'var(--netlab-border)'
                }`,
              }}
            >
              <input
                type="radio"
                name={groupName}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SettingsPopover({ settings, onChange, label }: SettingsPopoverProps) {
  const t = useT();
  const trigger = label ?? t('Settings', '表示設定');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const update = useCallback(
    <K extends keyof GallerySettings>(key: K, value: GallerySettings[K]) => {
      onChange({ ...settings, [key]: value });
    },
    [settings, onChange],
  );

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-label={trigger}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 8,
          background: 'var(--netlab-bg-surface)',
          color: 'var(--netlab-text-secondary)',
          border: '1px solid var(--netlab-border)',
          cursor: 'pointer',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
        }}
      >
        {GEAR_ICON}
        <span>{label}</span>
      </button>
      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={trigger}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 30,
            width: 280,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            borderRadius: 12,
            background: 'var(--netlab-bg-surface)',
            border: '1px solid var(--netlab-border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
          }}
        >
          <AxisGroup
            groupName={`${popoverId}-theme`}
            label={t('Mode', '表示')}
            value={settings.themeMode}
            options={themeOptions(t)}
            onChange={(v) => update('themeMode', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-palette`}
            label={t('Palette', '配色')}
            value={settings.palette}
            options={paletteOptions(t)}
            onChange={(v) => update('palette', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-density`}
            label={t('Density', '文字と余白')}
            value={settings.density}
            options={densityOptions(t)}
            onChange={(v) => update('density', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-audience`}
            label={t('Audience', '対象')}
            value={settings.audience}
            options={audienceOptions(t)}
            onChange={(v) => update('audience', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-cbsafe`}
            label={t('Color-blind safe', '色覚に配慮')}
            value={settings.colorBlindSafe}
            options={cbsafeOptions(t)}
            onChange={(v) => update('colorBlindSafe', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-contrast`}
            label={t('Contrast', 'コントラスト')}
            value={settings.contrast}
            options={contrastOptions(t)}
            onChange={(v) => update('contrast', v)}
          />
        </div>
      )}
    </div>
  );
}

export const SETTINGS_POPOVER_ROLE: React.AriaRole = 'dialog';
