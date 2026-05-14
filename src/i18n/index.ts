import en from './locales/en';
import zh from './locales/zh';

type LocaleValue = string | string[] | { [key: string]: LocaleValue };
type LocaleRecord = Record<string, LocaleValue>;

const locales: Record<string, LocaleRecord> = {
    en: en as LocaleRecord,
    zh: zh as LocaleRecord,
};

export class I18n {
    private locale: string;

    constructor() {
        // local language
        this.locale = window.localStorage.getItem('language') ||
            'en';
    }

    t(key: string, params?: Record<string, string>): string {
        const value = this.getValue(key, params);
        return typeof value === 'string' ? value : key;
    }

    tArray(key: string): string[] {
        const value = this.getValue(key);
        return Array.isArray(value) ? value : [];
    }

    private getValue(key: string, params?: Record<string, string>): string | string[] | undefined {
        const raw = this.resolveValue(this.locale, key) ?? this.resolveValue('en', key);
        if (typeof raw === 'string') {
            return this.interpolate(raw, params);
        }
        if (Array.isArray(raw)) {
            return raw;
        }
        return undefined;
    }

    private resolveValue(locale: string, key: string): LocaleValue | undefined {
        const isRecord = (val: LocaleValue | undefined): val is Record<string, LocaleValue> => {
            return !!val && typeof val === 'object' && !Array.isArray(val);
        };

        let value: LocaleValue | undefined = locales[locale];
        for (const k of key.split('.')) {
            if (!isRecord(value)) {
                return undefined;
            }
            value = value[k];
            if (value === undefined) {
                return undefined;
            }
        }
        return value;
    }

    private interpolate(template: string, params?: Record<string, string>): string {
        if (!params) {
            return template;
        }

        let result = template;
        Object.entries(params).forEach(([key, val]) => {
            result = result.replace(`%{${key}}`, val);
        });
        return result;
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