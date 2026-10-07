// 全局常量：属性命名、上限、协议版本。改持久化语义必须同步迁移函数与测试。
export const PLUGIN_NAME = "xiaolv-common";

export const PROTOCOL_NAME = "xiaolv-common";
export const PROTOCOL_VERSION = 1;

// 块属性前缀（思源自定义属性形如 custom-xxx，用户可在属性面板查看编辑）
export const ATTR_PREFIX = "custom-xlc-";
export const ATTR = {
    id: "custom-xlc-id",
    type: "custom-xlc-type",
    title: "custom-xlc-title",
    alias: "custom-xlc-alias",
    tags: "custom-xlc-tags",
    category: "custom-xlc-category",
    srcDoc: "custom-xlc-src-doc",
    srcBlock: "custom-xlc-src-block",
    srcType: "custom-xlc-src-type",
    vars: "custom-xlc-vars",
    url: "custom-xlc-url",
    target: "custom-xlc-target",
    created: "custom-xlc-created",
    updated: "custom-xlc-updated",
} as const;

// 容量上限（防失控增长；索引/摘要是有界可丢弃缓存）
export const LIMITS = {
    title: 512,
    alias: 256,
    tag: 64,
    tags: 32,
    category: 64,
    summary: 240,
    contentChars: 100_000,
    queryChars: 200,
    maxItems: 2000,
    maxDocs: 200,
    maxFavorites: 500,
    maxRecents: 200,
    maxProviders: 32,
    maxImportBytes: 4 * 1024 * 1024,
    walkDepth: 8,
    kernelTimeoutMs: 8000,
    askValueChars: 2000,
    maxUsage: 2000,
    maxAskFields: 16,
    maxCustomTransforms: 10,
    customNameChars: 20,
    customPromptChars: 500,
} as const;

export const STORAGE_KEYS = {
    config: "config.json",
    state: "state.json",
} as const;

export const STATE_SCHEMA_VERSION = 2;
export const EXPORT_SCHEMA_VERSION = 1;

// 事件名（window CustomEvent；detail 带 protocolVersion）
export const EVENTS = {
    itemCreated: "xiaolv:common:item-created",
    itemUpdated: "xiaolv:common:item-updated",
    itemDeleted: "xiaolv:common:item-deleted",
    itemInserted: "xiaolv:common:item-inserted",
} as const;
