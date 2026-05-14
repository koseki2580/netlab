import { useMemo } from 'react';
import { useScenarioProgress, type TrackItemInput } from '../hooks/useScenarioProgress';
import { CategoryHero, type CategoryHeroPill } from './CategoryHero';
import { RecommendedOrder, type RecommendedOrderItem } from './RecommendedOrder';

export interface CategoryLandingDemo {
  /** Stable id (typically scenarioId or path). Used for progress lookup. */
  id: string;
  /** Display title. */
  title: string;
  /** One-line description. */
  desc: string;
  /** Path the row links to. */
  path: string;
  /** Optional difficulty hint, used to estimate minutes when not explicit. */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  /** Optional explicit estimated minutes. */
  estMinutes?: number;
  /** Optional sandbox-ready flag. */
  sandboxReady?: boolean;
  /** Optional layer tag (e.g. `'L3'`). */
  layer?: string;
}

export interface CategoryLandingProps {
  /** Category id (e.g. `'routing'`). */
  trackId: string;
  /** Display title (e.g. `'Routing'`). */
  title: string;
  /** One-line summary used in the hero. */
  blurb: string;
  /** Accent color — a CSS variable string. */
  accent: string;
  /** Recommended-order demos. The given order is the recommended order. */
  demos: readonly CategoryLandingDemo[];
  /** Fires when a row is clicked. The caller is responsible for navigation. */
  onOpen?: (demo: CategoryLandingDemo) => void;
}

export function CategoryLanding({
  trackId,
  title,
  blurb,
  accent,
  demos,
  onOpen,
}: CategoryLandingProps) {
  const inputs: TrackItemInput[] = useMemo(
    () =>
      demos.map((d) => {
        const input: TrackItemInput = { id: d.id };
        if (d.difficulty) input.difficulty = d.difficulty;
        if (typeof d.estMinutes === 'number') input.estMinutes = d.estMinutes;
        return input;
      }),
    [demos],
  );
  const { items, doneCount, totalCount, totalMinutes } = useScenarioProgress(inputs);

  const layers = useMemo(() => {
    const set = new Set<string>();
    demos.forEach((d) => {
      if (d.layer) set.add(d.layer);
    });
    return Array.from(set);
  }, [demos]);

  const sandboxCount = useMemo(() => demos.filter((d) => d.sandboxReady).length, [demos]);

  const pills: CategoryHeroPill[] = [];
  layers.forEach((layer) => pills.push({ tone: 'up', label: layer }));
  if (totalMinutes > 0) {
    pills.push({ tone: 'info', label: `~${totalMinutes}m total` });
  }
  if (sandboxCount > 0) {
    pills.push({ tone: 'warn', label: `${sandboxCount} sandbox-ready` });
  }

  const orderItems: RecommendedOrderItem[] = items.map((it, idx) => {
    const demo = demos[idx];
    if (!demo) throw new Error('demo/scenarioProgress index mismatch');
    return {
      id: it.id,
      title: demo.title,
      desc: demo.desc,
      minutes: it.minutes,
      step: it.step,
      state: it.state,
      href: demo.path,
    };
  });

  return (
    <section
      data-gallery-section={trackId}
      data-category-landing={trackId}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <CategoryHero
        title={title}
        blurb={blurb}
        accent={accent}
        doneCount={doneCount}
        totalCount={totalCount}
        pills={pills}
      />
      {onOpen ? (
        <RecommendedOrder
          items={orderItems}
          onOpen={(id) => {
            const demo = demos.find((d) => d.id === id);
            if (demo) onOpen(demo);
          }}
        />
      ) : (
        <RecommendedOrder items={orderItems} />
      )}
    </section>
  );
}
