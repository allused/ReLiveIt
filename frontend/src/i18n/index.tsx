/**
 * Edit wording in locales/hu.json and locales/en.json.
 * Default language is Hungarian. Guests can switch with HU / EN.
 * To start in English, set VITE_LOCALE=en.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import en from './locales/en.json';
import hu from './locales/hu.json';

export const LOCALES = ['hu', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

type Dict = Record<string, unknown>;

const dictionaries: Record<Locale, Dict> = { hu, en };
const STORAGE_KEY = 'reliveit_locale';

function readDefaultLocale(): Locale {
  const fromEnv = import.meta.env.VITE_LOCALE;
  if (fromEnv === 'en' || fromEnv === 'hu') return fromEnv;
  return 'hu';
}

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'hu') return stored;
  } catch {
    // ignore
  }
  return readDefaultLocale();
}

let currentLocale: Locale = readStoredLocale();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getDateLocale(): string {
  return currentLocale === 'hu' ? 'hu-HU' : 'en-GB';
}

export function setLocale(next: Locale) {
  if (next === currentLocale) return;
  currentLocale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  document.documentElement.lang = next;
  emit();
}

function lookup(dict: Dict, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object' && part in node) {
      return (node as Dict)[part];
    }
    return undefined;
  }, dict);
  return typeof value === 'string' ? value : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    vars[name] === undefined ? `{{${name}}}` : String(vars[name]),
  );
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const active = dictionaries[currentLocale];
  const fallback = dictionaries.en;
  const template = lookup(active, key) ?? lookup(fallback, key) ?? key;
  return interpolate(template, vars);
}

export function translateError(message: string): string {
  const table = dictionaries[currentLocale].apiErrors;
  const fallback = dictionaries.en.apiErrors;
  if (table && typeof table === 'object' && message in table) {
    const value = (table as Record<string, string>)[message];
    if (value) return value;
  }
  if (fallback && typeof fallback === 'object' && message in fallback) {
    const value = (fallback as Record<string, string>)[message];
    if (value) return value;
  }
  const gallery = /^You can upload up to (\d+) general gallery photos\.$/.exec(message);
  if (gallery) return t('errors.galleryLimit', { count: gallery[1] });
  const guests = /^You can add at most (\d+) guests at once\.$/.exec(message);
  if (guests) return t('errors.guestBatchLimit', { count: guests[1] });
  return message;
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: typeof t;
};

const I18nContext = createContext<I18nContextValue>({
  locale: currentLocale,
  setLocale,
  t,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const { t: translate } = useContext(I18nContext);
  return translate;
}

export function useLocale() {
  return useContext(I18nContext);
}
