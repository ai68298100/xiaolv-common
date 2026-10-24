# LvCommon (Beta)

> **Unreleased local fix (R238):** Body creation, updates, and import currently accept only a single line or one complete code fence because multi-block integrity is unresolved. The example pack now has 25 items: 8 are safe under this restriction (the original 3 plus five single-line/code starters for email, address, invalid identity placeholders, URLs, and code), while 17 original multi-line templates are rejected. Full resumes, company introductions, and structured examples are unavailable. These protections are not in the published GitHub v0.4.2.

[![CI](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml/badge.svg)](https://github.com/ai68298100/xiaolv-common/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/tag/ai68298100/xiaolv-common?label=version&sort=semver)](https://github.com/ai68298100/xiaolv-common/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A quick-recall content launcher for SiYuan Notes: turn frequently used content — canned replies, email templates, code snippets, links, images, attachments, block structures and block references — into searchable, insertable, source-linked **items anchored to real SiYuan blocks**. Capture once, reuse everywhere; AI helps with tidy-up and variation, while SiYuan blocks stay the single source of truth.

**Highlights**: insert-time variable prompts (text / dropdown / date) · snippet nesting · AI tidy, draft, transform & semantic search · template-pack sharing · usage-count "frequent" sorting · pinyin search · category grouping · mobile bottom sheet · provider protocol.

> Runs fully standalone (no dependency on other Lv plugins), and exposes the `xiaolv-common/v1` protocol for sibling plugins.

> **Released: v0.7.1 (2026-10-24)** · [Download the latest release](https://github.com/ai68298100/xiaolv-common/releases/latest) · Block hierarchy context probe (Alt+H), raw Markdown syntax copy (Alt+M), random integer range generation (1..100), and provenance document path chip.

## Latest Capabilities (Omni-Search Terminal, Headless Integration & Sync Merge · R273~R292)

Omni-Search Terminal & Full SiYuan Block Search:

- **Full SiYuan Block Search (Zero-SQL)**: Deep integration with the official `/api/search/fullTextSearchBlock` endpoint strictly complying with the zero-SQL baseline; sub-second recall across millions of blocks, automated `<mark>` tag stripping, and Kramdown structure preservation.
- **Prefix Switching & Scope Filter Syntax**: Instant scope switching via `@`, `/`, or `sy:` prefixes; supports `in:<path>`, `path:<path>`, and `book:<notebook>` syntax for precision directory-level retrieval.
- **Adaptive Cascading Search**: Automatically recalls matching SiYuan content blocks when common library hits are low (< 4 items), presenting them in elegant section divisions.
- **Breadcrumb Navigation & Highlighting**: Shows `.xlc-row-breadcrumb` badges with document hierarchy; supports multi-keyword and pinyin smoothing highlights on snippets.
- **One-Click Asset Capture (Alt+S)**: Hit `Alt+S` or `Ctrl+Shift+S` to capture any note block into the common library with auto-inherited category and provenance tags; button switches instantly to `✓ Saved`.
- **Quick Look Instant Preview**: Spacebar opens full-document viewport preview for external note blocks with zero latency.
- **Title Pinyin Acronym Boost**: First-letter pinyin acronyms (e.g. `cwbx` for `财务报销`) receive high-priority boosting for instant recall.
- **Recent Query History Chips**: Zero-input state presents clickable recent search chips; supports `Alt+T` to cycle scopes and `Alt+0` to reset.

Headless Automation & Quicker Global Integration:

- **Headless Resolve API (`resolve`)**: UI-free expansion engine that recursively evaluates nested snippets `{{xlc:snippet:...}}`, handles `fills` or fallback defaults, and computes dates, UUIDs, case conversions, and arithmetic formulas.
- **Structured Dynamic Variables Metadata**: Returns `hasVariables: boolean` alongside variable metadata (names, kinds, dropdown options, defaults) so external launchers (e.g. Quicker) can gather user inputs and paste directly into WeChat, Word, QQ, or web browsers.
- **Enriched Metadata Protocol**: Single query outputs `alias`, `tags`, `category`, `varCount`, and `summary` over `xiaolv.common.*` and `window.xiaolvCommon`.
- **Settings Integration Center**: Built-in guide and one-click copy button for Quicker action configuration examples.

Multi-Library Sync Diff & Conflict Merge Engine:

- **Deterministic Fingerprinting**: 32-bit FNV-1a hashing with normalized properties to detect five diff states (`identical`, `added`, `removed`, `modified`, `conflict`).
- **Five Merge Strategies**: Smart merge (`smart-merge`), latest wins (`latest-wins`), fork both (`keep-both`), remote authoritative (`keep-remote`), and local authoritative (`keep-local`).
- **Visual Diff Modal**: Summary metric cards, item diff table, interactive strategy switching, and optional mirror deletion.

Advanced Templates & Security Suite:

- **Computation & Formatting**: Pure recursive-descent math parser (`{{xlc:calc:...}}`), UUID generator, case converters (camel/snake/kebab/pascal), and cross-application rich-text clipboard payload.
- **Security & Privacy**: Batch tag and category governance, export privacy sanitizer (phone/email/token masking and placeholder replacement).

## This release (v0.7.1)

Block Hierarchy Context Probe & Multi-Format Copying:

- **Block Hierarchy Context Probe (`Alt+H`)**: Press `Alt+H` during search to reveal the full document hierarchy path outline; preview metadata adds a clickable `📄 Provenance Path` chip.
- **Raw Markdown Quick Copy (`Alt+M`)**: Copy raw template Markdown syntax with dynamic variables directly to the clipboard, compatible with Pin Window mode (`Alt+P`).
- **Random Range Macro (`{{xlc:random|1..100}}`)**: Supports integer range generation (e.g. `1..100`, `1000..9999`) for test data and verification code templates.

## Previous release (v0.7.0)

Attribute View Database Automation & Dynamic Macros:

- **SiYuan Attribute View (AV Database) Automation Guide**: Added AV database collection guidelines in settings. Because Xiaolv Common snippets are anchored to real blocks with standard `custom-xlc-*` attributes, users can insert an Attribute View and set rule `custom-xlc-id exists` to manage all snippets via native SiYuan tables and boards.
- **Timestamp & ISO Week Dynamic Macros**: Added `{{xlc:timestamp}}` (Unix seconds), `{{xlc:timestamp|ms}}` (milliseconds), and `{{xlc:week}}` (ISO week, e.g. `第43周`, `W43`), accessible via the shortcut variable bar.

## Previous release (v0.6.9)

Live Synced Block (Notion Synced Block counterpart) & Ref Dual-Mode Insertion:

- **⊞ Live Synced Embed Block Insertion (`Shift+Enter`)**: Press `Shift+Enter` to insert the selected entry as a SiYuan native embed block (`insert-embed`). When the common snippet or source block is updated, all inserted instances across your notebook automatically update in real time!
- **＋ Block Reference Link Insertion (`Alt+Enter`)**: Press `Alt+Enter` to insert as a native SiYuan block reference (`insert-ref`).
- **Preview Footer Actions Enhanced**: Explicit buttons for live embed and block ref insertion alongside snapshot text and clipboard copy.

## Previous release (v0.6.8)

Block Ecosystem Integration & Continuous Cross-App Workflows:

- **📌 Pin Window mode (`Alt+P`)**: Search dialog stays open across insertions and copies for continuous multi-field entry in WeChat, Excel, and web forms.
- **Block reference syntax copy (`Alt+R`)**: Instantly formats and copies SiYuan bidirectional block reference syntax `((blockId 'anchor'))` to clipboard for any snippet or external block hit.
- **Open and focus source block (`Alt+D`)**: Quickly navigates and scrolls directly to the source note or block.
- **Multi-select variable type (`multi`)**: Supports `{{xlc:ask:features|Design,Dev,QA|multi}}` with interactive multi-select pills that concatenate cleanly into prompt expansions.

## Previous release (v0.6.7)

Ecosystem Integration Directive Alignment & Release Packaging:

- **Root `./package.zip` flat build output**: Configured Webpack `ZipPlugin` to emit directly to the repository root directory as a flat archive `./package.zip` (586 KiB), resolving automated release and bazaar indexer path issues.
- **English name spacing alignment**: Normalized `displayName.default` to `"Lv Common (Beta)"` (with space, matching the `Lv <Name>` family standard); bumped `minAppVersion` to `"3.8.4"`.
- **Monochrome vector icons upgrade**: Upgraded topbar, sidebar, and breadcrumb icons to the 32×32 monochrome curly-brace symbol (`iconXlcCommon` & `iconLvCommon`).
- **Graceful `{{xlc:checkin:today}}` macro resolution**: Integrates `callBridge` from `src/ecosystem-bridge-kit.ts` for safe checkin item querying with non-throwing fallback text.
- **Raikiri workbench widget registration**: Safely registers the `common-quick-palette` module for instant snippet insertion.
- **Block attributes namespace containment**: All block attributes strictly adhere to `custom-xlc-*`, preserving `icon.png` intact.

## Previous release (v0.6.6)

Dialog Header Unification & Segmented Track Enhancements:

- **Unified `.lv-dialog-title-wrap` dialog header**: Implemented across main search workbench, new item capture dialog, and settings panel (22×22 purple logo + title + version pill).
- **Segmented track active state fix & "All" option**: Fixed class matching for active pill highlight inside `.xlc-segmented-track`; added the "All" default scope pill matching reference design (`All | ...`).
- **`COMMON_CREATED` ecosystem event**: Dispatches `xiaolv:common:item-created` upon successful snippet creation to sync with sibling plugins.

## Previous release (v0.6.5)

Ecosystem Federation & Visual Design Overhaul (Epoch 6 Standards):

- **4-Alias bridge mounting & secure unregistration**: Window bridge supports `window.xiaolvCommon`, `window.LvCommon`, `window.lvCommon`, and `window.siyuanCommon` under first-instance-wins and verified unmounting.
- **Graceful `{{xlc:checkin:today}}` macro resolution**: Integrates `callBridge` from `ecosystem-bridge-kit` for safe querying of checkin items, with non-throwing fallback text.
- **Raikiri workbench widget registration**: Safely registers the `common-quick-palette` module to showcase high-frequency common snippets in the Raikiri launcher.
- **Monochrome vector icons upgrade**: Topbar, sidebar, and breadcrumb icons upgraded to 32×32 monochrome curly-brace symbols (`iconXlcCommon` & `iconLvCommon`).
- **Tuscan Imperial Purple + Cyber Mint Green aesthetic**: Injected `--lv-brand: #9333EA` and `--lv-accent-mint: #10B981`, added physical micro-touch feedback on button press, and unified `.lv-dialog-title-wrap` headers.
- **Engineering compliance**: Flat `./package.zip` output in root; mobile `visualViewport` dynamic keyboard offset; normalized English name `Lv Common (Beta)`.

## Previous release (v0.6.4)

Capture & Authoring Workflow Enhancements:

- **Quick tag appending pills (`.xlc-capture-quick-tags`)**: Form extracts top existing library tags as clickable `+tag` pills for one-click tag assignment without manual typing.
- **Category autocomplete datalist**: Automatically links existing library categories to the category input for unified organization.
- **Variable insertion bar adds toggle syntax**: Adds `{{xlc:ask:clause=content|toggle}}` to the shortcut variable bar in capture and edit forms.

## Previous release (v0.6.3)

Cross-Application Usability & Conditional Clause Execution:

- **Direct "Copy" channel in variable fill cards (`Alt+C`)**: For external workflows in WeChat, Word, Slack, or browsers, users can fill parameters and click "⧉ Copy" or press `Alt+C` to copy the resolved output directly to the clipboard without inserting into SiYuan.
- **Conditional toggle blocks live preview**: When using `{{xlc:ask:clause=text|toggle}}`, the variable card renders an accessible switch; toggling synchronously adds/omits the clause in the live preview.
- **Multi-library sync diff keyword search**: Real-time filtering by title or item ID in the sync diff modal.

## Previous release (v0.6.2)

Inspirations from Raycast / TextExpander & Quality Hardening:

- **Conditional toggle blocks (`{{xlc:ask:name=content|toggle}}`)**: Inspired by TextExpander's Optional Text Blocks and Raycast, introducing boolean toggle/checkbox variables. When toggled on, content is rendered; when toggled off, content is cleanly omitted.
- **Copy raw template action**: Action menu adds `📄 Copy Raw Template (Unexpanded)` for variable items, facilitating easy template sharing and backup.
- **Full-spectrum i18n parity & XSS hardening**: Automated scan across all TypeScript calls ensuring 100% key parity between English and Chinese; refactored settings Bento metrics into native safe DOM elements.
- **Global IME composition defenses**: Comprehensive `isComposing` and `keyCode === 229` interception in quick edit, document picker, and discovery dialogs to eliminate accidental submits.

## Previous release (v0.6.1)

Cross-Feature Usability and Experience Optimizations:

- **Sync diff modal keyword search & status focus**: Real-time keyword search filter (`.xlc-diff-search-input`) by title or item ID; summary cards support click-to-filter toggling to isolate conflicts immediately.
- **Variable quick options with active state**: Quick candidate option pills (`.xlc-varform-quick-options`) highlight active selection (`.xlc-quick-option-pill--selected`) and sync live expansion preview.
- **Bento Grid mobile responsiveness**: Auto-switches to single-column card layout on narrow viewports (`max-width: 620px`) for zero cramped text wrapping.
- **Seamless Quick Look keyboard flow**: Enter/Alt+C/Ctrl+Enter from within the Quick Look viewport closes the overlay smoothly and proceeds directly to insertion or copying.
- **SiYuan 3.8.8+ host lifecycle alignment**: `settingsWindow: true` declaration, `openSetting()` override, storage dirty cache clearing, editor visibility defenses, and `orderBy: 7` relevance ranking.

## Previous release (v0.6.0)

Omni-Search Terminal & Full SiYuan Block Search (Zero-SQL):

- **Full block search with Kramdown fidelity**: Leverages official `/api/search/fullTextSearchBlock` with zero SQL; provides sub-second block retrieval, `<mark>` tag stripping, and structure preservation for code fences, quotes, and headers.
- **Scope prefix switching & block type / path filter syntax**: `@`, `/`, or `sy:` prefix switches instantly to omni mode; supports `type:code` / `type:h` / `type:quote` as well as `in:<path>` and `book:<notebook>` filter parameters.
- **Smart alias derivation & title acronym boost**: One-click asset capture (`Alt+S`) automatically infers pinyin acronyms or English initials as recommended aliases; pinyin acronyms receive high-priority ranking boost.
- **Multi-token secondary re-ranking**: Re-ranks FTS results based on title matching, content density, and structural weights for superior relevance.

Headless Automation & Cross-App Integration:

- **Headless resolve and flash recall by alias (`recall` / `resolve`)**: Exposes `window.xiaolvCommon` and SiYuan protocol commands for external launchers (e.g. Quicker) to recall and evaluate items with expanded macros in a single round-trip.
- **Structured metadata and missing variables contract (`missingVariables`)**: Returns `missingVariables` array so external tools can selectively prompt for required unfilled inputs.
- **Zero-dependency ecosystem adapter**: Safe read-only probing for Checkin, Contacts, and Glean plugins; supports dynamic macro `{{xlc:checkin:today}}`.

Modern Bento Grid Design System & Power Interactions:

- **Bento Grid dual-accent metrics**: Settings panel introduces sunset mango (`🔥 Total Calls`) and soft lilac (`⚡ Efficiency Boost`) metric cards.
- **Segmented pill controller & full-surface pill badges**: Replaces scattered chips with a continuous track (`.xlc-segmented-track`); converts badges and tags into 9999px pills.
- **Power user keyboard workflows**: `Ctrl+Enter` / `Cmd+Enter` instant submit across capture and variable fill forms; quick option pill clicks (`.xlc-varform-quick-options`); list focus halo indicators.
- **Mobile responsiveness**: Floating Action Button (FAB `+`) on mobile/narrow screens; horizontal scroll-snap for tags and search history chips to eliminate layout shift (CLS).

Sync Diff & Clipboard Enhancements:

- **Interactive status filter tabs**: Modal metric cards support click-to-filter, isolating conflict items instantly.
- **Task list checkbox rendering & IAL stripping**: Full support for `- [ ]` and `- [x]` disabled checkbox rendering in clipboard export and details preview, with automatic Kramdown IAL tag stripping.

## Previous release (v0.5.0)

Enhanced dynamic templates & placeholder capabilities:

- **Date arithmetic & Chinese natural language shortcuts**: Dynamic placeholders support `{{xlc:date|+3d}}`, `{{xlc:date|-1w}}`, `{{xlc:date|+1y}}`, `{{xlc:date|next_monday}}`, and localized natural-language phrases such as `{{xlc:date|今天}}`, `{{xlc:date|明天}}`, `{{xlc:date|后天}}`, `{{xlc:date|昨天}}`, `{{xlc:date|下周五}}`, clamped to month-ends on month/year rollovers.
- **Option delimiter normalization**: Variable dropdowns (`{{xlc:ask:plan|Standard, Pro, Flagship}}`) and random placeholders (`{{xlc:random|A, B, C}}`) support Chinese full-width commas (`，`) and enumeration comma (`、`), preventing input-method delimiter misparsing.
- **Variable form default values & prefill**: Equal-sign syntax (`{{xlc:ask:currency=CNY}}`) and single-option fallback defaults; fields are automatically prefilled when opening the fill card while keeping editability intact.
- **Nested snippet visualization & observability**: The preview pane visualizes `{{xlc:snippet:Title}}` chips. `LibraryService` introduces `expandSnippetRefsDetailed` to track expanded titles, missing items, cycle breaks, and recursion depths.

Sharing, import & search enhancements:

- **Template pack dependency preflight**: Markdown packs declare `snippets:` dependencies in the header manifest; imports check against local items and display warning badges for missing snippets.
- **Compact Bundle sharing & direct import**: Export bundles as single-line `xlc-bundle:...` Base64 strings or `xlc://import?bundle=...` URLs for instant sharing and direct one-click import with full conflict policy support.
- **Espanso syntax import fidelity**: Automated code fence inference, safe URL attribute population, and lossless text/markdown conversion.
- **Multi-keyword search delimiter tolerance**: Supports commas, slashes, backslashes, plus signs, semicolons, and pipes as delimiters alongside spaces, with cross-field AND scoring and highlight alignment.
- **Pinyin consecutive syllable smoothing**: Syllable matching now smooths multi-character prefix matching to eliminate highlight flicker during typing.
- **Date range filter model**: `SearchQuery` adds closed-interval `dateRange` filtering across `createdAt` and `updatedAt`.
- **Dedupe agent exclusion**: Exclude the current item ID (`excludeId`) during editing to prevent false positive self-duplicate alerts.

Safety defenses & infrastructure hardening:

- **B-006 Kramdown write-boundary protection**: Restricts body creation/updates to single-line text or a complete code fence; blocks structural elements (`>`, lists, tables, superblocks) before writing to preserve block hierarchy integrity.
- **Static error handling gate**: CI gate `scripts/check-error-handling.cjs` forbids unsafe thrown value property reads, enforcing `toErrorMessage`.
- **Tag delimiter normalization & hash cleanup**: Multi-delimiter support with automatic stripping of native SiYuan `#tag#` prefixes and suffixes.
- **Independent notebook compensation receipt**: Two-step notebook setup exposes compensation receipts (`setup.independent.orphan-notebook`) if rollback deletion fails.

## Previous release (v0.4.2)

Build reusable collections while keeping source notes in place:

- Discovery merges native and custom tags, with exact filtering, tag counts, select-all for the current filter, and batch reference entries. Entries contain references and metadata; source blocks stay in place and their current content is read when used. Copying a content snapshot remains an explicit option.
- Save an exact tag filter as a view, then reopen document, notebook, or document-tree views from Settings. New candidates are selected automatically in reference mode; syncing again skips existing sources. Reference entries offer separate actions to insert current source content, a block reference, or an embed, copy content, and open the source.
- Saving uses a host naming dialog. Fixes cover checkbox selection, overlapping long tags, clipped undo buttons in small windows, and child-document scope validation.
- Notebook views keep the notebook captured during scanning even if the entry document moves. Older rules require saving again. After syncing, closing offers a choice to keep the undo controls or close while retaining added entries. When switching discovery views, confirmation opens the requested target and cancellation keeps the current view.

Search and reuse improvements:

- Multi-keyword matching across fields, highlighting of Chinese characters matched by pinyin, and common polyphonic-word corrections. Query history, clickable tag filters, category badges, per-item usage reset, and a wider search scope from empty Favorites/Recent results make items easier to find.
- Number shortcuts for insert/copy, Tab navigation, and edit/duplicate/delete/favorite shortcuts. Drop text or links into the search panel, or paste outside an input, to open a capture form. The built-in scene pack now contains 25 templates; eight (the original three plus five single-line/code starters) can be imported under the current body restriction, while complex multi-line templates show a rejection reason.
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
| **Common content examples** | Settings → AI assistant → **Import common content examples**: 25 templates across quick guide / address / email / invalid identity placeholder / URL / code starter / contacts / support / AI prompts / dev writing / invoices / returns / reminders / FAQ. Eight currently meet the single-line or complete-code-fence limit; real images, PPT/PDF/DOCX and resume files must be added to SiYuan first. |
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
4. **Organize**: start with categories such as support, email, address, contacts, prompts, writing, and development. Settings → AI assistant → **Import prompt scene pack** provides 25 editable examples, including safe starters for email, address, invalid identity placeholders, URLs, and code alongside the usage guide, contact card, invoice details, return instructions, reminders, and FAQ. Import is explicit and goes through the duplicate policy; it never writes silently. Add real images, PPT/PDF/DOCX, or resume files to SiYuan before saving their resource links; the pack does not install binary attachments.

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
