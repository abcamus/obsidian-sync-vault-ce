export class QueryCache {
    private cache: Record<string, any> = {};
    static instance: QueryCache;

    static getInstance() {
        if (!QueryCache.instance) {
            QueryCache.instance = new QueryCache();
        }
        return QueryCache.instance;
    }

    get(key: string) {
        return this.cache[key];
    }

    set(key: string, value: any) {
        this.cache[key] = value;
    }

    clear() {
        this.cache = {};
    }

    delete(key: string) {
        delete this.cache[key];
    }
}
