// R155 规模性能实证（真实内核）：2000 条目创建 → 索引重建 → 搜索延迟 → 缓存复用。
// 由 scripts/scale-test.cjs 打包后运行（内核与环境由其准备）。
import {createKernelClient} from "../../src/kernel/client";
import {LibraryService} from "../../src/service/library";
import {searchEntries} from "../../src/model/search";

const ORIGIN = process.env.IT_ORIGIN;
const TOKEN = process.env.IT_TOKEN;
const DOC = process.env.IT_DOC;
const N = parseInt(process.env.IT_N || "2000", 10);

const results: Array<{name: string; ok: boolean}> = [];
const check = (name: string, ok: boolean, detail = "") => {
    results.push({name, ok: Boolean(ok)});
    console.log(`${ok ? "✔" : "✖"} ${name}${detail ? " — " + detail : ""}`);
};

(async () => {
    const syncPost = async (url: string, data?: unknown) => {
        const resp = await fetch(ORIGIN + url, {method: "POST", headers: {"Content-Type": "application/json", Authorization: `Token ${TOKEN}`}, body: JSON.stringify(data ?? {})});
        return resp.json();
    };
    const kernel = createKernelClient({syncPost});
    const lib = new LibraryService(kernel, {});
    lib.setConfig({configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: [DOC], createdDocIds: [DOC], configuredAt: Date.now()});

    // 1. 批量创建 N 条目（真实 createItem 路径），计量吞吐
    const t0 = Date.now();
    let okCount = 0;
    for (let i = 0; i < N; i++) {
        const kind = i % 3 === 0 ? "code" : i % 3 === 1 ? "url" : "text";
        const md = kind === "code" ? "```sql\nSELECT " + i + ";\n```" : kind === "url" ? "https://example.com/item" + i : "规模测试条目" + i + "：正文内容用于摘要与搜索验证。";
        const r = await lib.createItem({itemType: kind, markdown: md, title: "规模条目" + i});
        if (r.ok) okCount++;
        else { console.log("  createItem 失败 @" + i + ": " + r.message); break; }
    }
    const createMs = Date.now() - t0;
    check("1 批量创建 " + N + " 条目（真实 createItem）", okCount === N, `${okCount}/${N}，耗时 ${createMs}ms（${Math.round(createMs / Math.max(okCount, 1))}ms/条）`);

    // 2. 索引全新重建（2000 条真实块）
    const t1 = Date.now();
    const idx = await lib.ensureIndex(0);
    const buildMs = Date.now() - t1;
    check("2 索引重建", idx.entries.length >= N, `${idx.entries.length} 条，耗时 ${buildMs}ms`);

    // 3. 搜索延迟（2000 条索引内：精确/前缀/子串）
    const searchOnce = (q: string) => {
        const t = Date.now();
        const hits = searchEntries(idx.entries, {text: q}, {favorites: new Set(), recents: new Map(), usage: new Map(), now: Date.now()}, 30);
        return {ms: Date.now() - t, hits: hits.length};
    };
    const s1 = await searchOnce("规模条目100");
    const s2 = await searchOnce("规模条目1");
    const s3 = await searchOnce("正文内容");
    check("3 搜索延迟（精确/前缀/子串）", true, `${s1.ms}/${s2.ms}/${s3.ms} ms，命中 ${s1.hits}/${s2.hits}/${s3.hits}`);
    check("3b 搜索 <50ms 门禁", s1.ms < 50 && s2.ms < 50 && s3.ms < 50, `${s1.ms}/${s2.ms}/${s3.ms}`);

    // 4. ensureIndex 缓存命中（SWR 内复用）
    const t4 = Date.now();
    await lib.ensureIndex();
    const cacheMs = Date.now() - t4;
    check("4 缓存命中复用 <5ms", cacheMs < 5, cacheMs + "ms");

    console.log(`规模性能实证汇总：${results.filter((r) => r.ok).length}/${results.length} 通过`);
    process.exit(results.some((r) => !r.ok) ? 1 : 0);
})().catch((err) => {
    console.error("规模测试异常：" + err.message);
    process.exit(1);
});
