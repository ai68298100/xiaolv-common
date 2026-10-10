// 对外窗口桥 window.xiaolvCommon v1（T-0031 · ADR-0013）——只读子集。
// 方法把 XiaolvCommonService 的 ActionResult 信封原样透传（不二次包装，桥层零新语义）；
// 写面（save/update/remove/insert/copy）不进 v1——桥写开关 + 外部来源标记留 v2 立项。
// 挂载纪律对齐管家 LvHome 先例：首个实例持有窗口期，disposer 校验身份防误删新桥。
import type {XiaolvCommonService} from "./service";
import type {CapabilityDescriptor} from "../model/protocol";
import type {CommonItem, CommonItemRef} from "../model/item";
import type {ActionResult} from "../model/protocol";
import type {SearchQuery} from "../model/search";

export const XLC_BRIDGE_PROTOCOL = 1;

/** 桥只读面允许的搜索过滤键（SearchQuery 的宽松输入形状；未知键忽略） */
export interface BridgeSearchInput {
    text?: unknown;
    itemType?: unknown;
    tag?: unknown;
    category?: unknown;
    scope?: unknown;
}

export interface XlcBridgeApi {
    readonly protocol: number;
    readonly protocolName: "xiaolv-common";
    readonly capabilities: readonly string[];
    /** 桥挂载即代表服务可调用（settings/library 已装配）；对齐打卡/管家/雷切 whenReady 惯例 */
    whenReady(): Promise<boolean>;
    /** 完整能力描述符（含诚实限制标注）——消费方据此协商，桥 capabilities 只是快捷面 */
    getCapabilities(): CapabilityDescriptor[];
    search(query?: BridgeSearchInput): Promise<ActionResult<CommonItemRef[]>>;
    get(itemId: string): Promise<ActionResult<CommonItem>>;
    getRecent(limit?: number): Promise<ActionResult<CommonItemRef[]>>;
    getFavorites(): Promise<ActionResult<CommonItemRef[]>>;
}

/** 搜索入参收敛：非字符串字段丢弃（protocol invalid-input 语义交给 service 层表达） */
function normalizeSearchInput(raw?: BridgeSearchInput): SearchQuery {
    const q: SearchQuery = {text: ""};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return q;
    if (typeof raw.text === "string") q.text = raw.text;
    if (typeof raw.itemType === "string") q.itemType = raw.itemType as SearchQuery["itemType"];
    if (typeof raw.tag === "string") q.tag = raw.tag;
    if (typeof raw.category === "string") q.category = raw.category;
    if (raw.scope === "favorites" || raw.scope === "recent" || raw.scope === "all") q.scope = raw.scope;
    return q;
}

export function buildXlcBridge(service: XiaolvCommonService): XlcBridgeApi {
    return {
        protocol: XLC_BRIDGE_PROTOCOL,
        protocolName: "xiaolv-common",
        // v1 只读面（ADR-0013）：写方法不挂桥对象——门禁测试锁定此边界
        capabilities: ["search", "get", "recent", "favorites"],

        whenReady() {
            return Promise.resolve(true);
        },

        getCapabilities() {
            return service.getCapabilities();
        },

        search(query) {
            return service.search(normalizeSearchInput(query));
        },

        get(itemId) {
            return service.get(String(itemId ?? ""));
        },

        getRecent(limit) {
            return service.getRecent(typeof limit === "number" ? limit : undefined);
        },

        getFavorites() {
            return service.getFavorites();
        },
    };
}

/** 挂载桥到 window（服务装配完成后调用）；返回卸载函数 */
export function mountXlcBridge(service: XiaolvCommonService, host: {xiaolvCommon?: unknown} = window as unknown as {xiaolvCommon?: unknown}): () => void {
    if (host.xiaolvCommon) {
        // 已有桥（多实例/重复加载）：不覆盖，跳过——首个实例持有窗口期
        return () => undefined;
    }
    const bridge = buildXlcBridge(service);
    (host as {xiaolvCommon?: XlcBridgeApi}).xiaolvCommon = bridge;
    let disposed = false;
    return () => {
        // 只删自己挂载的桥；新实例接管后旧 disposer 不得误删新桥
        if (disposed || (host as {xiaolvCommon?: unknown}).xiaolvCommon !== bridge) return;
        disposed = true;
        delete (host as {xiaolvCommon?: unknown}).xiaolvCommon;
    };
}
