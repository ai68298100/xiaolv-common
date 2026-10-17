# LvCommon (Beta)

> **Unreleased local fix (R238):** Body creation, updates, and import currently accept only a single line or one complete code fence because multi-block integrity is unresolved. Other multi-line text and structures are rejected before writing; automatic deletion of existing multi-part items is unavailable. Only 3 of the original 20 templates meet this restriction; 17 are rejected. Full resumes, company introductions, and structured examples are unavailable. These protections are not in the published GitHub v0.4.2.

[![CI](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml/badge.svg)](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/tag/ai68298100/xiaolv-common?label=version&sort=semver)](https://github.com/ai68298100/xiaolv-common/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A quick-recall content launcher for SiYuan Notes: turn frequently used content — canned replies, email templates, code snippets, links, images, attachments, block structures and block references — into searchable, insertable, source-linked **items anchored to real SiYuan blocks**. Capture once, reuse everywhere; AI helps with tidy-up and variation, while SiYuan blocks stay the single source of truth.

**Highlights**: insert-time variable prompts (text / dropdown / date) · snippet nesting · AI tidy, draft, transform & semantic search · template-pack sharing · usage-count "frequent" sorting · pinyin search · category grouping · mobile bottom sheet · provider protocol.

> Runs fully standalone (no dependency on other Lv plugins), and exposes the `xiaolv-common/v1` protocol for sibling plugins.

> **Released: v0.4.2 (2026-10-16)** · [Download the latest release](https://github.com/ai68298100/xiaolv-common/releases/latest) · Keep source notes in place with tag discovery, saved views, and reference syncing, plus improved search, keyboard workflows, and insert-target protection.

## This release (v0.4.2)

Build reusable collections while keeping source notes in place:

- Discovery merges native and custom tags, with exact filtering, tag counts, select-all for the current filter, and batch reference entries. Entries contain references and metadata; source blocks stay in place and their current content is read when used. Copying a content snapshot remains an explicit option.
- Save an exact tag filter as a view, then reopen document, notebook, or document-tree views from Settings. New candidates are selected automatically in reference mode; syncing again skips existing sources. Reference entries offer separate actions to insert current source content, a block reference, or an embed, copy content, and open the source.
- Saving uses a host naming dialog. Fixes cover checkbox selection, overlapping long tags, clipped undo buttons in small windows, and child-document scope validation.
- Notebook views keep the notebook captured during scanning even if the entry document moves. Older rules require saving again. After syncing, closing offers a choice to keep the undo controls or close while retaining added entries. When switching discovery views, confirmation opens the requested target and cancellation keeps the current view.

Search and reuse improvements:

- Multi-keyword matching across fields, highlighting of Chinese characters matched by pinyin, and common polyphonic-word corrections. Query history, clickable tag filters, category badges, per-item usage reset, and a wider search scope from empty Favorites/Recent results make items easier to find.
- Number shortcuts for insert/copy, Tab navigation, and edit/duplicate/delete/favorite shortcuts. Drop text or links into the search panel, or paste outside an input, to open a capture form. The built-in scene pack now contains 20 templates.
- Insert targets are captured before asynchronous lookup, content reads, and queue waits. Closed editors or invalid selections fall back to explicit clipboard copy, avoiding insertion into a newly active document. Failed copies remain failures; missing reference sources never silently use stale content.

Verification boundaries: Electron evidence covers specific observed features only. The test mirror also opened the daily workspace and triggered automatic cloud sync; the data impact remains undetermined. Its overall isolation claim has been withdrawn, and further Electron experiments are stopped under B-005. Process checks provide detection only. See the [incident record](https://github.com/ai68298100/xiaolv-common/blob/v0.4.2/docs/electron-isolation-incident-2026-10-16.md) and [acceptance record](https://github.com/ai68298100/xiaolv-common/blob/v0.4.2/docs/electron-acceptance-2026-10-16.md). Android, real AI, selection compatibility after consecutive embeds, and the B-004 settings issue remain open.

## Previous release (v0.4.1)

Overall: keep the dedicated library as the default work set while letting users discover existing content from documents, trees, or notebooks and copy selected items into the library.

Added:

- Editor context menu and command palette entries for the current document and notebook; the discovery panel also supports a selected document tree, notebook, or all notebooks after explicit confirmation.
- Discovery panel with candidate filters, source paths, previews, multi-select add, same-content confirmation, per-item receipts, and safe batch undo.

Improved:

- Capture forms preserve the source type and document captured at invocation time for selections, blocks, clipboard captures, and manual items.
- Candidates live only in the current session; their scope is revalidated before adding, and added items retain source backlinks and refresh an open search panel.
- Discovery has independent limits: 20 notebooks, 200 documents, depth 8, 2,000 blocks, 500 candidates, and 60 seconds; pages show at most 100 candidates. Partial errors preserve usable results. Stop waits for issued kernel requests to finish and starts no new requests.

Limits: discovery never adds items automatically or changes source notes; scanning all notebooks requires confirmation. SiYuan Electron plugin runtime and Android device acceptance remain pending; automated tests do not count as host acceptance.

## Scope

**Is**: search → preview → insert / copy / open-source for your reusable content, plus AI tidy & transform.

**Is not**: a password manager, clipboard history, cloud sync service, auto-sender to external apps, JS/SQL executor, a second switcher, or a snippets-CSS manager.

## Core design

1. **SiYuan blocks are the single source of truth.** Each item IS a real block in a library document (plain block or superblock wrapper). The plugin never copies content into a private store; uninstalling loses nothing.
2. **Metadata lives in user-visible block attributes** (`custom-xlc-id/-type/-title/-alias/-tags/-category/-src-doc/-src-block/-url/-target/-created/-updated`), editable from SiYuan's attribute panel.
3. **Sidecar storage** (favorites / recents / sort / providers) is versioned, rebuildable and migratable.
4. **No SQL**: traversal via `getChildBlocks` (document order), invalidation via `checkBlocksExist`, content via `getBlockKramdown`. See ADR 0003 for the embed-block boundary.
5. **Honest capability declarations**: anything not verified on a real device is labeled accordingly. On mobile, no-target actions fall back to clipboard copy; insertion with a selected target remains unverified on a real device.

## AI features (off by default — ADR 0005)

Powered by the model **you** configured in SiYuan Settings → AI; the plugin stores no keys.

| Feature | Entry | Data sent |
| --- | --- | --- |
| **AI tidy** | capture form "✦ AI tidy" → title/tag/category suggestions, adopt individually | item content (requires "allow full content" toggle) |
| **AI draft** | describe what you need → draft lands in the form | description (same toggle) |
| **AI transform** | action menu ✦ polish / shorten / formalize / translate / bulletize → preview, then insert-transformed / copy / insert-original (**original never modified**) | item content (same toggle) |
| **AI semantic search** | type `?` + description in the search box → results flagged "AI-picked" | **metadata only** (title/alias/tags/category/summary; never content or source ids) |

If AI tidy or draft generation fails, the form keeps a readable error beside the action and offers retry using the latest content or description. Automated checks cover UI recovery; real-model acceptance remains pending.

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
| **Prompt scene pack** | Settings → AI assistant → import the built-in pack: 20 editable templates across quick guide / address / email / contacts / support / AI prompts / dev writing / invoices / returns / reminders / FAQ |
| **Quick capture** | Command "Quick capture clipboard as item" (⌥⇧V): form-less one-step save with type inference and honest duplicate skip |

## B-001 kernel acceptance script

```bash
SIYUAN_ORIGIN=http://127.0.0.1:6806 SIYUAN_TOKEN=<your token> pnpm e2e
```

Covers library creation, items and attributes, read-back/search/export, updates, and cleanup, with a per-item ✔/✖ summary. Kernel acceptance does not establish Electron, real AI, or Android behavior. See [Known limitations](#known-limitations-honest-list) for the partial Electron evidence and the B-005 isolation incident and stop condition.

## Insert semantics per type

| Type | Insert | Copy | Open source |
| --- | --- | --- | --- |
| text | paragraph | plain text | source doc/block |
| markdown | kramdown as-is | markdown | source doc/block |
| url | `[title](url)` | bare URL | browser (http/https only) |
| code | code block (language kept) | raw code | source doc/block |
| image | `![](assets/…)` | markdown link (bitmap copy pending device verification) | asset preview |
| asset | `[name](assets/…)` | markdown link | asset preview |
| blockref | `((id 'anchor'))` reference; separate source-content and embed actions | current source content (`copy-content`) | target block |
| structure | structure as-is (superblock unwrapped) | markdown | source doc/block |

Missing assets: insert/open fail honestly, copy-link still works. Deleted sources show a "source missing" badge — never silently disappearing.

## Quick start and library rules

After choosing a library, build it in this order:

1. **Capture**: save a selection from the context menu, use Quick capture for the clipboard, or click **＋ New** in the panel. To reuse existing notes, choose **Discover common phrases from current document** from the editor context menu or command palette, preview candidates, then add the ones you want. Add a clear title, tags, and category so later searches can find it.
2. **Reuse**: open the top-bar panel, press `Enter` to insert and `Ctrl/⌘+Enter` to copy. On mobile, tap an item to select it and update the preview; use the bottom action to insert when a target is available, or copy as an explicit fallback when no target is available. Long-press opens more actions. Favorites and Frequent sort keep high-use items close. Save a tag-filtered discovery view and reopen it from Settings → Saved views to sync reference entries.
3. **Template**: write `{{xlc:ask:field}}` for a value requested on insert and `{{xlc:ask:field|A,B}}` for a dropdown. Date and clipboard placeholders expand only when called; the stored template stays unchanged.
4. **Organize**: start with categories such as support, email, address, contacts, prompts, writing, and development. Settings → AI assistant → **Import prompt scene pack** provides 20 editable examples, including a usage guide, email signature, address, contact card, invoice details, return instructions, reminders, and FAQ. Import is explicit and goes through the duplicate policy; it never writes silently.

Keep one scenario per item, turn changing details (recipient, date, amount) into variables, and use tags to connect related variants.

## xiaolv-common/v1 protocol

```js
const common = app.plugins.find((p) => p.name === "xiaolv-common");
await common.service.search({text: "apology", itemType: "", tag: "", scope: "all"});
await common.service.insert(itemId, {mode: "insert"}); // insert|insert-content|copy|copy-content|insert-ref|insert-embed|open
common.registerProvider({protocol: "xiaolv-common", protocolVersion: 1, pluginId: "your-plugin", displayName: "Your Plugin"});
common.protocolCommands["xiaolv.common.open"]();
```

Interfaces: `getCapabilities / search / get / save / update / remove / insert / copy / openSource / reindex / getRecent / getFavorites`. Command ids: `xiaolv.common.open / saveSelection / insert / copy / openSource`; discovery commands are `discoverCurrentDocument / discoverCurrentNotebook / previewDiscoveryCandidate / addDiscoveryCandidate / closeDiscoverySession / beginDiscoveryBatch / finishDiscoveryBatch / undoDiscoveryBatch`. Selected-tree, selected-notebook, and all-notebook scopes are available in the discovery panel. Events: `xiaolv:common:item-created / updated / deleted / inserted`. Full integration guide: [docs/provider-guide.md](docs/provider-guide.md).

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
pnpm test        # esbuild + node --test
pnpm run build   # dist/ + package.zip
pnpm run test:ui # production UI smoke + screenshots
```

Protocol docs: [AGENTS.md](AGENTS.md) (dev protocol) · [ROADMAP.md](ROADMAP.md) · [docs/adr/](docs/adr/) · [docs/host-contract.md](docs/host-contract.md) · [docs/positioning.md](docs/positioning.md)

## Known limitations (honest list)

- **Host evidence has limits**: independent kernel flows have passed, and SiYuan 3.8.7 / Electron 44.7.0 has partial feature observations. The test mirror's overall isolation claim was withdrawn after it opened the daily workspace and triggered cloud sync; the data impact is undetermined. Further Electron experiments remain stopped under B-005; process checks do not replace operating-system isolation. See the [incident record](https://github.com/ai68298100/xiaolv-common/blob/v0.4.2/docs/electron-isolation-incident-2026-10-16.md) and [blockers](https://github.com/ai68298100/xiaolv-common/blob/v0.4.2/BLOCKERS.md).
- Real AI, Android touch behavior, and bitmap clipboard copy remain unverified. Mobile actions without a target fall back to copy; targeted insertion remains unverified on a real device. Bitmap copy falls back to a Markdown link. Consecutive reference/embed actions can invalidate the host selection and cause explicit copy fallback. The B-004 settings issue remains open despite finite stress samples not reproducing it.
- Saved views support documents, the current notebook, and document trees, up to 20 rules. Selected-notebook/all-notebook discovery remains available manually but cannot be saved as a view. Syncing requires a user action; it does not run automatically in the background. Older notebook rules without a fixed target must be saved again.
- Pinyin search ships with tiny-pinyin (local annotation, toggleable, ADR 0004/R5), plus a small dictionary correcting common polyphonic words; it is not a complete pronunciation dictionary.
- Tree mode expands root + 3 child-document levels; item index caps at 2000 (truncation is flagged, data stays safe in the library).
- Import conflict detection is by stable logical id (no content-level diff).
- "Pick existing doc" uses keyword search; a full doc-picker awaits a public host API.

## Screenshots

![Desktop search (dual pane)](docs/design/production-desktop-light.png)

![Search match highlighting](docs/design/production-highlight-light.png)

![Empty library onboarding](docs/design/production-empty-library-light.png)

![Provider section](docs/design/production-provider-light.png)
