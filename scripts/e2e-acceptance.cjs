// B-001 桌面真机验收脚本（R75）：拿到内核令牌后一键执行完整验收清单。
// 用法：SIYUAN_ORIGIN=http://127.0.0.1:6806 SIYUAN_TOKEN=xxxx node scripts/e2e-acceptance.cjs
// 零依赖（Node 18+ 原生 fetch）；镜像插件自身的内核流（端点与 src/kernel/client.ts 白名单一致）。
// 验收项全部通过输出 PASS 汇总并退出 0；任何一项失败输出 FAIL 明细并退出 1。
// 全程使用带前缀的临时文档，结束即清理（失败时也尽力清理，残留以 RESIDUE 提示）。
"use strict";

const ORIGIN = (process.env.SIYUAN_ORIGIN || "http://127.0.0.1:6806").replace(/\/$/, "");
const TOKEN = process.env.SIYUAN_TOKEN || "";
const STAMP = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
// 标题带纯 ASCII 唯一标记：searchDocs 对「中文+数字混合长串」分词不稳定（R136 实测），
// ASCII 标记命中稳定；文档清理按 createDocWithMd 返回的 docId 拼 /{docId}.sy 内部路径。
const DOC_TITLE = `小驴常用 E2E 验收 xlc${STAMP}`;

if (!TOKEN) {
    console.error("缺少 SIYUAN_TOKEN 环境变量（思源 设置→关于→API 令牌）");
    process.exit(1);
}

const results = [];
const residue = [];
let docId = "";
const itemIds = [];

async function api(endpoint, payload = {}) {
    const resp = await fetch(`${ORIGIN}${endpoint}`, {
        method: "POST",
        headers: {"Content-Type": "application/json", Authorization: `Token ${TOKEN}`},
        body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} @ ${endpoint}`);
    const body = await resp.json();
    if (body && typeof body === "object" && "code" in body && body.code !== 0) {
        throw new Error(`kernel code ${body.code}: ${body.msg} @ ${endpoint}`);
    }
    return body;
}

// 真实内核对 /api/* 返回 {code,msg,data} 信封（R136 真内核实测）；历史实现误按裸值解析。
// 解包 data，同时兼容直接返回值的形态（如旧版本/非信封端点）。
function unwrap(body) {
    return body && typeof body === "object" && "data" in body ? body.data : body;
}

function check(name, ok, detail = "") {
    results.push({name, ok, detail});
    console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
    return ok;
}

const ITEMS = [
    {type: "p", md: "E2E 文本条目：正文内容", attrs: {"custom-xlc-id": `xlc-e2e${STAMP}1`, "custom-xlc-type": "text", "custom-xlc-title": "E2E 文本条目"}},
    {type: "p", md: "E2E Markdown 条目：**加粗** 与 列表\n\n- 项一\n- 项二", attrs: {"custom-xlc-id": `xlc-e2e${STAMP}2`, "custom-xlc-type": "markdown", "custom-xlc-title": "E2E Markdown 条目"}},
    {type: "c", md: "```sql\nSELECT 1;\n```", attrs: {"custom-xlc-id": `xlc-e2e${STAMP}3`, "custom-xlc-type": "code", "custom-xlc-title": "E2E 代码条目"}},
];

async function cleanup() {
    try {
        for (const id of itemIds) {
            await api("/api/block/deleteBlock", {id});
        }
        if (docId) await api("/api/filetree/removeDoc", {notebook: residue.notebook || "", path: `/${docId}.sy`});
    } catch (err) {
        residue.push(`清理失败：${err.message}`);
    }
}

(async () => {
    // 1. 连接性
    let version = "";
    try {
        const v = await api("/api/system/version");
        version = String(v.data ?? v);
        check("内核连接（/api/system/version）", true, `v${version}`);
    } catch (err) {
        check("内核连接（/api/system/version）", false, err.message);
        return finish();
    }

    // 信息项（不计入验收）：AI 模型可用性
    try {
        const models = await api("/api/ai/listModels");
        const count = Array.isArray(models.data) ? models.data.length : 0;
        console.log(`ℹ（信息项，不计入验收）AI 模型：${count} 个${count === 0 ? "（未配置不影响内核链路验收）" : ""}`);
    } catch {
        console.log("ℹ（信息项，不计入验收）AI 端点不可用（不影响内核链路验收）");
    }

    // 2. 笔记本
    let notebook = "";
    try {
        const nb = await api("/api/notebook/lsNotebooks");
        const list = ((unwrap(nb)?.notebooks) ?? (Array.isArray(nb) ? nb : [])).filter((n) => !n.closed);
        if (!check("列出笔记本", list.length > 0, `${list.length} 个`)) return finish();
        notebook = list[0].id;
    } catch (err) {
        check("列出笔记本", false, err.message);
        return finish();
    }

    // 3. 创建库文档（createDocWithMd）
    try {
        const created = await api("/api/filetree/createDocWithMd", {notebook, path: `/${DOC_TITLE}`, markdown: ""});
        docId = String(created.data ?? "");
        if (!check("创建库文档", /^\d{14}-[0-9a-z]{7}$/.test(docId), docId)) return finish();
        residue.notebook = notebook;
        const p = await api("/api/filetree/getFullHPathByID", {id: docId});
        residue.path = p.data ?? "";
    } catch (err) {
        check("创建库文档", false, err.message);
        return finish();
    }

    // 4. 逐条 appendBlock + setBlockAttrs（插件 createItem 同款两步）
    // 注意：内核会把多块 markdown 拆成多个兄弟块（R136 实测），doOperations 每块一条——
    // 全部记入 itemIds（锚定块取首块，清理时全部删除）。
    try {
        for (const item of ITEMS) {
            const resp = unwrap(await api("/api/block/appendBlock", {data: item.md, dataType: "markdown", parentID: docId}));
            const ops = (Array.isArray(resp) ? resp[0]?.doOperations : []) ?? [];
            const ids = ops.map((op) => op?.id).filter((id) => /^\d{14}-[0-9a-z]{7}$/.test(id ?? ""));
            if (ids.length === 0) throw new Error("appendBlock 未返回块 ID");
            itemIds.push(...ids);
            await api("/api/attr/setBlockAttrs", {id: ids[0], attrs: {...item.attrs, "custom-xlc-created": String(Date.now())}});
        }
        check("追加条目块并写入属性（appendBlock+setBlockAttrs）", itemIds.length >= ITEMS.length, itemIds.join(","));
    } catch (err) {
        check("追加条目块并写入属性", false, err.message);
        return finish();
    }

    // 5. getChildBlocks：库文档子块按文档序包含全部条目块
    // （文档可能有初始空段等非条目块，锚定语义是「按属性识别 + 文档序」，不假设条目在第 0 位）
    try {
        const children = unwrap(await api("/api/block/getChildBlocks", {id: docId})) ?? [];
        const childIdx = new Map(children.map((c, i) => [c.id, i]));
        let last = -1;
        const ordered = itemIds.every((id) => {
            const i = childIdx.get(id);
            if (i === undefined || i <= last) return false;
            last = i;
            return true;
        });
        check("getChildBlocks 有序返回子块", children.length >= itemIds.length && ordered, `${children.length} 块，含条目 ${itemIds.length} 块`);
    } catch (err) {
        check("getChildBlocks 有序返回子块", false, err.message);
    }

    // 6. 属性回读（getBlockAttrs / batchGetBlockAttrs）——插件索引自愈依据
    try {
        const attrs = unwrap(await api("/api/attr/getBlockAttrs", {id: itemIds[0]})) ?? {};
        const ok = attrs["custom-xlc-id"] === ITEMS[0].attrs["custom-xlc-id"];
        check("块属性回读一致（getBlockAttrs）", ok, JSON.stringify({id: attrs["custom-xlc-id"], type: attrs["custom-xlc-type"]}));
        const batch = unwrap(await api("/api/attr/batchGetBlockAttrs", {ids: itemIds})) ?? {};
        check("批量属性回读（batchGetBlockAttrs）", itemIds.every((id) => batch[id]?.["custom-xlc-id"]));
    } catch (err) {
        check("块属性回读", false, err.message);
    }

    // 7. kramdown 往返（代码围栏保留）
    try {
        const kd = unwrap(await api("/api/block/getBlockKramdown", {id: itemIds[2]})) ?? {};
        const kramdown = String(kd.kramdown ?? "");
        check("代码块 kramdown 往返（围栏保留）", kramdown.includes("```sql") && kramdown.includes("SELECT 1;"), kramdown.slice(0, 60));
    } catch (err) {
        check("代码块 kramdown 往返", false, err.message);
    }

    // 8. updateBlock（编辑语义）+ 回读
    try {
        await api("/api/block/updateBlock", {id: itemIds[0], data: "E2E 文本条目：已更新", dataType: "markdown"});
        const kd = unwrap(await api("/api/block/getBlockKramdown", {id: itemIds[0]})) ?? {};
        check("updateBlock 更新并回读", String(kd.kramdown ?? "").includes("已更新"));
    } catch (err) {
        check("updateBlock 更新并回读", false, err.message);
    }

    // 9. searchDocs——信息项（不计入验收）。
    // R136 实测：端点契约正常（信封结构/数组返回），但索引为最终一致——新建文档要等刷新才可被
    // 检索（无头内核下观测到秒级到分钟级不可控窗口，UPDATE 不保证加速）。插件真实使用场景
    // （首跑引导选现有文档/更改库）检索的是早已建好的文档，不受此影响；freshness 不作为门禁。
    try {
        let hit = false;
        for (let attempt = 1; attempt <= 10 && !hit; attempt++) {
            const s = unwrap(await api("/api/filetree/searchDocs", {k: `xlc${STAMP}`})) ?? [];
            hit = s.some((d) => d.id === docId);
            if (!hit) await new Promise((r) => setTimeout(r, 1000));
        }
        console.log(`ℹ（信息项，不计入验收）searchDocs 命中库文档：${hit ? "是" : "否（索引最终一致延迟，见账本 R136）"}；端点契约本身已验证`);
    } catch (err) {
        console.log(`ℹ（信息项，不计入验收）searchDocs 端点异常：${err.message}`);
    }

    // 10. exportMdContent（导出/复制语义）
    try {
        const ex = unwrap(await api("/api/export/exportMdContent", {id: docId})) ?? {};
        check("exportMdContent 导出文档", String(ex.content ?? "").includes("E2E"));
    } catch (err) {
        check("exportMdContent 导出文档", false, err.message);
    }

    // 11. checkBlocksExist（来源失效检测依据）
    try {
        const exist = unwrap(await api("/api/block/checkBlocksExist", {ids: itemIds})) ?? {};
        check("checkBlocksExist 全部存在", itemIds.every((id) => exist[id] === true));
    } catch (err) {
        check("checkBlocksExist 全部存在", false, err.message);
    }

    await cleanup();

    // 12. 清理核验
    try {
        const exist = unwrap(await api("/api/block/checkBlocksExist", {ids: itemIds})) ?? {};
        check("清理：条目块已删除", itemIds.every((id) => exist[id] === false));
    } catch (err) {
        check("清理：条目块已删除", false, err.message);
    }

    finish();
})();

function finish() {
    const pass = results.filter((r) => r.ok).length;
    const fail = results.length - pass;
    console.log(`\n汇总：${pass}/${results.length} 通过${fail ? `，${fail} 项失败` : " —— B-001 桌面内核链路验收通过"}`);
    for (const r of residue) console.log(`RESIDUE: ${r}`);
    if (fail) console.log("RESIDUE: 存在失败项，请检查上方明细（临时文档可能残留，可在思源中手动删除）");
    process.exit(fail ? 1 : 0);
}
