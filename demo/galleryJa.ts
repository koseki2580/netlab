import { LESSONS, type Lesson } from './lessonManifest';

/**
 * Japanese for the gallery's own index: what each category is called and what
 * each lesson offers. The lessons' interiors are still English; this is the
 * layer a learner reads before choosing one, so it is the layer that decides
 * whether they can choose at all.
 *
 * Keyed by the same ids and paths the gallery uses. Each lesson's own title
 * and description come from the lesson manifest, which holds both languages
 * side by side, so a lesson cannot be added without its Japanese.
 */
export const CATEGORY_LABELS_JA: Readonly<Record<string, string>> = {
  featured: 'ここから始める',
  basic: '基本のかたち',
  routing: 'ルーティング',
  areas: 'ネットワークの中身',
  services: 'サービス',
  simulation: 'シミュレーション',
  editor: '編集ツール',
  integration: '組み込み',
  comprehensive: '総合',
  assessments: '力だめし',
};

export interface DemoCopyJa {
  readonly title: string;
  readonly desc: string;
}

export const DEMO_COPY_JA: Readonly<Record<string, DemoCopyJa>> = Object.fromEntries(
  (LESSONS as readonly Lesson[]).map((lesson) => [
    lesson.path,
    { title: lesson.title.ja, desc: lesson.desc.ja },
  ]),
);
