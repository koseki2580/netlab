import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './Gallery';
import { CATEGORY_LABELS_JA, DEMO_COPY_JA } from './galleryJa';

describe('the gallery catalogue in Japanese', () => {
  /**
   * TC-122 — every lesson a learner can see is described in Japanese.
   *
   * The gallery already offered a language toggle, and choosing 日本語 changed
   * the surrounding prose while every category and every lesson stayed in
   * English — which is the part a learner reads to decide what to open.
   */
  it('describes every listed lesson', () => {
    const untranslated = CATEGORIES.flatMap((category) =>
      category.demos.filter((demo) => !DEMO_COPY_JA[demo.path]).map((demo) => demo.path),
    );
    expect(untranslated).toEqual([]);
  });

  /** TC-123 — and names every category. */
  it('names every category', () => {
    const untranslated = CATEGORIES.filter((category) => !CATEGORY_LABELS_JA[category.id]).map(
      (category) => category.id,
    );
    expect(untranslated).toEqual([]);
  });

  /**
   * TC-124 — a translation that is still English is not a translation.
   *
   * Descriptions only. A title like "HTTPS（TLS 1.3）" or "MPLS L3VPN" is the
   * protocol's name, and translating a name would make the lesson harder to
   * find, not easier to read; the sentence beneath it is what has to be
   * Japanese.
   */
  it('is actually in Japanese', () => {
    const notJapanese: string[] = [];
    for (const [path, copy] of Object.entries(DEMO_COPY_JA)) {
      if (!/[ぁ-んァ-ヶ一-龯]/.test(copy.desc)) notJapanese.push(`${path}: desc`);
    }
    for (const [id, label] of Object.entries(CATEGORY_LABELS_JA)) {
      if (!/[ぁ-んァ-ヶ一-龯]/.test(label)) notJapanese.push(`category ${id}`);
    }
    expect(notJapanese).toEqual([]);
  });
});
