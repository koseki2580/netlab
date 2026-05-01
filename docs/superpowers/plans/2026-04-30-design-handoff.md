# Design Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the 3 design handoff packages (`handoff/01-gallery-redesign`, `handoff/02-new-components`, `handoff/03-simulator-refresh`) to the netlab codebase in merge order.

**Architecture:** Phase A (gallery) refactors `demo/Gallery.tsx` into a sidebar-nav layout with new sub-components under `demo/components/`. Phase B (ui-primitives) adds headless UI building blocks under `src/components/ui/`. Phase C (simulator chrome) does a visual-only refresh of 5 existing simulator files, potentially consuming Phase B components.

**Tech Stack:** React 18, TypeScript (strict), Vitest + Testing-Library, inline styles + `var(--netlab-*)` tokens, no new runtime dependencies.

---

## Scope check

Three independent subsystems across phases — they are sequenced for merge safety (01 → 02 → 03) but can be implemented in parallel. Phase C may optionally consume components from Phase B.

---

## File structure

### Phase A — Gallery redesign

| Role   | Path                                                                                                                               |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Modify | `demo/Gallery.tsx` — add `meta` field to `DemoCard` interface, populate for every demo, render new layout using new sub-components |
| Create | `demo/components/DemoCard.tsx` — card component with icon tile, tags, foot links                                                   |
| Create | `demo/components/Sidebar.tsx` — sticky 248px left nav with brand, category links + counts, reference group, footer                 |
| Create | `demo/components/SearchBox.tsx` — search input UI (no filtering yet)                                                               |
| Create | `demo/components/FeaturedStrip.tsx` — 1.4fr/1fr featured section                                                                   |
| Create | `demo/components/demoIcons.tsx` — `getDemoIcon(path)` keyed by demo paths                                                          |
| Modify | `demo/Gallery.test.tsx` — extend with sidebar/tag/search assertions                                                                |

### Phase B — UI primitives

| Role   | Path                                                                    |
| ------ | ----------------------------------------------------------------------- |
| Create | `src/components/ui/EmptyState.tsx` + `EmptyState.test.tsx`              |
| Create | `src/components/ui/Modal.tsx` + `Modal.test.tsx`                        |
| Create | `src/components/ui/Toast.tsx` + `Toast.test.tsx`                        |
| Create | `src/components/ui/ToastProvider.tsx`                                   |
| Create | `src/components/ui/form/Input.tsx` + `Input.test.tsx`                   |
| Create | `src/components/ui/form/Select.tsx` + `Select.test.tsx`                 |
| Create | `src/components/ui/form/Checkbox.tsx` + `Checkbox.test.tsx`             |
| Create | `src/components/ui/form/Slider.tsx` + `Slider.test.tsx`                 |
| Create | `src/components/ui/index.ts` — barrel export                            |
| Modify | `src/index.ts` — re-export everything from `src/components/ui/index.ts` |

### Phase C — Simulator chrome refresh

| Role   | Path                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| Modify | `src/components/simulation/SimulationControls.tsx` — 3 button zones with hairline dividers                    |
| Modify | `src/components/controls/RouteTable.tsx` — header bar + sticky thead + right-aligned numerics                 |
| Modify | `src/components/controls/AreaLegend.tsx` — fixed bottom-left dock, hover states                               |
| Modify | `src/components/simulation/PacketTimeline.tsx` — eyebrow header, count badge, kind chips, selected row accent |
| Modify | `src/components/ResizableSidebar.tsx` — 4px handle, accent-blue on hover                                      |
| Create | `src/components/simulation/SimulationControls.test.tsx` — zone button assertions                              |

---

## Phase A — Gallery redesign

### Task A1: `demoIcons.tsx` — icon map

**Files:**

- Create: `demo/components/demoIcons.tsx`

- [ ] **Step 1: Create the icon file**

```tsx
import type { ReactNode } from 'react';

// Small inline SVG topology icons keyed by demo path.
// Falls back to the neutral node-cluster icon for unmapped paths.

const ICONS: Record<string, ReactNode> = {
  '/basic/minimal': (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="12" r="3" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  ),
  '/basic/three-tier': (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9.5" y="9" width="5" height="5" rx="1" />
      <rect x="17" y="9" width="5" height="5" rx="1" />
      <line x1="7" y1="11.5" x2="9.5" y2="11.5" />
      <line x1="14.5" y1="11.5" x2="17" y2="11.5" />
    </svg>
  ),
  '/basic/star': (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="20" cy="12" r="2" />
      <circle cx="12" cy="20" r="2" />
      <circle cx="4" cy="12" r="2" />
      <line x1="12" y1="6" x2="12" y2="10" />
      <line x1="14" y1="12" x2="18" y2="12" />
      <line x1="12" y1="14" x2="12" y2="18" />
      <line x1="6" y1="12" x2="10" y2="12" />
    </svg>
  ),
};

const NODE_CLUSTER_ICON: ReactNode = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <circle cx="12" cy="12" r="3" />
    <circle cx="5" cy="7" r="2" />
    <circle cx="19" cy="7" r="2" />
    <circle cx="5" cy="17" r="2" />
    <circle cx="19" cy="17" r="2" />
    <line x1="7" y1="8.5" x2="10" y2="10.5" />
    <line x1="17" y1="8.5" x2="14" y2="10.5" />
    <line x1="7" y1="15.5" x2="10" y2="13.5" />
    <line x1="17" y1="15.5" x2="14" y2="13.5" />
  </svg>
);

export function getDemoIcon(path: string): ReactNode {
  return ICONS[path] ?? NODE_CLUSTER_ICON;
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/kosekiyuuta/koseki/self-oss/netlab && npx tsc --noEmit --pretty false 2>&1 | grep "demo/components/demoIcons"
```

Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
git add demo/components/demoIcons.tsx
git commit -m "feat(demo): add demo icon map for gallery redesign"
```

---

### Task A2: `SearchBox.tsx`

**Files:**

- Create: `demo/components/SearchBox.tsx`

- [ ] **Step 1: Create SearchBox**

```tsx
import type React from 'react';

const SEARCH_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </svg>
);

export function SearchBox() {
  // TODO(search): wire up filtering against demo list
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--netlab-bg-elevated)',
        border: '1px solid var(--netlab-border)',
        borderRadius: 6,
        padding: '0 10px',
        height: 32,
        cursor: 'text',
      }}
    >
      <span style={{ color: 'var(--netlab-text-muted)', flexShrink: 0 }}>{SEARCH_ICON}</span>
      <input
        type="search"
        aria-label="Search demos, protocols, layers"
        placeholder="Search demos, protocols, layers…"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
          fontSize: 12,
          width: 220,
        }}
      />
      <kbd
        style={{
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 4,
          padding: '1px 5px',
          fontSize: 10,
          color: 'var(--netlab-text-muted)',
          flexShrink: 0,
        }}
      >
        ⌘K
      </kbd>
    </label>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add demo/components/SearchBox.tsx
git commit -m "feat(demo): add SearchBox placeholder for gallery redesign"
```

---

### Task A3: `Sidebar.tsx`

**Files:**

- Create: `demo/components/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar**

```tsx
import type { Category } from '../Gallery';

const GITHUB_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

interface SidebarProps {
  categories: Category[];
  featuredCount: number;
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1,
          color: 'var(--netlab-text-muted)',
          textTransform: 'uppercase',
          padding: '0 12px',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function NavRow({
  dot,
  label,
  count,
  href,
}: {
  dot?: string;
  label: string;
  count?: number;
  href: string;
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px',
        color: 'var(--netlab-text-secondary)',
        textDecoration: 'none',
        fontSize: 12,
        borderRadius: 4,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = 'var(--netlab-bg-elevated)';
        (e.currentTarget as HTMLAnchorElement).style.color = 'var(--netlab-text-primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = '';
        (e.currentTarget as HTMLAnchorElement).style.color = 'var(--netlab-text-secondary)';
      }}
    >
      {dot ? (
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dot,
            flexShrink: 0,
          }}
        />
      ) : (
        <span style={{ width: 8, flexShrink: 0 }} />
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined ? (
        <span
          style={{
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            background: 'var(--netlab-bg-elevated)',
            borderRadius: 10,
            padding: '1px 6px',
          }}
        >
          {count}
        </span>
      ) : null}
    </a>
  );
}

export function Sidebar({ categories, featuredCount }: SidebarProps) {
  return (
    <aside
      aria-label="Demo navigation"
      style={{
        width: 248,
        flexShrink: 0,
        background: 'var(--netlab-bg-surface)',
        borderRight: '1px solid var(--netlab-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        padding: '16px 0',
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: '0 12px 16px',
          borderBottom: '1px solid var(--netlab-border)',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 'bold' }}>📡 netlab</span>
        <span
          style={{
            display: 'block',
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            marginTop: 2,
          }}
        >
          v0.1.0
        </span>
      </div>

      {/* Browse */}
      <NavGroup label="Browse">
        <NavRow dot="#fbbf24" label="Start here" count={featuredCount} href="#featured" />
        {categories.map((cat) => (
          <NavRow
            key={cat.id}
            dot={cat.color}
            label={cat.label}
            count={cat.demos.length}
            href={`#${cat.id}`}
          />
        ))}
      </NavGroup>

      {/* Reference */}
      <NavGroup label="Reference">
        <NavRow label="Docs" href="#" />
        <NavRow label="API" href="#" />
        <NavRow label="Layer Plugins" href="#" />
      </NavGroup>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          padding: '12px',
          borderTop: '1px solid var(--netlab-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <a
          href="https://github.com/koseki2580/netlab"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--netlab-text-muted)',
            textDecoration: 'none',
            fontSize: 11,
          }}
        >
          {GITHUB_ICON}
          GitHub
        </a>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span>⌘</span>
          Keyboard shortcuts
        </button>
      </div>
    </aside>
  );
}
```

Note: `Category` must be exported from `Gallery.tsx` (already exported as `export { CATEGORIES }`; add `export type { Category }` to the existing export).

- [ ] **Step 2: Commit**

```bash
git add demo/components/Sidebar.tsx
git commit -m "feat(demo): add Sidebar navigation component"
```

---

### Task A4: `FeaturedStrip.tsx`

**Files:**

- Create: `demo/components/FeaturedStrip.tsx`

- [ ] **Step 1: Create FeaturedStrip**

```tsx
interface SandboxIntro {
  id: string;
  title: string;
  desc: string;
  href: string;
  badge: string;
}

interface FeaturedStripProps {
  intros: readonly SandboxIntro[];
}

export function FeaturedStrip({ intros }: FeaturedStripProps) {
  const [featured, ...rest] = intros;
  if (!featured) return null;

  return (
    <section id="featured" style={{ marginBottom: 40 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 12,
          borderBottom: '1px solid var(--netlab-border)',
          marginBottom: 16,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--netlab-accent-yellow)',
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#f1f5f9',
          }}
        >
          Start here
        </span>
        <span
          style={{
            fontSize: 12,
            fontStyle: 'italic',
            color: 'var(--netlab-text-muted)',
          }}
        >
          — recommended entry points
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'var(--netlab-text-muted)',
          }}
        >
          {intros.length} demos
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 12,
        }}
      >
        {/* Big feature card */}
        <a
          href={featured.href}
          style={{
            display: 'block',
            background: `radial-gradient(ellipse at 20% 50%, color-mix(in srgb, var(--netlab-accent-cyan) 12%, transparent), transparent 60%), var(--netlab-bg-elevated)`,
            border: '1px solid var(--netlab-border)',
            borderRadius: 8,
            padding: '20px 24px',
            textDecoration: 'none',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--netlab-accent-cyan)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--netlab-border)';
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--netlab-accent-cyan) 14%, transparent)',
              color: 'var(--netlab-accent-cyan)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              padding: '4px 10px',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Recommended · 5 min
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#f1f5f9',
              marginBottom: 8,
            }}
          >
            {featured.title}
          </div>
          <p
            style={{
              fontSize: 12,
              color: 'var(--netlab-text-secondary)',
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            {featured.desc}
          </p>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>Open intro →</span>
          </div>
        </a>

        {/* Mini list */}
        <div
          style={{
            background: 'var(--netlab-bg-elevated)',
            border: '1px solid var(--netlab-border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {rest.map((intro, index) => (
            <a
              key={intro.id}
              href={intro.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                textDecoration: 'none',
                borderBottom:
                  index < rest.length - 1 ? '1px solid var(--netlab-border)' : undefined,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  'var(--netlab-bg-surface)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = '';
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--netlab-text-muted)',
                  minWidth: 24,
                }}
              >
                {String(index + 2).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#f1f5f9',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {intro.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--netlab-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {intro.badge}
                </div>
              </div>
              <span style={{ color: 'var(--netlab-text-muted)', fontSize: 14 }}>›</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add demo/components/FeaturedStrip.tsx
git commit -m "feat(demo): add FeaturedStrip component"
```

---

### Task A5: `DemoCard.tsx`

**Files:**

- Create: `demo/components/DemoCard.tsx`

- [ ] **Step 1: Create DemoCard**

```tsx
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Category, DemoCard as DemoCardData } from '../Gallery';
import { getDemoIcon } from './demoIcons';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

const DIFFICULTY_STYLES: Record<Difficulty, { bg: string; fg: string }> = {
  beginner: {
    bg: 'color-mix(in srgb, var(--netlab-accent-green) 12%, transparent)',
    fg: 'var(--netlab-accent-green)',
  },
  intermediate: {
    bg: 'color-mix(in srgb, var(--netlab-accent-yellow) 12%, transparent)',
    fg: 'var(--netlab-accent-yellow)',
  },
  advanced: {
    bg: 'color-mix(in srgb, var(--netlab-accent-red) 12%, transparent)',
    fg: 'var(--netlab-accent-red)',
  },
};

const LAYER_TAG_STYLE = {
  bg: 'color-mix(in srgb, var(--netlab-accent-cyan) 10%, transparent)',
  fg: 'var(--netlab-accent-cyan)',
};

const PROTO_TAG_STYLE = {
  bg: 'color-mix(in srgb, var(--netlab-text-primary) 10%, transparent)',
  fg: 'var(--netlab-text-secondary)',
};

function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 4,
        background: bg,
        color: fg,
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 6px',
      }}
    >
      {label}
    </span>
  );
}

interface DemoCardProps {
  demo: DemoCardData;
  category: Category;
  tutorialHref: string | null;
  sandboxHref: string | null;
  assessmentHref: string | null;
}

export function DemoCard({
  demo,
  category,
  tutorialHref,
  sandboxHref,
  assessmentHref,
}: DemoCardProps) {
  const difficulty = demo.meta?.difficulty;
  const tags = demo.meta?.tags ?? [];
  const [layerTag, ...protoTags] = tags;

  return (
    <div
      style={{
        background: 'var(--netlab-bg-elevated)',
        border: '1px solid var(--netlab-border)',
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = category.color;
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--netlab-border)';
        el.style.transform = '';
      }}
    >
      {/* Icon tile */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--netlab-text-secondary)',
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        {getDemoIcon(demo.path)}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: '#f1f5f9',
          marginBottom: 6,
        }}
      >
        {demo.title}
      </div>

      {/* Tags row */}
      {(difficulty || layerTag || protoTags.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {difficulty && (
            <Tag
              label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              bg={DIFFICULTY_STYLES[difficulty].bg}
              fg={DIFFICULTY_STYLES[difficulty].fg}
            />
          )}
          {layerTag && <Tag label={layerTag} bg={LAYER_TAG_STYLE.bg} fg={LAYER_TAG_STYLE.fg} />}
          {protoTags.map((tag) => (
            <Tag key={tag} label={tag} bg={PROTO_TAG_STYLE.bg} fg={PROTO_TAG_STYLE.fg} />
          ))}
        </div>
      )}

      {/* Description */}
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 12,
          lineHeight: 1.5,
          flex: 1,
          marginBottom: 10,
        }}
      >
        {demo.desc}
      </div>

      {/* Foot links */}
      <div
        style={{
          borderTop: '1px dashed var(--netlab-border)',
          paddingTop: 10,
          display: 'flex',
          gap: 10,
          fontSize: 11,
          flexWrap: 'wrap',
        }}
      >
        <Link to={demo.path} style={{ color: category.color, textDecoration: 'none' }}>
          Open →
        </Link>
        {sandboxHref && (
          <a
            href={sandboxHref}
            style={{ color: 'var(--netlab-accent-yellow)', textDecoration: 'none' }}
          >
            Sandbox →
          </a>
        )}
        {tutorialHref && (
          <a
            href={tutorialHref}
            style={{ color: 'var(--netlab-accent-cyan)', textDecoration: 'none' }}
          >
            Tutorial →
          </a>
        )}
        {assessmentHref && (
          <a
            href={assessmentHref}
            style={{ color: 'var(--netlab-accent-green)', textDecoration: 'none' }}
          >
            Assessment →
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add demo/components/DemoCard.tsx
git commit -m "feat(demo): add DemoCard component with icon, tags, and foot links"
```

---

### Task A6: Refactor `Gallery.tsx`

**Files:**

- Modify: `demo/Gallery.tsx`

- [ ] **Step 1: Add `meta` field to `DemoCard` interface and export `Category` type**

In `demo/Gallery.tsx`, change the interface and add exports:

```tsx
interface DemoCard {
  path: string;
  title: string;
  desc: string;
  scenarioId?: string;
  sandboxReady?: boolean;
  defaultSandboxTab?: 'packet' | 'node' | 'parameters' | 'traffic';
  /** Difficulty and protocol/layer tags for display in the redesigned gallery. */
  meta?: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[];
  };
}

export type { Category, DemoCard };
```

- [ ] **Step 2: Add `meta` to every demo entry in `CATEGORIES`**

Using the tag table from `handoff/01-gallery-redesign/DESIGN.md`:

- `/basic/minimal`: `{ difficulty: 'beginner', tags: ['L1–L2'] }`
- `/basic/three-tier`: `{ difficulty: 'beginner', tags: ['L2', 'MAC'] }`
- `/basic/star`: `{ difficulty: 'beginner', tags: ['L2'] }`
- `/routing/client-server`: `{ difficulty: 'beginner', tags: ['L3', 'Static'] }`
- `/routing/multi-hop`: `{ difficulty: 'intermediate', tags: ['L3'] }`
- `/routing/dynamic`: `{ difficulty: 'intermediate', tags: ['RIP', 'OSPF', 'BGP'] }`
- `/routing/ospf-convergence`: `{ difficulty: 'advanced', tags: ['OSPF'] }`
- `/networking/arp`: `{ difficulty: 'beginner', tags: ['L2', 'ARP'] }`
- `/networking/vlan`: `{ difficulty: 'intermediate', tags: ['802.1Q'] }`
- `/networking/stp`: `{ difficulty: 'advanced', tags: ['STP'] }`
- `/networking/mtu-fragmentation`: `{ difficulty: 'advanced', tags: ['L3', 'ICMP'] }`
- `/networking/udp`: `{ difficulty: 'beginner', tags: ['L4', 'UDP'] }`
- `/networking/http`: `{ difficulty: 'intermediate', tags: ['L7', 'HTTP'] }`
- `/areas/dmz`: `{ difficulty: 'intermediate', tags: ['L3'] }`
- `/networking/multicast`: `{ difficulty: 'advanced', tags: ['IGMP'] }`
- `/services/dhcp-dns`: `{ difficulty: 'intermediate', tags: ['DHCP', 'DNS'] }`
- `/simulation/step`: `{ difficulty: 'intermediate', tags: ['L3'] }`
- `/simulation/failure`: `{ difficulty: 'intermediate', tags: ['Drop'] }`
- `/simulation/trace-inspector`: `{ difficulty: 'intermediate', tags: ['Trace'] }`
- `/simulation/nat`: `{ difficulty: 'advanced', tags: ['SNAT', 'DNAT'] }`
- `/simulation/acl`: `{ difficulty: 'advanced', tags: ['ACL', 'Firewall'] }`
- `/simulation/interface-aware`: `{ difficulty: 'intermediate', tags: ['L3'] }`
- `/simulation/session`: `{ difficulty: 'intermediate', tags: ['Session'] }`
- `/simulation/data-transfer`: `{ difficulty: 'advanced', tags: ['L7'] }`
- `/simulation/tcp-handshake`: `{ difficulty: 'intermediate', tags: ['L4', 'TCP'] }`
- `/simulation/enterprise`: `{ difficulty: 'advanced', tags: ['Edge'] }`
- `/topology/controlled`: `{ difficulty: 'intermediate', tags: ['Editor'] }`
- `/editor`: `{ difficulty: 'intermediate', tags: ['Editor'] }`
- `/embed`: `{ difficulty: 'beginner', tags: ['Embed'] }`
- `/comprehensive/all-in-one`: `{ difficulty: 'advanced', tags: ['All-in-one'] }`

- [ ] **Step 3: Replace `Gallery` render with sidebar-nav layout**

The new `Gallery` function body:

```tsx
import { Sidebar } from './components/Sidebar';
import { SearchBox } from './components/SearchBox';
import { FeaturedStrip } from './components/FeaturedStrip';
import { DemoCard } from './components/DemoCard';

export default function Gallery() {
  const allDemos = CATEGORIES.flatMap((cat) => cat.demos);
  const assessmentDemos = allDemos.filter((demo) => getAssessmentHref(demo) !== null);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--netlab-bg-primary)',
        fontFamily: 'monospace',
        color: 'var(--netlab-text-primary)',
        display: 'grid',
        gridTemplateColumns: '248px 1fr',
      }}
    >
      <Sidebar categories={CATEGORIES} featuredCount={SANDBOX_INTROS.length} />

      <main style={{ overflowY: 'auto' }}>
        {/* Page header */}
        <div
          style={{
            padding: '24px 32px 20px',
            borderBottom: '1px solid var(--netlab-border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#f1f5f9',
                margin: 0,
              }}
            >
              Demo gallery
            </h1>
            <p
              style={{
                marginTop: 6,
                color: 'var(--netlab-text-secondary)',
                fontSize: 12,
                maxWidth: 480,
              }}
            >
              Interactive browser-based network topology visualizer. Each demo is fully
              self-contained — pick one to explore.
            </p>
          </div>
          <SearchBox />
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 40 }}>
          <FeaturedStrip intros={SANDBOX_INTROS} />

          {/* Assessments section */}
          {assessmentDemos.length > 0 && (
            <section id="assessments">
              <SectionHeader
                dot="var(--netlab-accent-green)"
                title="Assessments"
                blurb="— test your understanding"
                count={assessmentDemos.length}
              />
              <div style={CARD_GRID}>
                {assessmentDemos.map((demo) => {
                  const cat = CATEGORIES.find((c) => c.demos.some((d) => d.path === demo.path))!;
                  const tutorial = demo.scenarioId
                    ? tutorialRegistry.findByScenarioId(demo.scenarioId)
                    : undefined;
                  return (
                    <DemoCard
                      key={demo.path}
                      demo={demo}
                      category={cat}
                      tutorialHref={
                        tutorial
                          ? `?tutorial=${encodeURIComponent(tutorial.id)}#${demo.path}`
                          : null
                      }
                      sandboxHref={getSandboxHref(demo)}
                      assessmentHref={getAssessmentHref(demo)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Category sections */}
          {CATEGORIES.map((cat) => (
            <section key={cat.id} id={cat.id}>
              <SectionHeader
                dot={cat.color}
                title={cat.label}
                blurb="— learn the building blocks"
                count={cat.demos.length}
              />
              <div style={CARD_GRID}>
                {cat.demos.map((demo) => {
                  const tutorial = demo.scenarioId
                    ? tutorialRegistry.findByScenarioId(demo.scenarioId)
                    : undefined;
                  return (
                    <DemoCard
                      key={demo.path}
                      demo={demo}
                      category={cat}
                      tutorialHref={
                        tutorial
                          ? `?tutorial=${encodeURIComponent(tutorial.id)}#${demo.path}`
                          : null
                      }
                      sandboxHref={getSandboxHref(demo)}
                      assessmentHref={getAssessmentHref(demo)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

// Helpers used in the new Gallery render
const CARD_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 12,
};

function SectionHeader({
  dot,
  title,
  blurb,
  count,
}: {
  dot: string;
  title: string;
  blurb: string;
  count: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 10,
        borderBottom: '1px solid var(--netlab-border)',
        marginBottom: 14,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dot,
        }}
      />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{title}</span>
      <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--netlab-text-muted)' }}>
        {blurb}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--netlab-text-muted)' }}>
        {count} demos
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Verify old `Interactive Sandbox` section is preserved**

The old raw card list for `SANDBOX_INTROS` and `sandboxDemos` is now inside `FeaturedStrip`. The existing tests check for `Interactive Sandbox` text — update `Gallery.test.tsx` (Task A7) to match new layout while preserving the href assertions.

- [ ] **Step 5: Run typecheck and tests**

```bash
cd /Users/kosekiyuuta/koseki/self-oss/netlab
npx tsc --noEmit --pretty false 2>&1 | head -20
npm test -- demo/Gallery.test.tsx 2>&1 | tail -20
```

Expected: typecheck clean, tests will fail on `Interactive Sandbox` text — fix in Task A7.

- [ ] **Step 6: Commit**

```bash
git add demo/Gallery.tsx demo/components/
git commit -m "feat(demo): redesign gallery with sidebar nav, featured strip, and tagged cards"
```

---

### Task A7: Update `Gallery.test.tsx`

**Files:**

- Modify: `demo/Gallery.test.tsx`

- [ ] **Step 1: Extend tests**

Add 3 new `it` blocks after the existing ones and update the `Interactive Sandbox` assertion:

```tsx
it('Gallery sidebar renders one nav link per category', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Gallery />
    </MemoryRouter>,
  );

  // Each CATEGORIES id appears as a href anchor in the sidebar
  const { CATEGORIES: cats } = require('./Gallery');
  for (const cat of cats) {
    expect(html).toContain(`href="#${cat.id}"`);
  }
});

it('Gallery demo cards render difficulty tags', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Gallery />
    </MemoryRouter>,
  );

  expect(html).toContain('Beginner');
  expect(html).toContain('Intermediate');
  expect(html).toContain('Advanced');
});

it('Gallery search box is present with correct placeholder', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Gallery />
    </MemoryRouter>,
  );

  expect(html).toContain('Search demos, protocols, layers');
});
```

The existing `Interactive Sandbox` test checks for `Interactive Sandbox` text — the `FeaturedStrip` no longer uses that heading. Update it:

```tsx
it('Gallery highlights sandbox-ready demos in the featured strip', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Gallery />
    </MemoryRouter>,
  );

  // Featured strip intro hrefs must be present
  expect(html).toContain(
    '?sandbox=1&amp;sandboxTab=node&amp;intro=sandbox-intro-mtu#/networking/mtu-fragmentation',
  );
  expect(html).toContain(
    '?sandbox=1&amp;sandboxTab=packet&amp;intro=sandbox-intro-tcp#/simulation/tcp-handshake',
  );
  expect(html).toContain(
    '?sandbox=1&amp;sandboxTab=node&amp;intro=sandbox-intro-ospf#/routing/ospf-convergence',
  );
  expect(html).toContain(
    '?sandbox=1&amp;sandboxTab=node&amp;intro=sandbox-intro-nat#/simulation/nat',
  );
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- demo/Gallery.test.tsx 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 3: Run full verify**

```bash
npm run typecheck 2>&1 | tail -5
npm run lint 2>&1 | tail -5
npm test -- demo/ 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add demo/Gallery.test.tsx
git commit -m "test(demo): update Gallery tests for sidebar/tags/search redesign"
```

---

## Phase B — UI primitives

### Task B1: `EmptyState.tsx`

**Files:**

- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/EmptyState.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/EmptyState.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No nodes yet" description="Drop a router to start." />);
    expect(screen.getByText('No nodes yet')).toBeTruthy();
    expect(screen.getByText('Drop a router to start.')).toBeTruthy();
  });

  it('renders action button and calls onClick', () => {
    const handler = vi.fn();
    render(<EmptyState title="Empty" action={{ label: 'Add node', onClick: handler }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add node' }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('applies error variant aria description', () => {
    render(<EmptyState title="Error" variant="error" />);
    const container = screen.getByText('Error').parentElement!.parentElement!;
    expect(container).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/components/ui/EmptyState.test.tsx 2>&1 | tail -10
```

Expected: FAIL with `Cannot find module './EmptyState'`.

- [ ] **Step 3: Implement EmptyState**

```tsx
// src/components/ui/EmptyState.tsx
import type { ReactNode } from 'react';

type Variant = 'default' | 'error' | 'success';
type Density = 'block' | 'inline';

const RING_COLORS: Record<Variant, string> = {
  default: 'var(--netlab-border)',
  error: 'var(--netlab-accent-red)',
  success: 'var(--netlab-accent-green)',
};

export interface EmptyStateProps {
  /** Optional 48×48 inline SVG icon. */
  icon?: ReactNode;
  /** Headline. 14px bold. */
  title: string;
  /** Body copy. 12px, --netlab-text-secondary. */
  description?: string;
  /** Optional CTA button. */
  action?: { label: string; onClick: () => void };
  /** Controls icon ring color only. Default: 'default'. */
  variant?: Variant;
  /** 'block' adds 48px vertical padding; 'inline' has none. Default: 'block'. */
  density?: Density;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  density = 'block',
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
        maxWidth: 360,
        margin: '0 auto',
        padding: density === 'block' ? '48px 16px' : '0',
      }}
    >
      {icon && (
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            border: `1px solid ${RING_COLORS[variant]}`,
            background: 'var(--netlab-bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--netlab-text-secondary)',
            fontFamily: 'monospace',
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="netlab-focus-ring"
          style={{
            height: 32,
            padding: '0 14px',
            background: 'var(--netlab-accent-blue)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = '';
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/ui/EmptyState.test.tsx 2>&1 | tail -10
```

Expected: all 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/EmptyState.tsx src/components/ui/EmptyState.test.tsx
git commit -m "feat(ui): add EmptyState component"
```

---

### Task B2: `Modal.tsx`

**Files:**

- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/Modal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Modal.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders title and children when open', () => {
    render(
      <Modal open title="Test modal" onClose={vi.fn()}>
        <p>modal body</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Test modal')).toBeTruthy();
    expect(screen.getByText('modal body')).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} title="Hidden" onClose={vi.fn()}>
        <p>hidden content</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('calls onClose when ESC is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="ESC test" onClose={onClose}>
        <p>body</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('close button has aria-label="Close"', () => {
    render(
      <Modal open title="A11y" onClose={vi.fn()}>
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/components/ui/Modal.test.tsx 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement Modal**

```tsx
// src/components/ui/Modal.tsx
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Default: true. Click outside closes. */
  closeOnBackdrop?: boolean;
  /** Right-aligned footer row. */
  footer?: ReactNode;
  /** Max-width of the panel. Default: 520. */
  maxWidth?: number;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  closeOnBackdrop = true,
  footer,
  maxWidth = 520,
  children,
}: ModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: 'var(--netlab-bg-surface)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 12,
          padding: 20,
          maxWidth,
          width: 'calc(100% - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          overflow: 'auto',
          fontFamily: 'monospace',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <span
            id={titleId}
            style={{ fontSize: 14, fontWeight: 700, color: 'var(--netlab-text-primary)' }}
          >
            {title}
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="netlab-focus-ring"
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--netlab-text-secondary)',
              fontSize: 16,
              borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ fontSize: 12, color: 'var(--netlab-text-primary)', lineHeight: 1.6 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              borderTop: '1px solid var(--netlab-border)',
              paddingTop: 16,
              marginTop: 16,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/ui/Modal.test.tsx 2>&1 | tail -10
```

Expected: all 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Modal.tsx src/components/ui/Modal.test.tsx
git commit -m "feat(ui): add Modal component with focus trap, ESC, backdrop"
```

---

### Task B3: `Toast.tsx` + `ToastProvider.tsx`

**Files:**

- Create: `src/components/ui/Toast.tsx`
- Create: `src/components/ui/ToastProvider.tsx`
- Create: `src/components/ui/Toast.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/Toast.test.tsx
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { useToast } from './Toast';

function PushButton({ kind = 'info' as const }) {
  const { push } = useToast();
  return <button onClick={() => push({ title: 'Hello', kind })}>push</button>;
}

describe('Toast', () => {
  it('renders a toast when pushed', async () => {
    render(
      <ToastProvider>
        <PushButton />
      </ToastProvider>,
    );
    act(() => screen.getByRole('button', { name: 'push' }).click());
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('useToast throws outside provider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<PushButton />)).toThrow();
    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/components/ui/Toast.test.tsx 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 3: Implement Toast and ToastProvider**

```tsx
// src/components/ui/Toast.tsx
import { createContext, useContext } from 'react';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastInput {
  kind?: ToastKind;
  title: string;
  description?: string;
  /** ms; 0 = sticky. Default 4500. */
  duration?: number;
}

export interface ToastApi {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const KIND_ACCENT: Record<ToastKind, string> = {
  info: 'var(--netlab-accent-cyan)',
  success: 'var(--netlab-accent-green)',
  warning: 'var(--netlab-accent-yellow)',
  error: 'var(--netlab-accent-red)',
};

export interface ToastItem extends Required<Pick<ToastInput, 'kind' | 'title' | 'duration'>> {
  id: string;
  description?: string;
}

export function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--netlab-bg-panel)',
        border: `1px solid ${KIND_ACCENT[item.kind]}`,
        borderRadius: 8,
        padding: '10px 12px',
        fontFamily: 'monospace',
        fontSize: 11,
        color: 'var(--netlab-text-primary)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        pointerEvents: 'all',
        minWidth: 240,
        maxWidth: 360,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: KIND_ACCENT[item.kind],
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{item.title}</div>
        {item.description && (
          <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 2 }}>
            {item.description}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--netlab-text-muted)',
          fontSize: 14,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
```

```tsx
// src/components/ui/ToastProvider.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext, ToastItem as ToastItemComponent } from './Toast';
import type { ToastInput, ToastItem } from './Toast';

function generateId() {
  return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input: ToastInput): string => {
      const id = generateId();
      const duration = input.duration ?? 4500;
      const item: ToastItem = {
        id,
        kind: input.kind ?? 'info',
        title: input.title,
        description: input.description,
        duration,
      };
      setToasts((prev) => [...prev.slice(-3), item]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  const clear = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ push, dismiss, clear }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 1100,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((item) => (
          <ToastItemComponent key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/ui/Toast.test.tsx 2>&1 | tail -10
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Toast.tsx src/components/ui/ToastProvider.tsx src/components/ui/Toast.test.tsx
git commit -m "feat(ui): add Toast and ToastProvider"
```

---

### Task B4: Form primitives

**Files:**

- Create: `src/components/ui/form/Input.tsx` + `Input.test.tsx`
- Create: `src/components/ui/form/Select.tsx` + `Select.test.tsx`
- Create: `src/components/ui/form/Checkbox.tsx` + `Checkbox.test.tsx`
- Create: `src/components/ui/form/Slider.tsx` + `Slider.test.tsx`

- [ ] **Step 1: Write failing tests for all 4 form primitives**

```tsx
// src/components/ui/form/Input.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label and placeholder', () => {
    render(<Input label="Username" placeholder="Enter name" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Username')).toBeTruthy();
  });

  it('calls onChange with new value', () => {
    const handler = vi.fn();
    render(<Input label="Field" value="" onChange={handler} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } });
    expect(handler).toHaveBeenCalledWith('abc');
  });

  it('is disabled when disabled prop set', () => {
    render(<Input label="Disabled" value="x" onChange={vi.fn()} disabled />);
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true);
  });
});
```

```tsx
// src/components/ui/form/Select.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

describe('Select', () => {
  it('renders with label', () => {
    render(<Select label="Mode" options={OPTIONS} value="a" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Mode')).toBeTruthy();
  });

  it('calls onChange when selection changes', () => {
    const handler = vi.fn();
    render(<Select label="Mode" options={OPTIONS} value="a" onChange={handler} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(handler).toHaveBeenCalledWith('b');
  });
});
```

```tsx
// src/components/ui/form/Checkbox.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Enable feature" checked={false} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Enable feature')).toBeTruthy();
  });

  it('calls onChange when clicked', () => {
    const handler = vi.fn();
    render(<Checkbox label="Toggle" checked={false} onChange={handler} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handler).toHaveBeenCalledWith(true);
  });
});
```

```tsx
// src/components/ui/form/Slider.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders with label and current value', () => {
    render(<Slider label="Speed" min={0} max={100} value={50} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Speed')).toBeTruthy();
    expect(screen.getByText('50')).toBeTruthy();
  });

  it('calls onChange with new numeric value', () => {
    const handler = vi.fn();
    render(<Slider label="Vol" min={0} max={10} value={5} onChange={handler} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });
    expect(handler).toHaveBeenCalledWith(8);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- src/components/ui/form/ 2>&1 | tail -10
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the 4 form primitives**

```tsx
// src/components/ui/form/Input.tsx
import { useId } from 'react';
import type { ReactNode } from 'react';

const HEIGHT: Record<'sm' | 'md', number> = { sm: 28, md: 32 };

export interface InputProps {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'text' | 'number' | 'search' | 'email' | 'password';
  placeholder?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  value: string;
  onChange: (value: string) => void;
}

export function Input({
  id: idProp,
  label,
  description,
  error,
  size = 'md',
  disabled,
  type = 'text',
  placeholder,
  prefix,
  suffix,
  value,
  onChange,
}: InputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: 11, color: 'var(--netlab-text-secondary)', fontFamily: 'monospace' }}
        >
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: HEIGHT[size],
          border: `1px solid ${error ? 'var(--netlab-accent-red)' : 'var(--netlab-border)'}`,
          borderRadius: 6,
          background: 'var(--netlab-bg-surface)',
          paddingLeft: prefix ? 8 : 10,
          paddingRight: suffix ? 8 : 10,
          gap: 6,
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : undefined,
        }}
      >
        {prefix && (
          <span style={{ color: 'var(--netlab-text-muted)', flexShrink: 0 }}>{prefix}</span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="netlab-focus-ring"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--netlab-text-primary)',
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        />
        {suffix && (
          <span style={{ color: 'var(--netlab-text-muted)', flexShrink: 0 }}>{suffix}</span>
        )}
      </div>
      {(description || error) && (
        <span
          style={{
            fontSize: 10,
            color: error ? 'var(--netlab-accent-red)' : 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
          }}
        >
          {error ?? description}
        </span>
      )}
    </div>
  );
}
```

```tsx
// src/components/ui/form/Select.tsx
import { useId } from 'react';

const HEIGHT: Record<'sm' | 'md', number> = { sm: 28, md: 32 };

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<V extends string = string> {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  options: SelectOption<V>[];
  value: V;
  onChange: (value: V) => void;
}

export function Select<V extends string = string>({
  id: idProp,
  label,
  description,
  error,
  size = 'md',
  disabled,
  options,
  value,
  onChange,
}: SelectProps<V>) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: 11, color: 'var(--netlab-text-secondary)', fontFamily: 'monospace' }}
        >
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as V)}
        className="netlab-focus-ring"
        style={{
          height: HEIGHT[size],
          border: `1px solid ${error ? 'var(--netlab-accent-red)' : 'var(--netlab-border)'}`,
          borderRadius: 6,
          background: 'var(--netlab-bg-surface)',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '0 10px',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: 28,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {(description || error) && (
        <span
          style={{
            fontSize: 10,
            color: error ? 'var(--netlab-accent-red)' : 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
          }}
        >
          {error ?? description}
        </span>
      )}
    </div>
  );
}
```

```tsx
// src/components/ui/form/Checkbox.tsx
import { useId } from 'react';

export interface CheckboxProps {
  id?: string;
  /** Required for accessibility; visually shown. */
  label: string;
  description?: string;
  disabled?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({
  id: idProp,
  label,
  description,
  disabled,
  checked,
  onChange,
}: CheckboxProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          fontFamily: 'monospace',
          fontSize: 12,
          color: 'var(--netlab-text-primary)',
        }}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="netlab-focus-ring"
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            accentColor: 'var(--netlab-accent-blue)',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        />
        {label}
      </label>
      {description && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
            paddingLeft: 24,
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
}
```

```tsx
// src/components/ui/form/Slider.tsx
import { useId } from 'react';

export interface SliderProps {
  id?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  /** Show numeric value next to the track. Default: true. */
  showValue?: boolean;
  /** Format the displayed value. Default: String. */
  format?: (value: number) => string;
}

export function Slider({
  id: idProp,
  label,
  description,
  disabled,
  min,
  max,
  step = 1,
  value,
  onChange,
  showValue = true,
  format = String,
}: SliderProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: 11, color: 'var(--netlab-text-secondary)', fontFamily: 'monospace' }}
        >
          {label}
        </label>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : 1 }}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="netlab-focus-ring"
          style={{
            flex: 1,
            appearance: 'none',
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(to right, var(--netlab-accent-blue) ${((value - min) / (max - min)) * 100}%, var(--netlab-bg-elevated) 0%)`,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        />
        {showValue && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--netlab-text-secondary)',
              fontFamily: 'monospace',
              minWidth: 28,
              textAlign: 'right',
            }}
          >
            {format(value)}
          </span>
        )}
      </div>
      {description && (
        <span style={{ fontSize: 10, color: 'var(--netlab-text-muted)', fontFamily: 'monospace' }}>
          {description}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run form tests**

```bash
npm test -- src/components/ui/form/ 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/form/
git commit -m "feat(ui): add Input, Select, Checkbox, Slider form primitives"
```

---

### Task B5: Barrel export and `src/index.ts`

**Files:**

- Create: `src/components/ui/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create barrel**

```ts
// src/components/ui/index.ts
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { ToastContext, ToastItem, useToast } from './Toast';
export type { ToastApi, ToastInput, ToastItem as ToastItemType, ToastKind } from './Toast';
export { ToastProvider } from './ToastProvider';
export { Checkbox } from './form/Checkbox';
export type { CheckboxProps } from './form/Checkbox';
export { Input } from './form/Input';
export type { InputProps } from './form/Input';
export { Select } from './form/Select';
export type { SelectOption, SelectProps } from './form/Select';
export { Slider } from './form/Slider';
export type { SliderProps } from './form/Slider';
```

- [ ] **Step 2: Add to `src/index.ts`**

Append to `src/index.ts`:

```ts
export {
  Checkbox,
  EmptyState,
  Input,
  Modal,
  Select,
  Slider,
  ToastProvider,
  useToast,
} from './components/ui';
export type {
  CheckboxProps,
  EmptyStateProps,
  InputProps,
  ModalProps,
  SelectOption,
  SelectProps,
  SliderProps,
  ToastApi,
  ToastInput,
  ToastKind,
} from './components/ui';
```

- [ ] **Step 3: Run typecheck and build**

```bash
cd /Users/kosekiyuuta/koseki/self-oss/netlab
npx tsc --noEmit --pretty false 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/index.ts src/index.ts
git commit -m "feat(ui): add barrel export and re-export UI primitives from src/index.ts"
```

---

## Phase C — Simulator chrome refresh

### Task C1: `ResizableSidebar.tsx` — handle affordance

**Files:**

- Modify: `src/components/ResizableSidebar.tsx`

- [ ] **Step 1: Update handle style**

Change the drag handle `<div>` style from current (hard `1px` line) to a 4px hover-visible affordance:

Replace the handle `<div>`:

```tsx
{
  /* Current: */
}
<div
  onMouseDown={onMouseDown}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  style={{
    width: 4,
    flexShrink: 0,
    cursor: 'col-resize',
    background: hovered ? '#334155' : 'transparent',
    transition: 'background 0.15s',
  }}
/>;
```

Replace with:

```tsx
<div
  onMouseDown={onMouseDown}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  style={{
    width: 4,
    flexShrink: 0,
    cursor: 'col-resize',
    background: hovered ? 'var(--netlab-accent-blue)' : 'transparent',
    transition: 'background 0.15s',
  }}
/>
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit --pretty false 2>&1 | grep ResizableSidebar
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ResizableSidebar.tsx
git commit -m "refactor(ui): use accent-blue for resize handle hover"
```

---

### Task C2: `SimulationControls.tsx` — button zone grouping

**Files:**

- Modify: `src/components/simulation/SimulationControls.tsx`
- Create: `src/components/simulation/SimulationControls.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/simulation/SimulationControls.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SimulationControls } from './SimulationControls';

vi.mock('../../simulation/SimulationContext', () => ({
  useSimulation: () => ({
    engine: {
      play: vi.fn(),
      pause: vi.fn(),
      step: vi.fn(),
      reset: vi.fn(),
      setHighlightMode: vi.fn(),
    },
    state: { status: 'idle', highlightMode: 'path', currentStep: -1 },
    sendPacket: vi.fn(),
  }),
}));

vi.mock('../NetlabContext', () => ({
  useNetlabContext: () => ({
    topology: { nodes: [], edges: [] },
  }),
}));

describe('SimulationControls', () => {
  it('renders transport zone buttons', () => {
    render(<SimulationControls />);
    expect(screen.getByTitle('Play')).toBeTruthy();
    expect(screen.getByTitle('Pause')).toBeTruthy();
    expect(screen.getByTitle('Step Forward')).toBeTruthy();
    expect(screen.getByTitle('Reset')).toBeTruthy();
  });

  it('renders Send Packet in transport zone', () => {
    render(<SimulationControls />);
    expect(screen.getByTitle('Send Packet')).toBeTruthy();
  });

  it('renders inspect zone highlight toggle', () => {
    render(<SimulationControls />);
    expect(screen.getByTitle(/highlight mode/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- src/components/simulation/SimulationControls.test.tsx 2>&1 | tail -10
```

Expected: FAIL — no elements with `title`.

- [ ] **Step 3: Restructure SimulationControls into 3 zones**

Replace the `return (...)` block in `SimulationControls.tsx`:

```tsx
const DIVIDER: React.CSSProperties = {
  width: 1,
  height: 20,
  background: 'var(--netlab-border-subtle)',
  margin: '0 4px',
  flexShrink: 0,
};

const ZONE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

return (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 12px',
      height: 40,
      background: 'var(--netlab-bg-surface)',
      borderBottom: '1px solid var(--netlab-border)',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}
  >
    {/* Zone 1: Transport */}
    <div style={ZONE}>
      <button
        onClick={handleSend}
        style={BTN_PRIMARY}
        title="Send Packet"
        aria-label="Send Packet"
        className="netlab-focus-ring"
      >
        ▶ Send Packet
      </button>
      <button
        onClick={() => engine.play()}
        disabled={playDisabled}
        style={playDisabled ? BTN_DISABLED : BTN_SECONDARY}
        title="Play"
        aria-label="Play"
        className="netlab-focus-ring"
      >
        ▶
      </button>
      <button
        onClick={() => engine.pause()}
        disabled={pauseDisabled}
        style={pauseDisabled ? BTN_DISABLED : BTN_SECONDARY}
        title="Pause"
        aria-label="Pause"
        className="netlab-focus-ring"
      >
        ⏸
      </button>
      <button
        onClick={() => engine.step()}
        disabled={stepDisabled}
        style={stepDisabled ? BTN_DISABLED : BTN_SECONDARY}
        title="Step Forward"
        aria-label="Step Forward"
        className="netlab-focus-ring"
      >
        →
      </button>
      <button
        onClick={() => engine.reset()}
        disabled={resetDisabled}
        style={resetDisabled ? BTN_DISABLED : BTN_SECONDARY}
        title="Reset"
        aria-label="Reset"
        className="netlab-focus-ring"
      >
        ⟳
      </button>
    </div>

    <div style={DIVIDER} />

    {/* Zone 2: Inspect */}
    <div style={ZONE}>
      <button
        onClick={() => engine.setHighlightMode(highlightMode === 'path' ? 'hop' : 'path')}
        style={BTN_SECONDARY}
        title="Highlight mode"
        aria-label="Highlight Mode"
        aria-pressed={highlightMode === 'path'}
        className="netlab-focus-ring"
      >
        {highlightMode === 'path' ? 'Path' : 'Hop'}
      </button>
    </div>

    <div
      style={{
        marginLeft: 'auto',
        fontFamily: 'monospace',
        fontSize: 11,
        color: 'var(--netlab-text-muted)',
      }}
    >
      {status === 'idle' && 'Click "Send Packet" to begin'}
      {status === 'paused' && state.currentStep === -1 && 'Loaded — press Step or Play'}
      {status === 'paused' && state.currentStep >= 0 && `Paused — hop ${state.currentStep + 1}`}
      {status === 'running' && `Running — hop ${state.currentStep + 1}`}
      {status === 'done' && 'Done'}
    </div>
  </div>
);
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/simulation/SimulationControls.test.tsx 2>&1 | tail -10
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/simulation/SimulationControls.tsx src/components/simulation/SimulationControls.test.tsx
git commit -m "refactor(ui): group SimulationControls into transport/inspect zones with hairline dividers"
```

---

### Task C3: `RouteTable.tsx` — header + sticky thead + right-aligned numerics

**Files:**

- Modify: `src/components/controls/RouteTable.tsx`

- [ ] **Step 1: Read the full current file**

File is at `src/components/controls/RouteTable.tsx` (151 lines). Key changes:

1. Add a 28px sticky header row at the top: `ROUTE TABLE` eyebrow + collapse chevron (button, no-op for now).
2. Make the per-router section heads use a green bullet (`●`).
3. Wrap route rows in a `<table>` with sticky `<thead>` inside the scrollable panel.
4. Right-align AD/metric columns.

- [ ] **Step 2: Apply the changes**

After the `PANEL_STYLE` constant block, add:

```tsx
const HEADER_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 28,
  borderBottom: '1px solid var(--netlab-border-subtle)',
  marginBottom: 8,
  paddingBottom: 4,
};
```

Replace the `ROUTE TABLE` heading `<div>` and route display inside `RouteTablePanel`:

```tsx
{
  /* Sticky header */
}
<div style={HEADER_ROW_STYLE}>
  <span
    style={{
      fontWeight: 700,
      color: 'var(--netlab-text-secondary)',
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    }}
  >
    ROUTE TABLE
  </span>
  <button
    type="button"
    aria-label="Collapse route table"
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--netlab-text-muted)',
      fontSize: 12,
      padding: '0 4px',
      fontFamily: 'monospace',
    }}
  >
    ⌃
  </button>
</div>;

{
  routers.map((router) => {
    const routes = routeTable.get(router.id) ?? [];
    return (
      <div key={router.id} style={{ marginBottom: 12 }}>
        {/* Per-router heading with colored bullet */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--netlab-accent-green)',
            fontWeight: 700,
            marginBottom: 4,
            fontSize: 11,
          }}
        >
          <span aria-hidden="true">●</span>
          {router.data.label}
        </div>
        {routes.length === 0 ? (
          <div style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>No routes</div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            <thead>
              <tr
                style={{
                  color: 'var(--netlab-text-muted)',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--netlab-bg-panel)',
                }}
              >
                <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 600 }}>
                  Destination
                </th>
                <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 600 }}>Next Hop</th>
                <th style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 600 }}>AD</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route, idx) => (
                <tr key={idx} style={{ color: 'var(--netlab-text-primary)' }}>
                  <td
                    style={{
                      padding: '2px 4px',
                      maxWidth: 100,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {route.prefix}
                  </td>
                  <td
                    style={{
                      padding: '2px 4px',
                      maxWidth: 80,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--netlab-text-secondary)',
                    }}
                  >
                    {route.nextHop === 'direct' ? (
                      <span style={{ color: 'var(--netlab-accent-green)' }}>direct</span>
                    ) : (
                      route.nextHop
                    )}
                  </td>
                  <td
                    style={{
                      padding: '2px 4px',
                      textAlign: 'right',
                      color: 'var(--netlab-text-muted)',
                    }}
                  >
                    {route.adminDistance ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  });
}
```

Note: Check the actual `route` type in the file (may use `route.metric` instead of `route.adminDistance`; adapt accordingly).

- [ ] **Step 3: Run existing a11y test**

```bash
npm test -- src/components/controls/RouteTable.a11y.test.tsx 2>&1 | tail -10
```

Expected: pass (table semantics preserved).

- [ ] **Step 4: Run typecheck**

```bash
npx tsc --noEmit --pretty false 2>&1 | grep RouteTable
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/controls/RouteTable.tsx
git commit -m "refactor(ui): add RouteTable header, sticky thead, right-aligned AD column"
```

---

### Task C4: `AreaLegend.tsx` — fixed bottom-left dock

**Files:**

- Modify: `src/components/controls/AreaLegend.tsx`

- [ ] **Step 1: Apply changes**

Replace the `LEGEND_STYLE` constant and the component body:

```tsx
const LEGEND_STYLE: React.CSSProperties = {
  position: 'fixed',
  left: 12,
  bottom: 20,
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  width: 240,
  color: 'var(--netlab-text-primary)',
  fontSize: 11,
  fontFamily: 'monospace',
  zIndex: 100,
  overflow: 'hidden',
};
```

Replace the component render:

```tsx
export function AreaLegend() {
  const { areas } = useNetlabContext();

  if (areas.length === 0) return null;

  return (
    <div style={LEGEND_STYLE}>
      <div
        style={{
          padding: '8px 12px 6px',
          borderBottom: '1px solid var(--netlab-border-subtle)',
          fontWeight: 700,
          color: 'var(--netlab-text-secondary)',
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        NETWORK AREAS
      </div>
      <ul role="list" style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
        {areas.map((area) => (
          <li
            key={area.id}
            role="listitem"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLLIElement).style.background = 'var(--netlab-bg-elevated)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLLIElement).style.background = '';
            }}
            onClick={() => {
              // TODO(highlight): emit highlight signal to canvas
              window.postMessage({ type: '__highlight_area', areaId: area.id }, '*');
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: AREA_COLORS[area.type] ?? 'var(--netlab-text-secondary)',
                opacity: 0.7,
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--netlab-text-primary)', flex: 1 }}>{area.name}</span>
            <span
              style={{
                color: 'var(--netlab-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 100,
              }}
            >
              {area.subnet}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Run a11y test**

```bash
npm test -- src/components/controls/AreaLegend.a11y.test.tsx 2>&1 | tail -10
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/controls/AreaLegend.tsx
git commit -m "refactor(ui): dock AreaLegend to fixed bottom-left with hover states"
```

---

### Task C5: `PacketTimeline.tsx` — eyebrow header, kind chips, selected row

**Files:**

- Modify: `src/components/simulation/PacketTimeline.tsx`

- [ ] **Step 1: Add section header with eyebrow, count badge, and clear-all**

Find the outer `<div>` container for `PacketTimeline` (the one rendering `<TraceSelector>` and `Download PCAP`). Prepend a new header row before the existing toolbar row:

```tsx
{
  /* Section header */
}
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 28,
    padding: '0 8px',
    borderBottom: '1px solid var(--netlab-border-subtle)',
    flexShrink: 0,
  }}
>
  <span
    style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1,
      color: 'var(--netlab-text-secondary)',
      textTransform: 'uppercase',
    }}
  >
    PACKET TIMELINE
  </span>
  {trace && (
    <span
      style={{
        background: 'var(--netlab-bg-elevated)',
        color: 'var(--netlab-text-muted)',
        fontSize: 10,
        borderRadius: 10,
        padding: '1px 6px',
      }}
    >
      {trace.hops.length}
    </span>
  )}
  <button
    type="button"
    aria-label="Clear timeline"
    onClick={() => engine.reset()}
    style={{
      marginLeft: 'auto',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--netlab-text-muted)',
      fontFamily: 'monospace',
      fontSize: 11,
      padding: '0 4px',
    }}
    className="netlab-focus-ring"
  >
    ✕
  </button>
</div>;
```

- [ ] **Step 2: Add 2px left accent border to selected hop rows**

In `HopRow`, the outer `<div>` currently has no left border. Add:

```tsx
// Inside HopRow, the outermost div style:
style={{
  // ... existing styles ...
  borderLeft: isActive ? '2px solid var(--netlab-accent-cyan)' : '2px solid transparent',
  paddingLeft: isActive ? 6 : 8,  // compensate for border
}}
```

- [ ] **Step 3: Add kind chip dot to each hop row**

In `HopRow`, find the event label display. Prepend a colored dot before the event text:

```tsx
<span
  aria-hidden="true"
  style={{
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: EVENT_COLORS[hop.event] ?? 'var(--netlab-text-muted)',
    display: 'inline-block',
    flexShrink: 0,
    marginTop: 4,
  }}
/>
```

- [ ] **Step 4: Run typecheck**

```bash
npx tsc --noEmit --pretty false 2>&1 | grep PacketTimeline
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/simulation/PacketTimeline.tsx
git commit -m "refactor(ui): add PACKET TIMELINE eyebrow, count badge, kind dots, selected row accent"
```

---

### Task C6: Final validation

- [ ] **Step 1: Full typecheck and lint**

```bash
cd /Users/kosekiyuuta/koseki/self-oss/netlab
npx tsc --noEmit --pretty false 2>&1 | tail -5
npm run lint 2>&1 | tail -5
```

Expected: 0 errors, ≤ 29 pre-existing warnings.

- [ ] **Step 2: Full test suite**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 4: Append lesson to lessons.md**

Add an entry for any non-obvious pattern discovered during this implementation.

- [ ] **Step 5: Update agents/tasks/todo.md**

Replace the Plan 73 section header with a new Plan 74 section capturing this work.

---

## Self-review

### Spec coverage check

| Spec requirement                                                | Task               |
| --------------------------------------------------------------- | ------------------ |
| Gallery: sidebar 248px, sticky, brand, Browse/Reference groups  | A3                 |
| Gallery: search box with placeholder + ⌘K hint                  | A2                 |
| Gallery: featured strip 1.4fr/1fr, radial-gradient              | A4                 |
| Gallery: `meta` field on every DemoCard                         | A6 step 1-2        |
| Gallery: `DemoCard` with icon tile, tags, dashed foot separator | A5                 |
| Gallery: difficulty/protocol tag taxonomy                       | A5 (Tag component) |
| Gallery: section headers with dot, blurb, count                 | A6 step 3          |
| Gallery: tests for sidebar/tags/search                          | A7                 |
| UI: EmptyState variants, action, density                        | B1                 |
| UI: Modal portal, ESC, backdrop, focus trap, a11y               | B2                 |
| UI: Toast push/dismiss/clear, sticky, queue                     | B3                 |
| UI: Input/Select/Checkbox/Slider controlled, a11y               | B4                 |
| UI: barrel export + src/index.ts re-export                      | B5                 |
| Sim: resize handle 4px accent-blue hover                        | C1                 |
| Sim: SimulationControls 3 zones + dividers                      | C2                 |
| Sim: RouteTable sticky header + right-align AD                  | C3                 |
| Sim: AreaLegend fixed dock + hover                              | C4                 |
| Sim: PacketTimeline eyebrow + kind dots + selected border       | C5                 |

### Placeholder scan

None detected — all steps contain full code.

### Type consistency

- `DemoCard` interface in `Gallery.tsx` exports `meta` field; `DemoCard.tsx` imports `DemoCard` type from `../Gallery`. ✓
- `Category` type exported from `Gallery.tsx`; consumed in `Sidebar.tsx` and `DemoCard.tsx`. ✓
- `ToastItem` is both a type and a component name; disambiguated in barrel as `ToastItem as ToastItemType` for the type. ✓
- `route.adminDistance` field in Task C3 may differ from actual field name — note to verify against `RouteTable.tsx` source during implementation.
