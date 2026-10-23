import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AudiencePill } from '../src/components/AudiencePill';
import { ProgressPanel } from '../src/components/progress/ProgressPanel';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { readUrlParam, useUrlParamSync } from '../src/hooks/useUrlParamSync';
import { scenarioRegistry, scenariosInGroup } from '../src/scenarios';
import {
  NETLAB_DARK_THEME,
  NETLAB_LIGHT_THEME,
  themeToVars,
  type NetlabAudience,
  type NetlabCbSafe,
  type NetlabContrast,
  type NetlabDensity,
  type NetlabPalette,
} from '../src/theme';
import { tutorialRegistry } from '../src/tutorials';
import { scrollToSection } from './hooks/scrollToSection';
import {
  ActiveFilters,
  aggregateTags,
  GalleryEmptyState,
  GalleryFilterControls,
  matchesFilters,
  useGalleryFilters,
  type DemoLike,
} from './galleryFilters';
import { CategoryLanding, type CategoryLandingDemo } from './components/CategoryLanding';
import { COURSE_STEPS, courseProgressId } from './course/courseSteps';
import './components/gallery.css';
import { CATEGORY_LABELS_JA, DEMO_COPY_JA } from './galleryJa';
import { LESSON_CATEGORIES, LESSONS, type Lesson } from './lessonManifest';
import { GalleryLocaleProvider, useT } from './localeContext';
import { LearningMap } from './components/LearningMap';
import { useLearningMap, type LearningTrackInput } from './hooks/useLearningMap';
import { DemoCard } from './components/DemoCard';
import { FeaturedStrip } from './components/FeaturedStrip';
import { SearchBox } from './components/SearchBox';
import { SettingsPopover, type GallerySettings } from './components/SettingsPopover';
import { Sidebar } from './components/Sidebar';

const GITHUB_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// GITHUB_ICON is kept for potential future use in Gallery layout
void GITHUB_ICON;

interface DemoCard {
  path: string;
  title: string;
  desc: string;
  scenarioId?: string;
  /** Progress completion id when it differs from scenarioId/path (drill cards). */
  progressId?: string;
  sandboxReady?: boolean;
  defaultSandboxTab?: 'packet' | 'node' | 'parameters' | 'traffic';
  /** Difficulty and protocol/layer tags for the redesigned gallery. */
  meta?: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[];
  };
}

interface Category {
  id: string;
  label: string;
  color: string;
  demos: DemoCard[];
}

/** A lesson as the gallery's card shows it. */
function cardFor(lesson: Lesson): DemoCard {
  return {
    path: lesson.path,
    title: lesson.title.en,
    desc: lesson.desc.en,
    ...(lesson.scenarioId && lesson.scenarioOnCard !== false
      ? { scenarioId: lesson.scenarioId }
      : {}),
    ...(lesson.progressId ? { progressId: lesson.progressId } : {}),
    ...(lesson.sandboxReady ? { sandboxReady: lesson.sandboxReady } : {}),
    ...(lesson.defaultSandboxTab ? { defaultSandboxTab: lesson.defaultSandboxTab } : {}),
    meta: {
      difficulty: lesson.difficulty,
      ...(lesson.tags ? { tags: [...lesson.tags] } : {}),
    },
  };
}

/** The gallery's categories and cards, from the lesson manifest. */
const CATEGORIES: Category[] = LESSON_CATEGORIES.map((category) => ({
  id: category.id,
  label: category.label,
  color: category.color,
  demos: (LESSONS as readonly Lesson[])
    .filter((lesson) => lesson.category === category.id)
    .map(cardFor),
}));

export { CATEGORIES };
export type { Category, DemoCard };

/**
 * Stable id used to look a card up in the progress provider. Drill cards
 * record completions under their own ids (`progressId`); scenario-backed
 * cards use the scenario id; everything else falls back to the route path.
 */
export function progressTargetIdFor(demo: DemoCard): string {
  return demo.progressId ?? demo.scenarioId ?? demo.path;
}

/**
 * Concept tracks for the learning map (C2) — derived from the gallery
 * categories, not authored by hand. Each category is a track; each demo a step
 * keyed by `progressTargetIdFor` so it lines up with the progress provider.
 */
/**
 * The learning map names every lesson, and it is learner-facing, so it follows
 * the chosen language: it used to be built once from the English catalogue, so
 * a Japanese reader met "Gateway HA And Link Aggregation" in their own gallery.
 */
function buildLearningTracks(locale: GalleryLocale): LearningTrackInput[] {
  // The course comes first: it is where a beginner starts, and each of its
  // steps records a completion, so finishing one moves this count.
  const course: LearningTrackInput = {
    id: 'course',
    name: locale === 'ja' ? '入門コース' : 'Getting started',
    steps: COURSE_STEPS.map((step) => ({
      id: courseProgressId(step.id),
      label: step.copy[locale].title,
      path: '/course',
      estMinutes: 2,
    })),
  };
  return [
    course,
    ...CATEGORIES.map((category) => ({
      id: category.id,
      name: locale === 'ja' ? (CATEGORY_LABELS_JA[category.id] ?? category.label) : category.label,
      steps: category.demos.map((demo) => ({
        id: progressTargetIdFor(demo),
        label: locale === 'ja' ? (DEMO_COPY_JA[demo.path]?.title ?? demo.title) : demo.title,
        path: demo.path,
        ...(demo.meta?.difficulty ? { difficulty: demo.meta.difficulty } : {}),
      })),
    })),
  ];
}

type GalleryThemeMode = 'light' | 'dark';
type GalleryLocale = 'en' | 'ja';

interface GalleryProps {
  initialQuery?: string;
  initialThemeMode?: GalleryThemeMode;
  initialActiveSectionId?: string;
  initialLocale?: GalleryLocale;
  /** Audience fallback when neither URL `?audience=` nor localStorage is set. */
  initialAudience?: NetlabAudience;
}

const GALLERY_LOCALE_KEY = 'netlab-locale';
const GALLERY_PALETTE_KEY = 'netlab-palette';
const GALLERY_DENSITY_KEY = 'netlab-density';
const GALLERY_AUDIENCE_KEY = 'netlab-audience';
const GALLERY_CBSAFE_KEY = 'nl_a11y_cbsafe';
const GALLERY_CONTRAST_KEY = 'nl_a11y_contrast';

const PALETTE_VALUES: readonly NetlabPalette[] = ['studio', 'academic'];
const DENSITY_VALUES: readonly NetlabDensity[] = ['compact', 'standard', 'relaxed'];
const AUDIENCE_VALUES: readonly NetlabAudience[] = ['learner', 'pro'];
const CBSAFE_VALUES: readonly NetlabCbSafe[] = ['off', 'on'];
const CONTRAST_VALUES: readonly NetlabContrast[] = ['normal', 'more'];

function isPalette(value: string | null): value is NetlabPalette {
  return value !== null && (PALETTE_VALUES as readonly string[]).includes(value);
}
function isDensity(value: string | null): value is NetlabDensity {
  return value !== null && (DENSITY_VALUES as readonly string[]).includes(value);
}
function isAudience(value: string | null): value is NetlabAudience {
  return value !== null && (AUDIENCE_VALUES as readonly string[]).includes(value);
}
function isCbsafe(value: string | null): value is NetlabCbSafe {
  return value !== null && (CBSAFE_VALUES as readonly string[]).includes(value);
}
function isContrast(value: string | null): value is NetlabContrast {
  return value !== null && (CONTRAST_VALUES as readonly string[]).includes(value);
}

function readStoredAxis<T extends string>(
  key: string,
  guard: (v: string | null) => v is T,
  fallback: T,
): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return guard(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function persistAxis(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage is optional for embedded/private contexts.
  }
}

/**
 * Remember an axis once the visitor changes it — never on the way in.
 *
 * Writing on mount recorded the default as though it had been chosen, and
 * since lessons honour these settings, merely opening the gallery would have
 * repainted every lesson. A preference nobody expressed is not a preference.
 */
function usePersistedAxis(key: string, value: string): void {
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current !== null && previous.current !== value) persistAxis(key, value);
    previous.current = value;
  }, [key, value]);
}

const GALLERY_COPY: Record<
  GalleryLocale,
  {
    themeEyebrow: Record<GalleryThemeMode, string>;
    title: string;
    body: string;
    localeLabel: string;
    demos: string;
    guidedIntros: string;
    assessments: string;
    sandboxReady: string;
    filteredFrom: string;
    courseEyebrow: string;
    courseTitle: string;
    courseBody: string;
    courseCta: string;
  }
> = {
  en: {
    themeEyebrow: {
      light: 'Light-mode demo index',
      dark: 'Dark-mode demo index',
    },
    title: 'Demo gallery',
    body: 'Browse packet-level intros, protocol drills, and full-stack topologies without the flat single-surface look. Each track now has its own visual layer so you can scan by category before opening a demo.',
    localeLabel: 'Language',
    demos: 'demos',
    guidedIntros: 'guided intros',
    assessments: 'assessments',
    sandboxReady: 'sandbox-ready',
    filteredFrom: 'filtered from',
    courseEyebrow: 'New here?',
    courseTitle: 'Start with the six-step course',
    courseBody:
      'Six small networks in order, one thing to do in each: a wire, a switch, why one network cannot reach another, and the router that joins them. About ten minutes.',
    courseCta: 'Start the course',
  },
  ja: {
    themeEyebrow: {
      light: 'はじめての方は下の入門コースから',
      dark: 'はじめての方は下の入門コースから',
    },
    title: 'デモギャラリー',
    body: 'パケット単位のイントロ、プロトコル演習、フルスタックのトポロジをカテゴリごとに見渡せます。デモを開く前に、学びたい領域をすばやく絞り込めます。',
    localeLabel: '言語',
    demos: '件のデモ',
    guidedIntros: '件のガイド',
    assessments: '件のアセスメント',
    sandboxReady: '件がサンドボックス対応',
    filteredFrom: '全件数',
    courseEyebrow: 'はじめての方へ',
    courseTitle: 'まずは6ステップの入門コースから',
    courseBody:
      '小さなネットワークを6つ、順番に見ていきます。各ステップでやることは1つだけです。ケーブル1本から始まり、スイッチ、ネットワークが違うと届かないこと、そしてそれをつなぐルータまで。10分ほどです。',
    courseCta: '入門コースを始める',
  },
};

function isGalleryLocale(value: string | null): value is GalleryLocale {
  return value === 'en' || value === 'ja';
}

function readStoredGalleryLocale(): GalleryLocale {
  if (typeof window === 'undefined') {
    return 'en';
  }
  try {
    const value = window.localStorage.getItem(GALLERY_LOCALE_KEY);
    return isGalleryLocale(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

const SANDBOX_DEMO_ORDER = new Map(
  [
    '/networking/mtu-fragmentation',
    '/simulation/tcp-handshake',
    '/routing/ospf-convergence',
    '/simulation/nat',
  ].map((path, index) => [path, index]),
);
// SANDBOX_DEMO_ORDER is preserved for downstream consumers and future use.
void SANDBOX_DEMO_ORDER;

const SANDBOX_INTROS = [
  {
    id: 'sandbox-intro-mtu',
    title: 'Start here: Sandbox intro',
    desc: 'Guided onboarding on the MTU demo: open the Node tab, lower an MTU, launch traffic, compare baseline and what-if, then continue exploring freely.',
    href: '?sandbox=1&sandboxTab=node&intro=sandbox-intro-mtu#/networking/mtu-fragmentation',
    badge: 'Start Here',
    titleJa: 'はじめに：サンドボックスの案内',
    descJa:
      'MTU のレッスンで操作を案内します。機器タブを開き、MTU を下げて通信を流し、元の状態と「もしも」の結果を比べてから、自由に試してください。',
    badgeJa: 'はじめに',
  },
  {
    id: 'sandbox-intro-tcp',
    title: 'TCP handshake intro',
    desc: 'Start a TCP handshake, edit the SYN into a reset, and observe why the connection never establishes.',
    href: '?sandbox=1&sandboxTab=packet&intro=sandbox-intro-tcp#/simulation/tcp-handshake',
    badge: 'Packet Edit',
    titleJa: 'TCP ハンドシェイクの案内',
    descJa:
      'TCP ハンドシェイクを始め、SYN をリセットに書き換えて、なぜ接続が確立しないのかを確かめます。',
    badgeJa: 'パケットの編集',
  },
  {
    id: 'sandbox-intro-ospf',
    title: 'OSPF convergence intro',
    desc: 'Disable a primary routed link, observe the backup path, add a static route, and confirm traffic converges.',
    href: '?sandbox=1&sandboxTab=node&intro=sandbox-intro-ospf#/routing/ospf-convergence',
    badge: 'Routing Edit',
    titleJa: 'OSPF の収束の案内',
    descJa:
      '主経路のリンクを止めて予備の経路を確かめ、静的経路を足して、通信が収束することを確かめます。',
    badgeJa: '経路の編集',
  },
  {
    id: 'sandbox-intro-nat',
    title: 'NAT intro',
    desc: 'Add a DNAT rule on the edge router, launch outside traffic, inspect translation, then remove the rule and retry.',
    href: '?sandbox=1&sandboxTab=node&intro=sandbox-intro-nat#/simulation/nat',
    badge: 'NAT Edit',
    titleJa: 'NAT の案内',
    descJa:
      '境界ルータに DNAT のルールを足して外からの通信を流し、変換を確かめてから、ルールを外してもう一度試します。',
    badgeJa: 'NAT の編集',
  },
] as const;

function getSandboxHref(demo: DemoCard): string | null {
  if (!demo.sandboxReady) {
    return null;
  }

  const params = new URLSearchParams({ sandbox: '1' });
  if (demo.defaultSandboxTab) {
    params.set('sandboxTab', demo.defaultSandboxTab);
  }
  return `?${params.toString()}#${demo.path}`;
}

function getAssessmentHref(demo: DemoCard): string | null {
  if (!demo.scenarioId) {
    return null;
  }
  const scenario = scenarioRegistry.get(demo.scenarioId);
  if (!scenario?.assessmentRubric) {
    return null;
  }

  const params = new URLSearchParams({
    assessment: demo.scenarioId,
    sandbox: '1',
    sandboxTab: 'assessment',
  });
  return `?${params.toString()}#${demo.path}`;
}

function getCompareHref(demo: DemoCard): string | null {
  if (!demo.scenarioId) return null;
  const group = scenarioRegistry.get(demo.scenarioId)?.topologyGroup;
  if (!group) return null;
  const sibling = scenariosInGroup(group).find(
    (scenario) => scenario.metadata.id !== demo.scenarioId,
  );
  return sibling ? `/compare/${demo.scenarioId}/${sibling.metadata.id}` : null;
}

function normalizeSearchText(parts: (string | undefined)[]): string {
  return parts
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(' ')
    .toLowerCase();
}

/**
 * The catalogue in the reader's language. Applied once, before anything else
 * reads it, so the cards, the search index, the learning map and the track
 * landings all speak the same language without each needing to know about it.
 * A lesson with no translation keeps its English text rather than vanishing.
 */
function localizeCategories(categories: Category[], locale: GalleryLocale): Category[] {
  if (locale !== 'ja') return categories;
  return categories.map((category) => ({
    ...category,
    label: CATEGORY_LABELS_JA[category.id] ?? category.label,
    demos: category.demos.map((demo) => {
      const translated = DEMO_COPY_JA[demo.path];
      return translated ? { ...demo, title: translated.title, desc: translated.desc } : demo;
    }),
  }));
}

function getDemoSearchText(category: Category, demo: DemoCard): string {
  return normalizeSearchText([
    category.label,
    demo.title,
    demo.desc,
    demo.scenarioId,
    demo.meta?.difficulty,
    ...(demo.meta?.tags ?? []),
  ]);
}

function getIntroSearchText(intro: (typeof SANDBOX_INTROS)[number]): string {
  return normalizeSearchText([intro.title, intro.desc, intro.badge, intro.href]);
}

const CARD_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))',
  gap: 16,
};

const SECTION_BLURBS: Record<string, string> = {
  assessments: 'Goal-driven sandbox checks and rubric-backed practice',
  basic: 'Foundational link, switch, and host behavior',
  routing: 'Path selection, route control, and convergence',
  areas: 'Segmentation, services, and protocol-specific network domains',
  services: 'Addressing and name-resolution workflows',
  simulation: 'Trace, failure, and stateful packet analysis tools',
  editor: 'Topology editing and controlled-state workflows',
  integration: 'Embedding and host-page integration examples',
  comprehensive: 'End-to-end workflows that combine multiple tools',
};

const SECTION_BLURBS_JA: Record<string, string> = {
  assessments: '目標を決めて試す、採点つきの練習',
  basic: 'リンク・スイッチ・ホストの基本の動き',
  routing: '経路の選び方、経路の制御、収束',
  areas: '区画分け、サービス、プロトコルごとの領域',
  services: 'アドレスの割り当てと名前解決',
  simulation: '通信の追跡、障害、状態を持つ解析',
  editor: 'トポロジの編集と、外部から制御する使い方',
  integration: '別のページへの埋め込み例',
  comprehensive: '複数の道具を組み合わせた一連の流れ',
};

function getSectionBlurb(sectionId: string, locale: GalleryLocale): string {
  if (locale === 'ja') {
    return SECTION_BLURBS_JA[sectionId] ?? 'このカテゴリのデモ';
  }
  return SECTION_BLURBS[sectionId] ?? 'Focused demos in this track';
}

/**
 * Category ids that render the new track landing (hero + recommended order)
 * instead of the legacy card grid. Other categories keep the card grid.
 */
const TRACK_LANDING_IDS = new Set(['routing']);

function demoToLandingDemo(demo: DemoCard): CategoryLandingDemo {
  const layerTag = demo.meta?.tags?.find((t) => /^L\d/.test(t));
  const out: CategoryLandingDemo = {
    id: progressTargetIdFor(demo),
    title: demo.title,
    desc: demo.desc,
    path: demo.path,
  };
  if (demo.meta?.difficulty) out.difficulty = demo.meta.difficulty;
  if (demo.sandboxReady) out.sandboxReady = true;
  if (layerTag) out.layer = layerTag;
  return out;
}

function getSectionSurfaceStyle(accent: string): React.CSSProperties {
  return {
    padding: '24px',
    borderRadius: 'var(--netlab-radius-lg)',
    border: `1px solid color-mix(in srgb, ${accent} 18%, var(--netlab-learning-surface-border))`,
    background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 6%, var(--netlab-bg-surface)) 0%, var(--netlab-bg-surface) 100%)`,
    boxShadow: 'var(--netlab-learning-shadow)',
  };
}

function getStatChipStyle(accent: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 'var(--netlab-radius-pill)',
    background: `color-mix(in srgb, ${accent} 10%, var(--netlab-bg-surface))`,
    border: `1px solid color-mix(in srgb, ${accent} 16%, var(--netlab-border))`,
    color: 'var(--netlab-text-primary)',
    fontSize: 11,
    fontWeight: 700,
  };
}

function ThemeModeToggle({
  themeMode,
  onChange,
}: {
  themeMode: GalleryThemeMode;
  onChange: (themeMode: GalleryThemeMode) => void;
}) {
  const t = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          color: 'var(--netlab-text-muted)',
          textTransform: 'uppercase',
        }}
      >
        {t('Theme', 'テーマ')}
      </span>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: 4,
          borderRadius: 'var(--netlab-radius-pill)',
          background: 'color-mix(in srgb, var(--netlab-bg-surface) 72%, var(--netlab-bg-primary))',
          border: '1px solid var(--netlab-border)',
        }}
      >
        {(['light', 'dark'] as const).map((mode) => {
          const isActive = themeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              data-testid={`gallery-theme-${mode}`}
              aria-pressed={isActive}
              onClick={() => onChange(mode)}
              style={{
                border: 'none',
                borderRadius: 'var(--netlab-radius-pill)',
                padding: '7px 12px',
                background: isActive
                  ? 'color-mix(in srgb, var(--netlab-accent-blue) 14%, var(--netlab-bg-surface))'
                  : 'transparent',
                color: isActive ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {mode === 'light' ? t('Light', 'ライト') : t('Dark', 'ダーク')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LocaleToggle({
  locale,
  label,
  onChange,
}: {
  locale: GalleryLocale;
  label: string;
  onChange: (locale: GalleryLocale) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          color: 'var(--netlab-text-muted)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: 4,
          borderRadius: 'var(--netlab-radius-pill)',
          background: 'color-mix(in srgb, var(--netlab-bg-surface) 72%, var(--netlab-bg-primary))',
          border: '1px solid var(--netlab-border)',
        }}
      >
        {(['en', 'ja'] as const).map((option) => {
          const isActive = locale === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isActive}
              data-testid={option === 'ja' ? 'gallery-locale-toggle-ja' : undefined}
              onClick={() => onChange(option)}
              style={{
                border: 'none',
                borderRadius: 'var(--netlab-radius-pill)',
                padding: '7px 12px',
                background: isActive
                  ? 'color-mix(in srgb, var(--netlab-accent-green) 14%, var(--netlab-bg-surface))'
                  : 'transparent',
                color: isActive ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {option === 'en' ? 'en' : '日本語'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  const t = useT();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 18,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          marginTop: 4,
          borderRadius: '50%',
          background: dot,
          boxShadow: `0 0 0 6px color-mix(in srgb, ${dot} 14%, white)`,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--netlab-text-primary)' }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--netlab-text-secondary)', marginTop: 4 }}>
          {blurb}
        </div>
      </div>
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: 'var(--netlab-text-secondary)',
          background: 'rgba(255, 255, 255, 0.72)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 'var(--netlab-radius-pill)',
          padding: '6px 10px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {count} {t('demos', '件')}
      </span>
    </div>
  );
}

export default function Gallery({
  initialQuery = '',
  initialThemeMode = 'light',
  initialActiveSectionId = 'featured',
  initialLocale,
  initialAudience = 'learner',
}: GalleryProps) {
  const {
    filters,
    debouncedQ,
    setQuery,
    toggleDifficulty,
    toggleTag,
    setSandboxOnly,
    clearAll,
    isEmpty: filtersEmpty,
  } = useGalleryFilters(initialQuery);
  const query = filters.q;
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<GalleryThemeMode>(() => {
    const fromUrl = readUrlParam('theme');
    if (fromUrl === 'dark' || fromUrl === 'light') return fromUrl;
    return readStoredAxis<GalleryThemeMode>(
      'netlab-theme-mode',
      (v): v is GalleryThemeMode => v === 'dark' || v === 'light',
      initialThemeMode,
    );
  });
  const [palette, setPalette] = useState<NetlabPalette>(() => {
    const fromUrl = readUrlParam('palette');
    if (isPalette(fromUrl)) return fromUrl;
    return readStoredAxis(GALLERY_PALETTE_KEY, isPalette, 'studio');
  });
  const [density, setDensity] = useState<NetlabDensity>(() => {
    const fromUrl = readUrlParam('density');
    if (isDensity(fromUrl)) return fromUrl;
    return readStoredAxis(GALLERY_DENSITY_KEY, isDensity, 'standard');
  });
  const [audience, setAudience] = useState<NetlabAudience>(() => {
    const fromUrl = readUrlParam('audience');
    if (isAudience(fromUrl)) return fromUrl;
    return readStoredAxis(GALLERY_AUDIENCE_KEY, isAudience, initialAudience);
  });
  const [colorBlindSafe, setColorBlindSafe] = useState<NetlabCbSafe>(() =>
    readStoredAxis(GALLERY_CBSAFE_KEY, isCbsafe, 'off'),
  );
  const [contrast, setContrast] = useState<NetlabContrast>(() =>
    readStoredAxis(GALLERY_CONTRAST_KEY, isContrast, 'normal'),
  );
  const [activeSectionId, setActiveSectionId] = useState(initialActiveSectionId);
  // On a phone the navigation is a drawer (see gallery.css): beside the
  // catalogue it took 248 of 390 pixels and left the cards a 94px column.
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<GalleryLocale>(
    () => initialLocale ?? readStoredGalleryLocale(),
  );
  const learningTracks = useMemo(() => buildLearningTracks(locale), [locale]);
  const learningMap = useLearningMap(learningTracks);
  const mainRef = useRef<HTMLElement | null>(null);
  const normalizedQuery = debouncedQ.trim().toLowerCase();
  const activeTheme = themeMode === 'dark' ? NETLAB_DARK_THEME : NETLAB_LIGHT_THEME;
  const copy = GALLERY_COPY[locale];
  // This component provides the locale context, so it cannot read it.
  const t = (en: string, ja: string) => (locale === 'ja' ? ja : en);

  // Two-way bind theme axes to URL params for shareable links.
  useUrlParamSync('theme', themeMode, { defaultValue: 'light' });
  useUrlParamSync('palette', palette, { defaultValue: 'studio' });
  useUrlParamSync('density', density, { defaultValue: 'standard' });
  useUrlParamSync('audience', audience, { defaultValue: 'learner' });

  // Persist axes to localStorage so demo visitors keep their prefs.
  usePersistedAxis('netlab-theme-mode', themeMode);
  usePersistedAxis(GALLERY_PALETTE_KEY, palette);
  usePersistedAxis(GALLERY_DENSITY_KEY, density);
  usePersistedAxis(GALLERY_AUDIENCE_KEY, audience);
  usePersistedAxis(GALLERY_CBSAFE_KEY, colorBlindSafe);
  usePersistedAxis(GALLERY_CONTRAST_KEY, contrast);

  const settings: GallerySettings = {
    themeMode,
    palette,
    density,
    audience,
    colorBlindSafe,
    contrast,
  };
  // Pressing a theme is a choice even when it is the one already showing. The
  // gallery opens light and a lesson opened with nothing stored is dark, so a
  // learner who pressed Light — already highlighted — and then opened a lesson
  // got a dark one: the press changed no state, so nothing was remembered.
  const chooseThemeMode = (mode: GalleryThemeMode) => {
    persistAxis('netlab-theme-mode', mode);
    setThemeMode(mode);
  };
  const handleSettingsChange = (next: GallerySettings) => {
    if (next.themeMode !== themeMode) chooseThemeMode(next.themeMode);
    if (next.palette !== palette) setPalette(next.palette);
    if (next.density !== density) setDensity(next.density);
    if (next.audience !== audience) setAudience(next.audience);
    if (next.colorBlindSafe !== colorBlindSafe) setColorBlindSafe(next.colorBlindSafe);
    if (next.contrast !== contrast) setContrast(next.contrast);
  };

  const localizedCategories = useMemo(() => localizeCategories(CATEGORIES, locale), [locale]);

  const filteredCategories = useMemo(() => {
    if (filtersEmpty) {
      return localizedCategories;
    }

    return localizedCategories
      .map((category) => ({
        ...category,
        demos: category.demos.filter((demo) =>
          matchesFilters(
            { ...demo, searchText: getDemoSearchText(category, demo) } as DemoLike,
            filters,
            debouncedQ,
          ),
        ),
      }))
      .filter((category) => category.demos.length > 0);
  }, [filtersEmpty, filters, debouncedQ, localizedCategories]);

  // Tag chips are aggregated over the full catalog so they stay stable
  // regardless of the currently applied filters.
  const allTags = useMemo(
    () => aggregateTags(CATEGORIES.flatMap((category) => category.demos as DemoLike[])),
    [],
  );

  const allDemos = filteredCategories.flatMap((cat) => cat.demos);
  const assessmentDemos = allDemos.filter((demo) => getAssessmentHref(demo) !== null);
  const sandboxDemos = allDemos.filter((demo) => demo.sandboxReady).length;
  const filteredIntros = useMemo(() => {
    if (!normalizedQuery) {
      return SANDBOX_INTROS;
    }

    return SANDBOX_INTROS.filter((intro) => getIntroSearchText(intro).includes(normalizedQuery));
  }, [normalizedQuery]);

  // Q9 — the guided-intro hero strip is learner-only; pro reaches tracks directly.
  const showHeroStrip = audience === 'learner' && filteredIntros.length > 0;
  // The sidebar lists the catalogue's categories as one group, whose counts
  // add up to the lessons the hero counts. The guided intros are not lessons of
  // the catalogue and the assessments are lessons already counted there, so
  // they sit in a group of their own rather than inflating that sum.
  const browseItems = useMemo(
    () =>
      filteredCategories.map((category) => ({
        id: category.id,
        label: category.label,
        color: category.color,
        count: category.demos.length,
      })),
    [filteredCategories],
  );
  const extraBrowseItems = useMemo(() => {
    const items: { id: string; label: string; color: string; count: number }[] = [];
    if (showHeroStrip) {
      items.push({
        id: 'featured',
        label: locale === 'ja' ? 'サンドボックスの案内' : 'Start here',
        color: 'var(--netlab-accent-yellow)',
        count: filteredIntros.length,
      });
    }
    if (assessmentDemos.length > 0) {
      items.push({
        id: 'assessments',
        label: (locale === 'ja' ? CATEGORY_LABELS_JA.assessments : undefined) ?? 'Assessments',
        color: 'var(--netlab-accent-green)',
        count: assessmentDemos.length,
      });
    }
    return items;
  }, [assessmentDemos.length, filteredIntros.length, locale, showHeroStrip]);

  // Page order: the catalogue, beginner categories first, then the extras.
  const visibleSectionIds = [...browseItems, ...extraBrowseItems].map((item) => item.id);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(GALLERY_LOCALE_KEY, locale);
    } catch {
      // Storage is optional for embedded/private contexts.
    }
  }, [locale]);

  useEffect(() => {
    if (visibleSectionIds.length === 0) {
      return;
    }
    if (!visibleSectionIds.includes(activeSectionId)) {
      const nextVisibleSectionId = visibleSectionIds[0];
      if (nextVisibleSectionId) {
        setActiveSectionId(nextVisibleSectionId);
      }
    }
  }, [activeSectionId, visibleSectionIds]);

  useEffect(() => {
    const container = mainRef.current;
    if (!container || visibleSectionIds.length === 0) {
      return;
    }

    const usesOwnScrollContainer = container.scrollHeight > container.clientHeight + 1;

    const updateActiveSection = () => {
      const sections = Array.from(
        container.querySelectorAll<HTMLElement>('[data-gallery-section]'),
      );
      if (sections.length === 0) {
        return;
      }

      const firstSection = sections[0];
      if (!firstSection) {
        return;
      }

      const activationThreshold = usesOwnScrollContainer
        ? container.getBoundingClientRect().top + container.clientHeight * 0.4
        : window.innerHeight * 0.4;
      const passedSections = sections.filter((section) => {
        const sectionId = section.dataset.gallerySection;
        return Boolean(sectionId) && section.getBoundingClientRect().top <= activationThreshold;
      });
      const nextSection = passedSections[passedSections.length - 1] ?? firstSection;
      const nextSectionId = nextSection.dataset.gallerySection ?? activeSectionId;

      setActiveSectionId((current) => (current === nextSectionId ? current : nextSectionId));
    };

    updateActiveSection();
    if (usesOwnScrollContainer) {
      container.addEventListener('scroll', updateActiveSection, { passive: true });
    } else {
      window.addEventListener('scroll', updateActiveSection, { passive: true });
    }
    window.addEventListener('resize', updateActiveSection);

    return () => {
      if (usesOwnScrollContainer) {
        container.removeEventListener('scroll', updateActiveSection);
      } else {
        window.removeEventListener('scroll', updateActiveSection);
      }
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [activeSectionId, visibleSectionIds]);

  const handleSelectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const section = mainRef.current?.querySelector<HTMLElement>(
      `[data-gallery-section="${sectionId}"]`,
    );
    // Container-bound scroll (Q5): never bubbles to a host page / iframe.
    scrollToSection(mainRef.current, section ?? null);
  };

  const totalDemoCount = CATEGORIES.reduce((count, category) => count + category.demos.length, 0);
  const noMatches = !filtersEmpty && allDemos.length === 0;

  return (
    // One language for the whole index: the catalogue is translated as data,
    // and the chrome around it reads the same choice from here.
    <GalleryLocaleProvider locale={locale}>
      <div
        data-netlab-palette={palette}
        data-netlab-density={density}
        data-netlab-audience={audience}
        data-cbsafe={colorBlindSafe}
        data-contrast={contrast}
        data-netlab-gallery
        data-testid="gallery-root"
        data-menu-open={menuOpen ? '' : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setMenuOpen(false);
        }}
        style={{
          ...themeToVars(activeTheme, { palette, density, colorBlindSafe, contrast }),
          minHeight: '100vh',
          background: 'var(--netlab-learning-surface-bg)',
          fontFamily: 'monospace',
          color: 'var(--netlab-text-primary)',
          display: 'grid',
          gridTemplateColumns: '248px minmax(0, 1fr)',
        }}
      >
        <button
          type="button"
          className="nl-gallery-skip"
          data-testid="gallery-skip-to-content"
          onClick={() => {
            const target = document.getElementById('gallery-catalogue');
            target?.focus();
            target?.scrollIntoView({ block: 'start' });
          }}
        >
          {locale === 'ja' ? 'コンテンツへ移動' : 'Skip to content'}
        </button>
        <Sidebar
          browseItems={browseItems}
          extraItems={extraBrowseItems}
          activeSectionId={activeSectionId}
          onSelectSection={(sectionId) => {
            setMenuOpen(false);
            handleSelectSection(sectionId);
          }}
        />
        {menuOpen ? (
          <div
            className="nl-gallery-scrim"
            data-testid="gallery-menu-scrim"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <main
          ref={mainRef}
          data-netlab-gallery-main
          style={{
            // position: relative anchors section offsetTop for container scroll (Q5).
            position: 'relative',
            padding: '24px',
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--netlab-bg-surface) 18%, var(--netlab-bg-primary)) 0%, color-mix(in srgb, var(--netlab-bg-primary) 92%, transparent) 100%)',
          }}
        >
          <div
            data-netlab-search-bar
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 5,
              marginBottom: 18,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              borderRadius: 'var(--netlab-radius-md)',
              border: '1px solid var(--netlab-learning-surface-border)',
              background: 'var(--netlab-learning-glass-bg)',
              backdropFilter: 'var(--netlab-learning-glass-blur)',
              WebkitBackdropFilter: 'var(--netlab-learning-glass-blur)',
              boxShadow: 'var(--netlab-learning-shadow)',
            }}
          >
            {/* The bar carries the page's settings as well as its search, so it
                is a toolbar rather than a mostly-empty strip, and the hero
                below is left to say what the page is. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="nl-gallery-menu nl-gallery-focusable"
                data-testid="gallery-menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                ☰ {locale === 'ja' ? 'メニュー' : 'Menu'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    color: 'var(--netlab-text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  {locale === 'ja' ? '対象' : 'Audience'}
                </span>
                <AudiencePill variant="learning" value={audience} onChange={setAudience} />
              </div>
              <ThemeModeToggle themeMode={themeMode} onChange={chooseThemeMode} />
              <LocaleToggle locale={locale} label={copy.localeLabel} onChange={setLocale} />
              <SettingsPopover settings={settings} onChange={handleSettingsChange} />
            </div>
            <SearchBox
              value={query}
              onChange={setQuery}
              onClear={() => setQuery('')}
              resultCount={allDemos.length}
              totalCount={totalDemoCount}
            />
          </div>
          <div
            style={{
              padding: '28px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              borderRadius: 'var(--netlab-radius-lg)',
              border: '1px solid var(--netlab-learning-surface-border)',
              background: 'var(--netlab-learning-hero-bg)',
              boxShadow: 'var(--netlab-learning-shadow)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 'var(--netlab-radius-pill)',
                  background:
                    'color-mix(in srgb, var(--netlab-bg-surface) 80%, var(--netlab-bg-primary))',
                  border: '1px solid var(--netlab-border)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  color: 'var(--netlab-text-secondary)',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                {copy.themeEyebrow[themeMode]}
              </div>
              <h1
                data-testid="gallery-heading"
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--netlab-text-primary)',
                  margin: 0,
                }}
              >
                {copy.title}
              </h1>
              <p
                style={{
                  marginTop: 8,
                  color: 'var(--netlab-text-secondary)',
                  fontSize: 13,
                  lineHeight: 1.65,
                  maxWidth: 620,
                }}
              >
                {copy.body}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                <span style={getStatChipStyle('var(--netlab-accent-blue)')}>
                  {allDemos.length} {copy.demos}
                </span>
                <span style={getStatChipStyle('var(--netlab-accent-yellow)')}>
                  {filteredIntros.length} {copy.guidedIntros}
                </span>
                <span style={getStatChipStyle('var(--netlab-accent-green)')}>
                  {assessmentDemos.length} {copy.assessments}
                </span>
                <span style={getStatChipStyle('var(--netlab-accent-cyan)')}>
                  {sandboxDemos} {copy.sandboxReady}
                </span>
                {!filtersEmpty && (
                  <span style={getStatChipStyle('var(--netlab-accent-orange)')}>
                    {copy.filteredFrom} {totalDemoCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <a
            href="#/course"
            data-testid="gallery-course-banner"
            style={{
              marginTop: 20,
              display: 'block',
              padding: '18px 22px',
              borderRadius: 14,
              border: '1px solid var(--netlab-accent-blue)',
              background: 'var(--netlab-bg-panel)',
              color: 'var(--netlab-text-primary)',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: 'var(--netlab-accent-blue)',
              }}
            >
              {copy.courseEyebrow}
            </div>
            <div style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700 }}>
              {copy.courseTitle}
            </div>
            <p
              style={{
                margin: '8px 0 0',
                maxWidth: 720,
                lineHeight: 1.8,
                color: 'var(--netlab-text-secondary)',
              }}
            >
              {copy.courseBody}
            </p>
            <span
              style={{
                marginTop: 14,
                display: 'inline-block',
                padding: '9px 16px',
                borderRadius: 8,
                background: 'var(--netlab-accent-blue)',
                color: '#f8fafc',
                fontWeight: 700,
              }}
            >
              {copy.courseCta} →
            </span>
          </a>

          <div style={{ marginTop: 20 }}>
            <LearningMap
              map={learningMap}
              // Until something is done the spine is a list of fifty-odd
              // starting points; the course above is the one to take.
              compact={audience === 'pro' || learningMap.doneCount === 0}
              note={t(
                `${COURSE_STEPS.length} course steps + ${totalDemoCount} lessons`,
                `入門コース ${COURSE_STEPS.length} ステップ ＋ レッスン ${totalDemoCount} 件`,
              )}
              onOpen={(_id, path) => navigate(path)}
              onResume={(_id, path) => navigate(path)}
            />
          </div>

          <div
            data-netlab-gallery-filters
            style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <GalleryFilterControls
              filters={filters}
              tags={allTags}
              onToggleDifficulty={toggleDifficulty}
              onToggleTag={toggleTag}
              onSetSandboxOnly={setSandboxOnly}
            />
            {!filtersEmpty && (
              <ActiveFilters
                filters={filters}
                onToggleDifficulty={toggleDifficulty}
                onToggleTag={toggleTag}
                onSetSandboxOnly={setSandboxOnly}
                onClearAll={clearAll}
              />
            )}
          </div>

          <div
            id="gallery-catalogue"
            tabIndex={-1}
            style={{
              padding: '28px 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              outline: 'none',
            }}
          >
            {filteredCategories.map((cat) => {
              if (TRACK_LANDING_IDS.has(cat.id)) {
                return (
                  <CategoryLanding
                    key={cat.id}
                    trackId={cat.id}
                    title={cat.label}
                    blurb={getSectionBlurb(cat.id, locale)}
                    accent={cat.color}
                    demos={cat.demos.map(demoToLandingDemo)}
                  />
                );
              }
              return (
                <section
                  key={cat.id}
                  id={cat.id}
                  data-gallery-section={cat.id}
                  style={getSectionSurfaceStyle(cat.color)}
                >
                  <SectionHeader
                    dot={cat.color}
                    title={cat.label}
                    blurb={getSectionBlurb(cat.id, locale)}
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
                          audience={audience}
                          progressTargetId={progressTargetIdFor(demo)}
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
              );
            })}

            {showHeroStrip && (
              <div data-gallery-section="featured">
                <FeaturedStrip intros={filteredIntros} />
              </div>
            )}

            {assessmentDemos.length > 0 && (
              <section
                id="assessments"
                data-gallery-section="assessments"
                style={getSectionSurfaceStyle('var(--netlab-accent-green)')}
              >
                <SectionHeader
                  dot="var(--netlab-accent-green)"
                  title={
                    (locale === 'ja' ? CATEGORY_LABELS_JA.assessments : undefined) ?? 'Assessments'
                  }
                  blurb={getSectionBlurb('assessments', locale)}
                  count={assessmentDemos.length}
                />
                <div style={CARD_GRID}>
                  {/* Not a lesson with a rubric but a set of its own: exercises
                      graded by running the learner's network. */}
                  <Link
                    to="/exercises"
                    data-testid="gallery-exercises-card"
                    className="nl-demo-card"
                    style={{
                      ['--demo-card-bg' as string]: 'var(--netlab-bg-surface)',
                      ['--demo-card-border' as string]: 'var(--netlab-accent-green)',
                      ['--demo-card-border-hover' as string]: 'var(--netlab-accent-green)',
                      display: 'grid',
                      gap: 6,
                      alignContent: 'start',
                      textDecoration: 'none',
                      color: 'var(--netlab-text-primary)',
                    }}
                  >
                    <strong style={{ fontSize: 15 }}>
                      {locale === 'ja' ? '実習問題' : 'Hands-on exercises'}
                    </strong>
                    <span style={{ fontSize: 13, color: 'var(--netlab-text-secondary)' }}>
                      {locale === 'ja'
                        ? '設定を変えて、小さなネットワークを直します。4 つのレベルがあり、動くかどうかはシミュレータが確かめます。'
                        : 'Fix a small network by changing its settings. Four levels; the simulator checks whether it works.'}
                    </span>
                  </Link>
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
                        audience={audience}
                        progressTargetId={progressTargetIdFor(demo)}
                        tutorialHref={
                          tutorial
                            ? `?tutorial=${encodeURIComponent(tutorial.id)}#${demo.path}`
                            : null
                        }
                        sandboxHref={getSandboxHref(demo)}
                        assessmentHref={getAssessmentHref(demo)}
                        compareHref={getCompareHref(demo)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {noMatches && <GalleryEmptyState onClear={clearAll} />}

            {/* Keeping, exporting and clearing the record is housekeeping, so
                it comes after the lessons rather than before them. */}
            <I18nProvider locale={locale}>
              <ProgressPanel />
            </I18nProvider>
          </div>
        </main>
      </div>
    </GalleryLocaleProvider>
  );
}

// Keep Link in scope — it is used transitively by DemoCard (which imports it),
// but if the bundler tree-shakes it away this import ensures the module is
// loaded in test environments where DemoCard renders Link.
void Link;
