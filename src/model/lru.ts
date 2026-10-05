// 有界 LRU 缓存：预览文本等按需取用内容的可丢弃缓存（不是真源，随时可重建）。
// 容量硬上限；get 命中刷新新近度；set 淘汰最久未用；可选 TTL（过期条目视为未命中——
// 防多设备同步场景下预览长期陈旧）。
export class LruCache<V> {
    private map = new Map<string, {value: V; at: number}>();

    constructor(private readonly capacity: number, private readonly ttlMs?: number) {
        if (!Number.isInteger(capacity) || capacity < 1) throw new Error("LruCache capacity must be positive integer");
        if (ttlMs !== undefined && (!Number.isInteger(ttlMs) || ttlMs < 1)) throw new Error("LruCache ttlMs must be positive integer");
    }

    get size(): number {
        return this.map.size;
    }

    get(key: string): V | undefined {
        const entry = this.map.get(key);
        if (!entry) return undefined;
        if (this.ttlMs !== undefined && Date.now() - entry.at > this.ttlMs) {
            this.map.delete(key);
            return undefined;
        }
        // 刷新新近度
        this.map.delete(key);
        this.map.set(key, entry);
        return entry.value;
    }

    set(key: string, value: V): void {
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, {value, at: Date.now()});
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
/** 预览缓存 TTL：60s——同步变更后预览最多陈旧一分钟 */
export const PREVIEW_CACHE_TTL_MS = 60_000;
