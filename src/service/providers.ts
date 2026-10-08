// Provider 注册表：其他小驴插件（打卡/雷切等）注册内容提供方。
// 只存标量记录（绝不持久化函数回调）；卸载的 provider 记录保留、条目标记不可用，不删数据。
import {LIMITS} from "../constants";
import {ProviderDescriptor} from "../model/protocol";
import {ProviderRecord} from "../model/storage";

export interface RegisteredProvider {
    record: ProviderRecord;
    /** 运行时对象（不持久化）：重载后由 provider 重新 register */
    runtime?: {
        /** 提供条目增量（provider 侧条目，非本库真源） */
        search?(query: string): Promise<Array<{title: string; payload: string}>>;
    };
}

export class ProviderRegistry {
    private providers = new Map<string, RegisteredProvider>();

    /** 恢复上次会话的持久化记录（无 runtime——provider 需重新注册才能执行） */
    restore(records: readonly ProviderRecord[]): void {
        this.providers.clear();
        for (const record of records.slice(0, LIMITS.maxProviders)) {
            this.providers.set(record.pluginId, {record});
        }
    }

    /** 注册：协议主版本 > 本方 → 拒绝；未知字段已在协商层忽略 */
    register(descriptor: ProviderDescriptor, runtime?: RegisteredProvider["runtime"]): {ok: boolean; reason?: string} {
        if (!descriptor.pluginId || typeof descriptor.pluginId !== "string") {
            return {ok: false, reason: "invalid-plugin-id"};
        }
        if (typeof descriptor.protocolVersion !== "number" || descriptor.protocolVersion > 1) {
            return {ok: false, reason: "protocol-version-unsupported"};
        }
        // 重注册不带 runtime 时保留既有 runtime：此前会被静默清空，provider 分区无告警消失（R139）
        const existing = this.providers.get(descriptor.pluginId);
        this.providers.set(descriptor.pluginId, {
            record: {
                pluginId: descriptor.pluginId.slice(0, 128),
                displayName: (descriptor.displayName || descriptor.pluginId).slice(0, 128),
                protocolVersion: Math.floor(descriptor.protocolVersion),
                registeredAt: Date.now(),
            },
            runtime: runtime ?? existing?.runtime,
        });
        return {ok: true};
    }

    unregister(pluginId: string): {ok: boolean; removed: boolean} {
        const removed = this.providers.delete(pluginId);
        return {ok: true, removed};
    }

    get(pluginId: string): RegisteredProvider | null {
        return this.providers.get(pluginId) ?? null;
    }

    list(): RegisteredProvider[] {
        return Array.from(this.providers.values());
    }

    /** 可执行（有 runtime）的 provider */
    listExecutable(): RegisteredProvider[] {
        return this.list().filter((p) => !!p.runtime);
    }

    /** 持久化快照（仅标量记录） */
    toRecords(): ProviderRecord[] {
        return this.list().map((p) => p.record);
    }
}
