/**
 * The drill demo pages honor the same persisted locale as the gallery's
 * settings popover (`netlab-locale`), so switching the gallery to 日本語
 * carries into the learning panels.
 */
export function readLearningLocale(): 'en' | 'ja' {
  if (typeof window === 'undefined') return 'en';
  try {
    return window.localStorage.getItem('netlab-locale') === 'ja' ? 'ja' : 'en';
  } catch {
    return 'en';
  }
}
