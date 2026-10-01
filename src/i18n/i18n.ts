import es from './locales/es.json';
import en from './locales/en.json';

export type SupportedLanguage = 'es' | 'en';

type Translations = typeof es;
const dictionaries: Record<SupportedLanguage, Translations> = { es, en };

const STORAGE_KEY_LANG = 'gmpaint_language';
type LangChangeListener = (lang: SupportedLanguage) => void;

class I18nManager {
  private currentLang: SupportedLanguage;
  private listeners: Set<LangChangeListener> = new Set();

  constructor() {
    this.currentLang = this.detectLanguage();
  }

  /**
   * Detecta automáticamente el idioma preferido del usuario basándose en localStorage o el navegador.
   */
  private detectLanguage(): SupportedLanguage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LANG);
      if (stored === 'es' || stored === 'en') {
        return stored;
      }
    } catch {
      // fallback
    }

    // Detección automática según el navegador
    const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
    if (browserLang.startsWith('es')) {
      return 'es';
    }
    return 'en';
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLang;
  }

  public setLanguage(lang: SupportedLanguage): void {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch {
      // ignore
    }
    this.notify();
  }

  public subscribe(listener: LangChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentLang);
    }
  }

  /**
   * Obtiene la traducción para una clave con notación de punto (ej. "dialogs.common.ok").
   */
  public t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: unknown = dictionaries[this.currentLang];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }

    // Fallback a inglés si no se encuentra
    if (value === undefined && this.currentLang !== 'en') {
      let fallbackValue: unknown = dictionaries.en;
      for (const k of keys) {
        if (fallbackValue && typeof fallbackValue === 'object' && k in fallbackValue) {
          fallbackValue = (fallbackValue as Record<string, unknown>)[k];
        } else {
          fallbackValue = undefined;
          break;
        }
      }
      value = fallbackValue;
    }

    if (typeof value !== 'string') {
      return key;
    }

    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, p) => {
        return params[p] !== undefined ? String(params[p]) : `{${p}}`;
      });
    }

    return value;
  }
}

export const i18n = new I18nManager();
export const t = (key: string, params?: Record<string, string | number>) => i18n.t(key, params);
