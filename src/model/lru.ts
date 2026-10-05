// 有界 LRU 缓存：预览文本等按需取用内容的可丢弃缓存（不是真源，随时可重建）。
// 容量硬上限；get 命中刷新新近度；set 淘汰最久未用。
export class LruCache<V> {
    private map = new Map<string, V>();

    constructor(private readonly capacity: number) {
        if (!Number.isInteger(capacity) || capacity < 1) throw new Error("LruCache capacity must be positive integer");
    }

    get size(): number {
        return this.map.size;
    }

    get(key: string): V | undefined {
        if (!this.map.has(key)) return undefined;
        const value = this.map.get(key) as V;
        // 刷新新近度
        this.map.delete(key);
        this.map.set(key, value);
        return value;
    }

    set(key: string, value: V): void {
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, value);
        while (this.map.size > this.capacity) {
            const oldest = this.map.keys().next().value as string;
            this.map.delete(oldest);
        }
    }

    clear(): void {
        this.map.clear();
    }
}

export const PREVIEW_CACHE_CAPACITY = 32;
