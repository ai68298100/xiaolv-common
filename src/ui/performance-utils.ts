// 性能优化与资源减负工具集（G15，R272）：
// 提供统一的防抖/节流工具函数，优化高频触发事件；
// 确保所有 DOM/思源事件监听器都有对应的清理逻辑。

/** 防抖工具：返回去抖后的函数 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number,
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, delay);
    };
}

/** 节流工具：基于时间戳的节流 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    limit: number,
): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            inThrottle = true;
            fn(...args);
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/** RAF 节流：基于 requestAnimationFrame 的节流 */
export function rafThrottle<T extends (...args: unknown[]) => unknown>(
    fn: T,
): (...args: Parameters<T>) => void {
    let rafId: number | null = null;
    return (...args: Parameters<T>) => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
            rafId = null;
            fn(...args);
        });
    };
}

/** 自动清理事件监听器的包装器 */
export function cleanupOnDestroy(
    element: HTMLElement,
    cleanupFn: () => void,
): void {
    const originalDestroy = (element as any).destroy?.bind(element);
    (element as any).destroy = () => {
        cleanupFn();
        originalDestroy?.();
    };
}

/** 内存泄漏检测：记录活跃的事件监听器数量（调试用） */
let eventListenerCount = 0;
if (typeof window !== "undefined") {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(this: EventTarget, type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
        eventListenerCount++;
        return originalAddEventListener.call(this, type, callback, options);
    };
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function(this: EventTarget, type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
        eventListenerCount--;
        return originalRemoveEventListener.call(this, type, callback, options);
    };
    // 导出到全局用于调试
    (window as any).__xlcEventListeners = () => eventListenerCount;
}
