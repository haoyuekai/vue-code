class LRUCache {
    cache = new Map();

    max;

    constructor(max) {
        this.max = max;
    }

    get(key) {
        if (!this.cache.has(key)) return;

        /**
         * 移动 key 到后面
         */
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.cache.set(key, value);
        } else {
            if (this.size >= this.max) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(key, value);
        }
    }
}

const cache = new LRUCache(2);
