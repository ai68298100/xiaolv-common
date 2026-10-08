// 真内核集成测试入口（R140）：library.ts 全生命周期对真实思源内核跑通。
// 由 scripts/integration-kernel.cjs 打包后在 Node 中执行；传输层直连隔离内核 HTTP API。
// 这填补「桩内核单测 ↔ 裸 API E2E」之间的空档：插件自己的服务代码从未碰过真内核。
import {createKernelClient} from "../../src/kernel/client";
import {LibraryService} from "../../src/service/library";
import {searchEntries} from "../../src/model/search";

const ORIGIN = process.env.IT_ORIGIN || "";
const TOKEN = process.env.IT_TOKEN || "";
const DOC = process.env.IT_DOC || "";

const results: Array<{name: string; ok: boolean; detail?: string}> = [];
function check(name: string, ok: boolean, detail = ""): void {
    results.push({name, ok, detail});
    console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
}

(async () => {
    const syncPost = async (url: string, data: unknown) => {
        const resp = await fetch(ORIGIN + url, {
            method: "POST",
            headers: {"Content-Type": "application/json", Authorization: `Token ${TOKEN}`},
            body: JSON.stringify(data ?? {}),
        });
        const body = (await resp.json()) as {code?: number; msg?: string; data?: unknown};
        return {code: body.code, msg: body.msg, data: body.data};
    };
    const kernel = createKernelClient({syncPost});
    const lib = new LibraryService(kernel, {});
    lib.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [], configuredAt: Date.now()});

    // 1. 空索引
    const idx0 = await lib.ensureIndex();
    check("空库索引构建", idx0.entries.length === 0 && idx0.errors.length === 0, `${idx0.entries.length} 条 / errors=${idx0.errors.length}`);

    // 2. 三类型 createItem（text/code/url）
    const r1 = await lib.createItem({itemType: "text", markdown: "集成测试条目甲：正文内容", title: "条目甲"});
    check("createItem text", r1.ok, r1.ok ? r1.data.item.id : r1.message);
    const r2 = await lib.createItem({itemType: "code", markdown: "```sql\nSELECT 1;\n```", title: "条目乙"});
    check("createItem code", r2.ok, r2.ok ? r2.data.item.id : r2.message);
    const r3 = await lib.createItem({itemType: "url", markdown: "https://example.com/it", title: "条目丙", url: "https://example.com/it"});
    check("createItem url", r3.ok, r3.ok ? r3.data.item.id : r3.message);
    if (!r1.ok || !r2.ok || !r3.ok) return finish();

    // 3. 索引发现三条（含 R139 的 skip 非条目块路径：文档内还有标题块等）
    const idx1 = await lib.ensureIndex(0); // 强制重建
    const ids = [r1.data.item.id, r2.data.item.id, r3.data.item.id];
    check("重建索引发现全部条目", ids.every((id) => idx1.items.has(id)), `${idx1.entries.length} 条`);

    // 4. 搜索命中
    const hits = searchEntries(idx1.entries, {text: "集成测试条目甲"}, {favorites: new Set(), recents: new Map(), usage: new Map(), now: Date.now()});
    check("搜索命中新条目", hits.length >= 1 && hits[0].entry.id === r1.data.item.id, `${hits.length} 条`);

    // 5. kramdown 往返（经插件路径）
    const kd = await lib.getItemKramdown(r2.data.item);
    check("getItemKramdown 围栏保留", kd.ok && (kd.data ?? "").includes("SELECT 1;"));

    // 6. 来源健康（真实块存在）
    const health = await lib.checkSourceHealth(r1.data.item);
    check("checkSourceHealth 健康", health.ok && !health.data.blockMissing && !health.data.docMissing && !health.data.assetMissing,
        health.ok ? JSON.stringify(health.data) : health.message);

    // 7. 更新（标题走属性写）后重建可见
    const up = await lib.updateItem(r1.data.item.id, {title: "条目甲·改"});
    check("updateItem", up.ok, up.ok ? "" : up.message);
    const idx2 = await lib.ensureIndex(0);
    const updatedEntry = idx2.items.get(r1.data.item.id);
    check("更新后索引可见新标题", Boolean(updatedEntry && updatedEntry.title === "条目甲·改"), updatedEntry?.title ?? "missing");
    // R150 锁定：空 markdown 不写内容也不触发假更新（updated 属性变化但正文不变属预期）
    const upEmpty = await lib.updateItem(r1.data.item.id, {title: "条目甲·改2", markdown: ""});
    const kdAfterEmpty = await lib.getItemKramdown(r1.data.item);
    check("updateItem 空 markdown 不清空正文", upEmpty.ok && (kdAfterEmpty.data ?? "").includes("集成测试条目甲") === true,
        upEmpty.ok ? "" : upEmpty.message);

    // 8. 删除后索引收敛
    const rm = await lib.removeItem(r2.data.item.id);
    check("removeItem", rm.ok, rm.ok ? "" : rm.message);
    const idx3 = await lib.ensureIndex(0);
    check("删除后索引收敛", !idx3.items.has(r2.data.item.id) && idx3.items.size === 2, `${idx3.entries.length} 条`);

    // 9. 片段引用展开（无引用 → 原样）
    const expanded = await lib.expandSnippetRefs("纯文本 {{xlc:ask:字段}} 片段");
    check("expandSnippetRefs 无引用原样", expanded.includes("{{xlc:ask:字段}}"));

    finish();
})().catch((err) => {
    console.error(`集成测试异常：${err?.message ?? err}`);
    process.exit(1);
});

function finish(): void {
    const pass = results.filter((r) => r.ok).length;
    const fail = results.length - pass;
    console.log(`\n集成测试汇总：${pass}/${results.length} 通过${fail ? "，存在失败" : " —— library.ts 全生命周期真内核验收通过"}`);
    process.exit(fail ? 1 : 0);
}
