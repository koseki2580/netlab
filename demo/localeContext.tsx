import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type GalleryLocale = 'en' | 'ja';

/**
 * The language the learner chose in the gallery, for the chrome around the
 * catalogue — the navigation, the filters, the progress line.
 *
 * The catalogue itself is translated as data (`galleryJa.ts`); this is for the
 * words the components own. Defaulting to English rather than throwing means a
 * component rendered outside the gallery, in a test or a demo of its own, still
 * renders instead of failing.
 */
const GalleryLocaleContext = createContext<GalleryLocale>('en');

export function GalleryLocaleProvider({
  locale,
  children,
}: {
  locale: GalleryLocale;
  children: ReactNode;
}) {
  return <GalleryLocaleContext.Provider value={locale}>{children}</GalleryLocaleContext.Provider>;
}

export function useGalleryLocale(): GalleryLocale {
  return useContext(GalleryLocaleContext);
}

/**
 * Pick between two literals. The English is written first so a reader of the
 * calling code sees the meaning without a lookup table in another file.
 */
export function useT(): (en: string, ja: string) => string {
  const locale = useGalleryLocale();
  return useMemo(() => (en: string, ja: string) => (locale === 'ja' ? ja : en), [locale]);
}
