/** 有界等待宿主插件侧车读取；失败/超时不让启动流程无限悬挂。 */
export type TimedRead<T> =
    | {ok: true; value: T}
    | {ok: false; reason: "timeout" | "error"};

export function readWithTimeout<T>(read: () => Promise<T>, timeoutMs: number): Promise<TimedRead<T>> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (result: TimedRead<T>) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        const timer = setTimeout(() => finish({ok: false, reason: "timeout"}), timeoutMs);
        Promise.resolve()
            .then(read)
            .then((value) => finish({ok: true, value}))
            .catch(() => finish({ok: false, reason: "error"}));
    });
}
