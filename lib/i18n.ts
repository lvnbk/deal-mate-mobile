import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from './storage';
import vi from './locales/vi';
import en from './locales/en';

const LANG_KEY = '@dealmate/lang';
export const DEFAULT_LANG = 'vi';
export const SUPPORTED_LANGS = ['vi', 'en'] as const;

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: DEFAULT_LANG, // Vietnamese by default
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

// Apply a previously chosen language, if any, without blocking first render.
AsyncStorage.getItem(LANG_KEY)
  .then((saved) => {
    if (saved && saved !== i18n.language) i18n.changeLanguage(saved);
  })
  .catch(() => {});

/** Switch app language and remember the choice. */
export async function setAppLanguage(lng: (typeof SUPPORTED_LANGS)[number]) {
  await i18n.changeLanguage(lng);
  try {
    await AsyncStorage.setItem(LANG_KEY, lng);
  } catch {
    // Persisting the preference is best-effort.
  }
}

export default i18n;
