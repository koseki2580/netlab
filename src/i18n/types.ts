export type Catalog = Readonly<Record<string, string>>;

export type TranslatorParams = Readonly<Record<string, string | number>>;

export type TranslatorFn = (key: string, params?: TranslatorParams) => string;

export interface I18nContextValue {
  readonly locale: string;
  readonly t: TranslatorFn;
}
