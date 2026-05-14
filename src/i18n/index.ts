import en from './locales/en';
import zh from './locales/zh';
const locales: { [key: string]: unknown } = {
    en,
    zh,
};

export class I18n {
    private locale: string;

    constructor() {
        // local language
        this.locale = window.localStorage.getItem('language') ||
            'en';
    }

    t(key: string, params?: Record<string, string>): string {
        return this.getValue(key, params) || key;
    }

    tArray(key: string): string[] {
        const value = this.getValue(key);
        return Array.isArray(value) ? value : [];
    }

    private getValue(key: string, params?: Record<string, string>): any {
        const keys = key.split('.');
        let value: any = locales[this.locale];

        for (const k of keys) {
            if (value?.[k] === undefined) {
                // en as fallback
                value = locales['en'];
                for (const fallbackKey of keys) {
                    value = value?.[fallbackKey];
                }
                break;
            }
            value = value[k];
        }

        if (params && typeof value === 'string') {
            Object.entries(params).forEach(([key, val]) => {
                value = value.replace(`%{${key}}`, val);
            });
        }

        return value;
    }

    setLocale(locale: string) {
        if (locales[locale]) {
            this.locale = locale;
            window.localStorage.setItem('language', locale);
        }
    }

    getLocale(): string {
        return this.locale;
    }
}

export const i18n = new I18n();