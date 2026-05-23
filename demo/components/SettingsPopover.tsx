import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
  NetlabAudience,
  NetlabCbSafe,
  NetlabContrast,
  NetlabDensity,
  NetlabPalette,
} from '../../src/theme';

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
  /** Optional label for the trigger button (defaults to `'Settings'`). */
  label?: string;
}

interface AxisOption<V extends string> {
  value: V;
  label: string;
}

const THEME_OPTIONS: AxisOption<GallerySettingsThemeMode>[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const PALETTE_OPTIONS: AxisOption<NetlabPalette>[] = [
  { value: 'studio', label: 'Studio (current)' },
  { value: 'academic', label: 'Academic muted' },
];

const DENSITY_OPTIONS: AxisOption<NetlabDensity>[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'standard', label: 'Standard' },
  { value: 'relaxed', label: 'Relaxed' },
];

const AUDIENCE_OPTIONS: AxisOption<NetlabAudience>[] = [
  { value: 'learner', label: 'Learner' },
  { value: 'pro', label: 'Pro' },
];

const CBSAFE_OPTIONS: AxisOption<NetlabCbSafe>[] = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
];

const CONTRAST_OPTIONS: AxisOption<NetlabContrast>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'more', label: 'More' },
];

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
                color: selected ? 'var(--netlab-accent-blue)' : 'var(--netlab-text-secondary)',
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

export function SettingsPopover({ settings, onChange, label = 'Settings' }: SettingsPopoverProps) {
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
        aria-label={label}
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
          aria-label={label}
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
            label="Mode"
            value={settings.themeMode}
            options={THEME_OPTIONS}
            onChange={(v) => update('themeMode', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-palette`}
            label="Palette"
            value={settings.palette}
            options={PALETTE_OPTIONS}
            onChange={(v) => update('palette', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-density`}
            label="Density"
            value={settings.density}
            options={DENSITY_OPTIONS}
            onChange={(v) => update('density', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-audience`}
            label="Audience"
            value={settings.audience}
            options={AUDIENCE_OPTIONS}
            onChange={(v) => update('audience', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-cbsafe`}
            label="Color-blind safe"
            value={settings.colorBlindSafe}
            options={CBSAFE_OPTIONS}
            onChange={(v) => update('colorBlindSafe', v)}
          />
          <AxisGroup
            groupName={`${popoverId}-contrast`}
            label="Contrast"
            value={settings.contrast}
            options={CONTRAST_OPTIONS}
            onChange={(v) => update('contrast', v)}
          />
        </div>
      )}
    </div>
  );
}

export const SETTINGS_POPOVER_ROLE: React.AriaRole = 'dialog';
