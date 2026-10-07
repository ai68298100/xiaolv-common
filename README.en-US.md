# LvCommon (小驴常用)

[![CI](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml/badge.svg)](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml)

A quick-recall content launcher for SiYuan Notes: turn frequently used content — canned replies, email templates, code snippets, links, images, attachments, block structures and block references — into searchable, insertable, source-linked **items anchored to real SiYuan blocks**. Capture once, reuse everywhere; AI helps with tidy-up and variation, while SiYuan blocks stay the single source of truth.

> Runs fully standalone (no dependency on other Lv plugins), and exposes the `xiaolv-common/v1` protocol for sibling plugins.

## Scope

**Is**: search → preview → insert / copy / open-source for your reusable content, plus AI tidy & transform.

**Is not**: a password manager, clipboard history, cloud sync service, auto-sender to external apps, JS/SQL executor, a second switcher, or a snippets-CSS manager.

## Core design

1. **SiYuan blocks are the single source of truth.** Each item IS a real block in a library document (plain block or superblock wrapper). The plugin never copies content into a private store; uninstalling loses nothing.
2. **Metadata lives in user-visible block attributes** (`custom-xlc-id/-type/-title/-alias/-tags/-category/-src-doc/-src-block/-url/-target/-created/-updated`), editable from SiYuan's attribute panel.
3. **Sidecar storage** (favorites / recents / sort / providers) is versioned, rebuildable and migratable.
4. **No SQL**: traversal via `getChildBlocks` (document order), invalidation via `checkBlocksExist`, content via `getBlockKramdown`. See ADR 0003 for the embed-block boundary.
5. **Honest capability declarations**: anything not verified on a real device degrades explicitly (e.g. mobile insert falls back to clipboard copy with a notice).

## AI features (off by default — ADR 0005)

Powered by the model **you** configured in SiYuan Settings → AI; the plugin stores no keys.

| Feature | Entry | Data sent |
| --- | --- | --- |
| **AI tidy** | capture form "✦ AI tidy" → title/tag/category suggestions, adopt individually | item content (requires "allow full content" toggle) |
| **AI draft** | describe what you need → draft lands in the form | description (same toggle) |
| **AI transform** | action menu ✦ polish / shorten / formalize / translate / bulletize → preview, then insert-transformed / copy / insert-original (**original never modified**) | item content (same toggle) |
| **AI semantic search** | type `?` + description in the search box → results flagged "AI-picked" | **metadata only** (title/alias/tags/category/summary; never content or source ids) |

Also built-in: **dynamic placeholders** `{{xlc:date}} / {{xlc:time}} / {{xlc:datetime}} / {{xlc:weekday}} / {{xlc:title}} / {{xlc:doc}} / {{xlc:path}} / {{xlc:clipboard}}` replaced at insert/copy time (stored content always keeps the template; `xlc:` namespace never collides with SiYuan templates).

## Variables, snippet nesting & template packs

| Capability | Usage |
| --- | --- |
| **Fill-in on insert** | `{{xlc:ask:field}}` / `{{xlc:ask:field|A,B}}` (dropdown) / `{{xlc:ask:field|date}}` opens a fill card before insert; values apply once, never written back; unfilled falls back to visible `__field__` |
| **Cursor** | `{{xlc:cursor}}` marks the spot (host API: cursor lands after the inserted content) |
| **Snippet nesting** | `{{xlc:snippet:title}}` inlines another item at insert (depth ≤3, cycle-safe; unresolvable refs become visible `__snippet: title__`) |
| **Frequent sort** | Insert/copy counts usage (local, clearable); "⇅ Frequent" = count × recency |
| **Template packs** | Settings → Data → "Template pack": filter by category, export a named `.md` pack with variable list; recipients get real SiYuan blocks |
| **Custom AI transforms** | Settings → AI assistant → custom transforms (≤10), listed beside the five built-ins in the action menu ✦ section |
| **Prompt scene pack** | Settings → AI assistant → import the built-in pack: 10 templates across support / AI prompts / dev writing |
| **Quick capture** | Command "Quick capture clipboard as item" (⌥⇧V): form-less one-step save with type inference and honest duplicate skip |

## B-001 desktop acceptance (one-shot script)

```bash
SIYUAN_ORIGIN=http://127.0.0.1:6806 SIYUAN_TOKEN=<your token> pnpm e2e
```

Mirrors every kernel flow the plugin uses (create library doc → append items + attrs → read-back / search / export → update → cleanup) and prints a per-item ✔/✖ summary.

## Insert semantics per type

| Type | Insert | Copy | Open source |
| --- | --- | --- | --- |
| text | paragraph | plain text | source doc/block |
| markdown | kramdown as-is | markdown | source doc/block |
| url | `[title](url)` | bare URL | browser (http/https only) |
| code | code block (language kept) | raw code | source doc/block |
| image | `![](assets/…)` | markdown link (bitmap copy pending device verification) | asset preview |
| asset | `[name](assets/…)` | markdown link | asset preview |
| blockref | `((id 'anchor'))` reference | content copy (`copy-content`) | target block |
| structure | structure as-is (superblock unwrapped) | markdown | source doc/block |

Missing assets: insert/open fail honestly, copy-link still works. Deleted sources show a "source missing" badge — never silently disappearing.

## xiaolv-common/v1 protocol

```js
const common = app.plugins.find((p) => p.name === "xiaolv-common");
await common.service.search({text: "apology", itemType: "", tag: "", scope: "all"});
await common.service.insert(itemId, {mode: "insert"}); // insert|copy|copy-content|insert-ref|insert-embed|open
common.registerProvider({protocol: "xiaolv-common", protocolVersion: 1, pluginId: "your-plugin", displayName: "Your Plugin"});
common.protocolCommands["xiaolv.common.open"]();
```

Interfaces: `getCapabilities / search / get / save / update / remove / insert / copy / openSource / reindex / getRecent / getFavorites`. Command ids: `xiaolv.common.open / saveSelection / insert / copy / openSource`. Events: `xiaolv:common:item-created / updated / deleted / inserted`. Full integration guide: [docs/provider-guide.md](docs/provider-guide.md).

## Install / upgrade / backup

- **Install**: marketplace (pending) or unzip `package.zip` into `<workspace>/data/plugins/xiaolv-common/`, restart SiYuan, enable in Settings → Marketplace → Downloaded.
- **First use**: click the top-bar icon → choose a library (creating a doc always asks first; or pick an existing doc / a notebook).
- **Upgrade**: overwrite the plugin folder and restart; sidecar schemas migrate automatically; data from newer versions is preserved read-only, never silently downgraded.
- **Backup**: items are ordinary SiYuan documents (synced by SiYuan itself). Export JSON (full items + source refs) or a **Markdown pack ZIP** (`items.md` + `assets/`, readable anywhere). Import validates first, resolves duplicates via skip/overwrite/rename, and never writes partial results.
- **Uninstall**: library docs and block attributes are untouched; the sidecar directory is cleaned by SiYuan.

## Development

```bash
pnpm i
pnpm run check   # tsc --noEmit
pnpm test        # esbuild + node --test (209 tests)
pnpm run build   # dist/ + package.zip
pnpm run test:ui # production UI smoke (15 suites + screenshots)
```

Protocol docs: [AGENTS.md](AGENTS.md) (dev protocol) · [ROADMAP.md](ROADMAP.md) · [docs/adr/](docs/adr/) · [docs/host-contract.md](docs/host-contract.md) · [docs/positioning.md](docs/positioning.md)

## Known limitations (honest list)

- **Desktop/Android real-host acceptance not completed yet** (kernel token + device session pending, see BLOCKERS B-001/B-002/B-003): mobile insert degrades to clipboard copy; bitmap image copy degrades to a markdown link.
- Pinyin search ships with tiny-pinyin (local annotation, toggleable, ADR 0004/R5).
- Tree mode expands root + 3 child-document levels; item index caps at 2000 (truncation is flagged, data stays safe in the library).
- Import conflict detection is by stable logical id (no content-level diff).
- "Pick existing doc" uses keyword search; a full doc-picker awaits a public host API.

## Screenshots

![Desktop search (dual pane)](docs/design/production-desktop-light.png)

![Search match highlighting](docs/design/production-highlight-light.png)

![Empty library onboarding](docs/design/production-empty-library-light.png)

![Provider section](docs/design/production-provider-light.png)
