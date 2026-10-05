(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // scripts/harness/stub-dom.cjs
  var require_stub_dom = __commonJS({
    "scripts/harness/stub-dom.cjs"(exports, module) {
      "use strict";
      var StubDialog = class {
        constructor(options) {
          this.options = options || {};
          const root = document.createElement("div");
          root.className = "b3-dialog";
          root.style.position = "fixed";
          root.style.inset = "0";
          root.style.zIndex = "100";
          const container = document.createElement("div");
          container.className = "b3-dialog__container";
          if (this.options.width) container.style.width = this.options.width;
          if (this.options.height) container.style.height = this.options.height;
          container.style.margin = "40px auto";
          const title = document.createElement("div");
          title.className = "b3-dialog__header";
          title.textContent = this.options.title || "";
          const content = document.createElement("div");
          content.className = "b3-dialog__content";
          container.appendChild(title);
          container.appendChild(content);
          root.appendChild(container);
          this.element = root;
          this.containerElement = container;
          document.body.appendChild(root);
        }
        open() {
          if (typeof this.options.destroyCallback !== "function") return;
          this._destroy = () => {
            this.element.remove();
            this.options.destroyCallback();
          };
        }
        destroy() {
          if (this._destroy) this._destroy();
          else if (this.element) this.element.remove();
        }
      };
      module.exports = {
        Dialog: StubDialog,
        confirm: () => {
        },
        showMessage: () => {
        },
        getActiveEditor: () => null,
        openTab: () => {
        },
        fetchSyncPost: async () => ({ code: -1, msg: "stub", data: null })
      };
    }
  });

  // src/constants.ts
  var PROTOCOL_NAME, LIMITS, EXPORT_SCHEMA_VERSION;
  var init_constants = __esm({
    "src/constants.ts"() {
      PROTOCOL_NAME = "xiaolv-common";
      LIMITS = {
        title: 512,
        alias: 256,
        tag: 64,
        tags: 32,
        category: 64,
        summary: 240,
        contentChars: 1e5,
        queryChars: 200,
        maxItems: 2e3,
        maxDocs: 200,
        maxFavorites: 500,
        maxRecents: 200,
        maxProviders: 32,
        maxImportBytes: 4 * 1024 * 1024,
        walkDepth: 8,
        kernelTimeoutMs: 8e3
      };
      EXPORT_SCHEMA_VERSION = 1;
    }
  });

  // src/model/pinyin.ts
  function createNoopPinyinAdapter() {
    return {
      capabilities: { initials: false, fullPinyin: false },
      expand(query) {
        const q = query.trim();
        return q ? [q] : [];
      },
      annotate() {
        return null;
      }
    };
  }
  function getPinyinAdapter() {
    return active;
  }
  var active;
  var init_pinyin = __esm({
    "src/model/pinyin.ts"() {
      active = createNoopPinyinAdapter();
    }
  });

  // src/model/search.ts
  var search_exports = {};
  __export(search_exports, {
    collectTags: () => collectTags,
    listByScope: () => listByScope,
    matchEntry: () => matchEntry,
    passesFilters: () => passesFilters,
    searchEntries: () => searchEntries
  });
  function normalizeText(s) {
    return s.toLowerCase().replace(/\s+/g, " ").trim();
  }
  function scoreHaystack(haystack, needle, weight, prefixWeight) {
    if (!needle) return 0;
    const idx = haystack.indexOf(needle);
    if (idx === -1) return 0;
    let score = weight;
    if (idx === 0 && prefixWeight !== void 0) score += prefixWeight;
    if (haystack === needle) score += 4;
    return score;
  }
  function matchEntry(entry, rawQuery) {
    const expansions = getPinyinAdapter().expand(rawQuery.slice(0, LIMITS.queryChars));
    if (expansions.length === 0) return null;
    const title = normalizeText(entry.title);
    const alias = normalizeText(entry.alias);
    const tags = entry.tags.map(normalizeText);
    const category = normalizeText(entry.category);
    const summary = normalizeText(entry.summary);
    let best = null;
    for (const q of expansions.map(normalizeText)) {
      if (!q) continue;
      const candidates = [
        { score: scoreHaystack(title, q, 8, 3), matchedBy: "title" },
        { score: scoreHaystack(alias, q, 6, 2), matchedBy: "alias" },
        { score: Math.max(0, ...tags.map((t) => scoreHaystack(t, q, 4))), matchedBy: "tags" },
        { score: scoreHaystack(category, q, 4), matchedBy: "category" },
        { score: scoreHaystack(summary, q, 2), matchedBy: "summary" },
        // 拼音注解（适配器启用时才存在）：全拼/首字母低权重命中
        { score: entry.py ? scoreHaystack(entry.py, q, 3) : 0, matchedBy: "pinyin" },
        { score: entry.pyi ? scoreHaystack(entry.pyi, q, 3, 2) : 0, matchedBy: "pinyin-initials" }
      ];
      const top = candidates.reduce((a, b) => b.score > a.score ? b : a, candidates[0]);
      if (top.score > 0 && (!best || top.score > best.score)) best = top;
    }
    return best ? { entry, score: best.score, matchedBy: best.matchedBy } : null;
  }
  function passesFilters(entry, query, ctx) {
    if (query.itemType && entry.itemType !== query.itemType) return false;
    if (query.tag && !entry.tags.includes(query.tag)) return false;
    if (query.category && entry.category !== query.category) return false;
    if (query.scope === "favorites" && !ctx.favorites.has(entry.id)) return false;
    return true;
  }
  function compareResults(a, b, ctx) {
    var _a, _b, _c, _d, _e, _f;
    if (!ctx.sort || ctx.sort === "manual") {
      const ma = (_b = (_a = ctx.manualOrder) == null ? void 0 : _a.get(a.entry.id)) != null ? _b : Number.MAX_SAFE_INTEGER;
      const mb = (_d = (_c = ctx.manualOrder) == null ? void 0 : _c.get(b.entry.id)) != null ? _d : Number.MAX_SAFE_INTEGER;
      if (ma !== mb) return ma - mb;
    }
    if (b.score !== a.score) return b.score - a.score;
    if (ctx.sort === "title" && a.score === 0 && b.score === 0) {
      return a.entry.title.localeCompare(b.entry.title, "zh-Hans-CN");
    }
    const ra = (_e = ctx.recents.get(a.entry.id)) != null ? _e : 0;
    const rb = (_f = ctx.recents.get(b.entry.id)) != null ? _f : 0;
    if (rb !== ra) return rb - ra;
    if (b.entry.updatedAt !== a.entry.updatedAt) return b.entry.updatedAt - a.entry.updatedAt;
    return a.order - b.order;
  }
  function searchEntries(entries, query, ctx, cap = 100) {
    const results = [];
    for (let order = 0; order < entries.length; order++) {
      const entry = entries[order];
      if (!passesFilters(entry, query, ctx)) continue;
      const text = query.text.trim();
      if (text) {
        const m = matchEntry(entry, text);
        if (m) results.push({ ...m, order });
      } else {
        results.push({ entry, score: 0, matchedBy: "none", order });
      }
    }
    results.sort((a, b) => compareResults(a, b, ctx));
    return results.slice(0, cap);
  }
  function listByScope(entries, scope, ctx, cap = 100) {
    if (scope === "favorites") {
      return entries.map((entry, order) => ({ entry, order })).filter(({ entry }) => ctx.favorites.has(entry.id)).sort((a, b) => compareResults(
        { entry: a.entry, score: 0, matchedBy: "none", order: a.order },
        { entry: b.entry, score: 0, matchedBy: "none", order: b.order },
        ctx
      )).slice(0, cap).map(({ entry }) => entry);
    }
    return entries.filter((e) => ctx.recents.has(e.id)).sort((a, b) => {
      var _a, _b;
      return ((_a = ctx.recents.get(b.id)) != null ? _a : 0) - ((_b = ctx.recents.get(a.id)) != null ? _b : 0);
    }).slice(0, cap);
  }
  function collectTags(entries) {
    const tags = /* @__PURE__ */ new Set();
    for (const e of entries) for (const t of e.tags) tags.add(t);
    return Array.from(tags).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }
  var init_search = __esm({
    "src/model/search.ts"() {
      init_constants();
      init_pinyin();
    }
  });

  // src/ui/dialog.ts
  var import_siyuan = __toESM(require_stub_dom());

  // src/model/item.ts
  init_constants();
  var ITEM_TYPES = [
    "text",
    "markdown",
    "url",
    "code",
    "image",
    "asset",
    "blockref",
    "structure"
  ];

  // src/ui/dialog.ts
  var TYPE_BADGES = {
    text: "TXT",
    markdown: "MD",
    url: "URL",
    code: "CODE",
    image: "IMG",
    asset: "FILE",
    blockref: "REF",
    structure: "BLK"
  };
  var TRANSFORM_KINDS = ["polish", "shorten", "formal", "translate-en", "bulletize"];
  var CommonSearchDialog = class {
    constructor(deps, ctx) {
      this.deps = deps;
      this.dialog = null;
      this.results = [];
      this.providerRows = [];
      this.activeProvider = -1;
      this.aiResults = false;
      this.activeIndex = 0;
      this.searchSeq = 0;
      this.previewSeq = 0;
      this.currentScope = "all";
      this.lastPreviewId = null;
      /** 动作菜单 document 监听兜底清理（destroy 时调用；防键盘关弹窗残留监听） */
      this.menuDismiss = null;
      this.inputDebounce = null;
      /** IME 组合输入中（中文输入法组词期间跳过刷新，compositionend 后统一刷新） */
      this.isComposing = false;
      this.ctx = ctx;
    }
    open() {
      const isMobile = this.deps.isMobile();
      const content = this.buildDom(isMobile);
      this.dialog = new import_siyuan.Dialog({
        title: this.deps.t("pluginName"),
        content: "",
        width: isMobile ? "100vw" : "min(760px, 94vw)",
        height: isMobile ? "100vh" : "min(600px, 84vh)",
        destroyCallback: () => {
          this.dialog = null;
          this.deps.close();
        }
      });
      const body = this.dialog.element.querySelector(".b3-dialog__content");
      if (body) {
        body.innerHTML = "";
        body.appendChild(content);
      }
      const container = this.dialog.element.querySelector(".b3-dialog__container");
      if (container && isMobile) container.classList.add("xlc-sheet");
      const input = this.dialog.element.querySelector(".xlc-search-input");
      if (input) {
        const last = this.deps.getLastQuery();
        if (last) {
          input.value = last;
          this.currentScope = "all";
        }
        input.focus();
      }
      void this.refresh();
    }
    updateContext(ctx) {
      this.ctx = ctx;
    }
    buildDom(isMobile) {
      const root = document.createElement("div");
      root.className = "xlc-dialog" + (isMobile ? " xlc-dialog--mobile" : "");
      const top = document.createElement("div");
      top.className = "xlc-top";
      const search = document.createElement("div");
      search.className = "xlc-search";
      const qMark = document.createElement("span");
      qMark.className = "xlc-search-q";
      qMark.textContent = "?";
      qMark.title = this.deps.t("aiSemanticHint");
      const input = document.createElement("input");
      input.className = "b3-text-field xlc-search-input";
      input.placeholder = this.deps.t("searchPlaceholder");
      input.setAttribute("aria-label", this.deps.t("searchPlaceholder"));
      input.addEventListener("input", () => {
        this.currentScope = "all";
        this.deps.setLastQuery(input.value);
        if (this.isComposing) return;
        if (this.inputDebounce) clearTimeout(this.inputDebounce);
        this.inputDebounce = setTimeout(() => void this.refresh(), 200);
      });
      input.addEventListener("compositionstart", () => {
        this.isComposing = true;
      });
      input.addEventListener("compositionend", () => {
        this.isComposing = false;
        this.currentScope = "all";
        if (this.inputDebounce) clearTimeout(this.inputDebounce);
        this.inputDebounce = setTimeout(() => void this.refresh(), 50);
      });
      input.addEventListener("keydown", (e) => void this.onKeydown(e));
      search.appendChild(qMark);
      search.appendChild(input);
      top.appendChild(search);
      root.appendChild(top);
      const filters = document.createElement("div");
      filters.className = "xlc-filters";
      const typeSelect = document.createElement("select");
      typeSelect.className = "b3-select xlc-type-select";
      typeSelect.setAttribute("aria-label", this.deps.t("type"));
      const allOpt = document.createElement("option");
      allOpt.value = "";
      allOpt.textContent = this.deps.t("filterAll");
      typeSelect.appendChild(allOpt);
      for (const t of ITEM_TYPES) {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = this.deps.t(`type.${t}`);
        typeSelect.appendChild(opt);
      }
      const savedFilters = this.deps.getFilters();
      if (savedFilters.type) typeSelect.value = savedFilters.type;
      typeSelect.addEventListener("change", () => {
        var _a;
        this.deps.setFilters({ type: typeSelect.value, tag: (_a = tagSelect == null ? void 0 : tagSelect.value) != null ? _a : "" });
        void this.refresh();
      });
      filters.appendChild(typeSelect);
      const tagSelect = document.createElement("select");
      tagSelect.className = "b3-select xlc-tag-select";
      tagSelect.setAttribute("aria-label", this.deps.t("tags"));
      if (savedFilters.tag) tagSelect.value = savedFilters.tag;
      void this.deps.getTags().then((tags) => {
        const first = document.createElement("option");
        first.value = "";
        first.textContent = this.deps.t("tags");
        tagSelect.appendChild(first);
        for (const tag of tags) {
          const opt = document.createElement("option");
          opt.value = tag;
          opt.textContent = tag;
          tagSelect.appendChild(opt);
        }
        if (savedFilters.tag && tags.includes(savedFilters.tag)) tagSelect.value = savedFilters.tag;
      });
      tagSelect.addEventListener("change", () => {
        this.deps.setFilters({ type: typeSelect.value, tag: tagSelect.value });
        void this.refresh();
      });
      filters.appendChild(tagSelect);
      for (const scope of ["favorites", "recent"]) {
        const chip = document.createElement("button");
        chip.className = "xlc-chip xlc-scope-chip";
        chip.dataset.scope = scope;
        chip.textContent = (scope === "favorites" ? "\u2605 " : "\u{1F550} ") + this.deps.t(`filter${scope === "favorites" ? "Favorites" : "Recent"}`);
        chip.addEventListener("click", () => {
          this.currentScope = this.currentScope === scope ? "all" : scope;
          this.syncScopeChips();
          void this.refresh();
        });
        filters.appendChild(chip);
      }
      const aiBanner = document.createElement("span");
      aiBanner.className = "xlc-chip xlc-ai-banner";
      aiBanner.style.display = "none";
      filters.appendChild(aiBanner);
      const sortChip = document.createElement("button");
      sortChip.className = "xlc-chip xlc-sort-chip";
      const paintSort = () => {
        const sort = this.deps.getSort();
        sortChip.textContent = "\u21C5 " + this.deps.t(`sort.${sort}`);
      };
      paintSort();
      sortChip.addEventListener("click", () => {
        this.deps.cycleSort();
        paintSort();
        void this.refresh();
      });
      filters.appendChild(sortChip);
      root.appendChild(filters);
      const status = document.createElement("div");
      status.className = "xlc-status";
      status.setAttribute("aria-live", "polite");
      root.appendChild(status);
      const bodyWrap = document.createElement("div");
      bodyWrap.className = "xlc-body";
      const list = document.createElement("div");
      list.className = "xlc-list";
      list.setAttribute("role", "listbox");
      list.setAttribute("aria-label", this.deps.t("pluginName"));
      list.addEventListener("click", (e) => {
        if (e.target.closest(".xlc-row-action")) return;
        const row = e.target.closest("[data-xlc-index]");
        if (!row) return;
        const entry = this.results[Number(row.dataset.xlcIndex)];
        if (entry) void this.runPrimary(entry);
      });
      list.addEventListener("mouseover", (e) => {
        if (isMobile) return;
        const row = e.target.closest("[data-xlc-index]");
        if (!row) return;
        const entry = this.results[Number(row.dataset.xlcIndex)];
        if (entry && this.activeIndex !== Number(row.dataset.xlcIndex)) {
          this.activeIndex = Number(row.dataset.xlcIndex);
          this.paintActive();
          this.schedulePreview(entry);
        }
      });
      this.attachLongPress(list, isMobile);
      bodyWrap.appendChild(list);
      if (!isMobile) {
        const pane = document.createElement("div");
        pane.className = "xlc-pane";
        pane.appendChild(this.buildPaneHead());
        const warn = document.createElement("div");
        warn.className = "xlc-pane-warn";
        warn.style.display = "none";
        pane.appendChild(warn);
        const paneBody = document.createElement("div");
        paneBody.className = "xlc-pane-body";
        paneBody.textContent = this.deps.t("previewUnavailable");
        pane.appendChild(paneBody);
        pane.appendChild(this.buildPaneFoot());
        bodyWrap.appendChild(pane);
      }
      root.appendChild(bodyWrap);
      const footer = document.createElement("div");
      footer.className = "xlc-footer";
      const hintText = document.createElement("span");
      hintText.textContent = isMobile ? this.deps.t("usageHintMobile") : this.deps.t("usageHint");
      footer.appendChild(hintText);
      const gear = document.createElement("button");
      gear.className = "b3-button b3-button--text xlc-btn-ghost xlc-footer-gear";
      gear.textContent = "\u2699 " + this.deps.t("openSettings");
      gear.addEventListener("click", () => {
        this.destroy();
        this.deps.openSetup();
      });
      footer.appendChild(gear);
      root.appendChild(footer);
      return root;
    }
    buildPaneHead() {
      const head = document.createElement("div");
      head.className = "xlc-pane-head";
      const title = document.createElement("span");
      title.className = "xlc-pane-title";
      head.appendChild(title);
      const badge = document.createElement("span");
      badge.className = "xlc-badge xlc-badge--ai xlc-pane-ai";
      badge.style.display = "none";
      badge.textContent = "\u2726 " + this.deps.t("aiFound");
      head.appendChild(badge);
      return head;
    }
    buildPaneFoot() {
      const foot = document.createElement("div");
      foot.className = "xlc-pane-foot";
      const insert = document.createElement("button");
      insert.className = "b3-button xlc-btn-primary";
      insert.textContent = this.deps.t("insert");
      insert.addEventListener("click", () => {
        const entry = this.results[this.activeIndex];
        if (entry) void this.runPrimary(entry);
      });
      const copy = document.createElement("button");
      copy.className = "b3-button";
      copy.textContent = this.deps.t("copy");
      copy.addEventListener("click", () => {
        const entry = this.results[this.activeIndex];
        if (entry) void this.deps.runAction(entry.id, "copy");
      });
      const spacer = document.createElement("span");
      spacer.className = "xlc-foot-spacer";
      const source = document.createElement("button");
      source.className = "b3-button b3-button--text xlc-btn-ghost";
      source.textContent = this.deps.t("openSource");
      source.addEventListener("click", () => {
        const entry = this.results[this.activeIndex];
        if (entry) void this.deps.openSource(entry.id);
      });
      const edit = document.createElement("button");
      edit.className = "b3-button b3-button--text xlc-btn-ghost";
      edit.textContent = this.deps.t("edit");
      edit.addEventListener("click", () => {
        const entry = this.results[this.activeIndex];
        if (entry) void this.deps.editItem(entry.id);
      });
      foot.appendChild(insert);
      foot.appendChild(copy);
      foot.appendChild(spacer);
      foot.appendChild(source);
      foot.appendChild(edit);
      return foot;
    }
    attachLongPress(list, isMobile) {
      let pressTimer;
      let startY = 0;
      list.addEventListener("touchstart", (e) => {
        var _a, _b;
        startY = (_b = (_a = e.touches[0]) == null ? void 0 : _a.clientY) != null ? _b : 0;
        const row = e.target.closest("[data-xlc-index]");
        if (!row) return;
        const entry = this.results[Number(row.dataset.xlcIndex)];
        if (!entry) return;
        pressTimer = setTimeout(() => void this.showActionMenu(entry), 550);
      }, { passive: true });
      list.addEventListener("touchmove", (e) => {
        var _a, _b;
        const dy = Math.abs(((_b = (_a = e.touches[0]) == null ? void 0 : _a.clientY) != null ? _b : 0) - startY);
        if (dy > 10 && pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = void 0;
        }
      }, { passive: true });
      list.addEventListener("touchend", () => {
        if (pressTimer) clearTimeout(pressTimer);
      });
      list.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const row = e.target.closest("[data-xlc-index]");
        const entry = row ? this.results[Number(row.dataset.xlcIndex)] : this.results[this.activeIndex];
        if (entry) void this.showActionMenu(entry);
      });
      void isMobile;
    }
    syncScopeChips() {
      var _a;
      (_a = this.dialog) == null ? void 0 : _a.element.querySelectorAll(".xlc-scope-chip").forEach((chip) => {
        chip.classList.toggle("xlc-chip--on", chip.dataset.scope === this.currentScope);
      });
    }
    buildQuery() {
      var _a, _b, _c, _d, _e, _f, _g;
      const el = (_a = this.dialog) == null ? void 0 : _a.element;
      const text = (_c = (_b = el == null ? void 0 : el.querySelector(".xlc-search-input")) == null ? void 0 : _b.value) != null ? _c : "";
      const itemType = (_e = (_d = el == null ? void 0 : el.querySelector(".xlc-type-select")) == null ? void 0 : _d.value) != null ? _e : "";
      const tag = (_g = (_f = el == null ? void 0 : el.querySelector(".xlc-tag-select")) == null ? void 0 : _f.value) != null ? _g : "";
      return { text, itemType, tag, scope: this.currentScope };
    }
    async refresh() {
      var _a, _b, _c, _d;
      const seq = ++this.searchSeq;
      const query = this.buildQuery();
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      const status = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-status");
      const footer = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-footer");
      const aiBanner = (_d = this.dialog) == null ? void 0 : _d.element.querySelector(".xlc-ai-banner");
      if (!list) return;
      this.lastPreviewId = null;
      let total = 0;
      let truncated = false;
      let loading = false;
      let loadError;
      try {
        const text = query.text.trim();
        if (text.startsWith("?") && text.length > 1) {
          const aiResult = await this.deps.aiSemantic(text.slice(1));
          if (seq !== this.searchSeq) return;
          if (aiResult.ok) {
            this.results = aiResult.entries;
            this.aiResults = true;
            total = aiResult.entries.length;
          } else {
            this.results = [];
            this.aiResults = false;
            if (status) status.textContent = aiResult.message;
          }
          if (aiBanner) aiBanner.style.display = this.aiResults && this.results.length ? "" : "none";
          if (aiBanner && this.aiResults) aiBanner.textContent = `\u2726 ${this.deps.t("aiFound")} \xB7 ${this.results.length}`;
        } else {
          const result = await this.deps.search(query);
          if (seq !== this.searchSeq) return;
          this.results = result.entries;
          total = result.total;
          truncated = result.truncated;
          loading = result.loading === true;
          loadError = result.error;
          this.aiResults = false;
          if (aiBanner) aiBanner.style.display = "none";
        }
      } catch (err) {
        if (seq !== this.searchSeq) return;
        this.results = [];
        if (status) status.textContent = this.deps.t("kernelError", err.message);
        this.renderList(list);
        return;
      }
      if (seq !== this.searchSeq) return;
      this.activeIndex = 0;
      this.activeProvider = -1;
      if (status) {
        if (this.results.length) {
          status.textContent = "";
        } else if (loadError) {
          status.textContent = this.deps.t("kernelError", loadError);
        } else if (loading) {
          status.textContent = this.deps.t("indexing");
        } else if (query.text.trim() && !query.text.trim().startsWith("?") && this.deps.aiEnabled()) {
          status.textContent = this.deps.t("semanticSuggestion");
        } else {
          status.textContent = this.deps.t("empty");
        }
      }
      if (footer) {
        footer.textContent = (this.deps.isMobile() ? this.deps.t("usageHintMobile") : this.deps.t("usageHint")) + " \uFF5C " + this.deps.t("totalItems", String(total)) + (truncated ? " \u26A0" : "");
        const gear = document.createElement("button");
        gear.className = "b3-button b3-button--text xlc-btn-ghost xlc-footer-gear";
        gear.textContent = "\u2699 " + this.deps.t("openSettings");
        gear.addEventListener("click", () => {
          this.destroy();
          this.deps.openSetup();
        });
        footer.appendChild(gear);
      }
      this.providerRows = [];
      const q = query.text.trim();
      if (q && !q.startsWith("?")) {
        try {
          this.providerRows = await this.deps.providerSearch(q);
        } catch {
          this.providerRows = [];
        }
        if (seq !== this.searchSeq) return;
      }
      this.renderList(list);
      this.updatePreview();
    }
    renderList(list) {
      var _a;
      list.innerHTML = "";
      for (let i = 0; i < this.results.length; i++) {
        const entry = this.results[i];
        const row = document.createElement("div");
        row.className = "xlc-row" + (i === this.activeIndex ? " xlc-row--active" : "");
        row.dataset.xlcIndex = String(i);
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", i === this.activeIndex ? "true" : "false");
        const main = document.createElement("div");
        main.className = "xlc-row-main";
        const title = document.createElement("div");
        title.className = "xlc-row-title";
        if (i < 9) {
          const ordinal = document.createElement("span");
          ordinal.className = "xlc-row-ordinal";
          ordinal.textContent = String(i + 1);
          ordinal.title = this.deps.t("usageHint");
          title.appendChild(ordinal);
        }
        const badge = document.createElement("span");
        badge.className = `xlc-badge xlc-badge--${entry.itemType}`;
        badge.textContent = (_a = TYPE_BADGES[entry.itemType]) != null ? _a : "TXT";
        title.appendChild(badge);
        const titleText = document.createElement("span");
        titleText.className = "xlc-row-titletext";
        titleText.textContent = entry.title || this.deps.t("unknownType");
        title.appendChild(titleText);
        if (this.deps.isFavorite(entry.id)) {
          const starMini = document.createElement("span");
          starMini.className = "xlc-row-favmark";
          starMini.textContent = "\u2605";
          title.appendChild(starMini);
        }
        main.appendChild(title);
        const meta = document.createElement("div");
        meta.className = "xlc-row-meta";
        meta.textContent = [entry.tags.join(" / "), entry.summary].filter(Boolean).join(" \xB7 ").slice(0, 160);
        main.appendChild(meta);
        row.appendChild(main);
        if (this.deps.isSourceMissing(entry)) {
          const warn = document.createElement("span");
          warn.className = "xlc-badge xlc-badge--warn";
          warn.textContent = "\u26A0 " + this.deps.t("sourceMissing");
          row.appendChild(warn);
        }
        const star = document.createElement("button");
        star.className = "b3-button b3-button--small xlc-row-action";
        star.textContent = this.deps.isFavorite(entry.id) ? "\u2605" : "\u2606";
        star.setAttribute("aria-label", this.deps.isFavorite(entry.id) ? this.deps.t("unfavorite") : this.deps.t("favorite"));
        star.addEventListener("click", (e) => {
          e.stopPropagation();
          this.deps.toggleFavorite(entry.id);
          star.textContent = this.deps.isFavorite(entry.id) ? "\u2605" : "\u2606";
          void this.refreshPreservingPosition();
        });
        row.appendChild(star);
        list.appendChild(row);
      }
      if (this.providerRows.length > 0) {
        const header = document.createElement("div");
        header.className = "xlc-provider-header";
        header.textContent = "\u2726 " + this.deps.t("providerSection") + " \xB7 " + this.providerRows.length;
        list.appendChild(header);
        for (const row of this.providerRows) {
          const el = document.createElement("div");
          el.className = "xlc-row xlc-row--provider";
          el.dataset.xlcVirtualId = row.virtualId;
          const main = document.createElement("div");
          main.className = "xlc-row-main";
          const title = document.createElement("div");
          title.className = "xlc-row-title";
          const badge = document.createElement("span");
          badge.className = "xlc-badge xlc-badge--ai";
          badge.textContent = row.providerName.slice(0, 12);
          title.appendChild(badge);
          const titleText = document.createElement("span");
          titleText.className = "xlc-row-titletext";
          titleText.textContent = row.title || row.payload.slice(0, 40);
          title.appendChild(titleText);
          main.appendChild(title);
          const meta = document.createElement("div");
          meta.className = "xlc-row-meta";
          meta.textContent = row.payload.slice(0, 120);
          main.appendChild(meta);
          el.appendChild(main);
          el.addEventListener("click", () => void this.showProviderMenu(row, el));
          el.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            void this.showProviderMenu(row, el);
          });
          list.appendChild(el);
        }
      }
      this.paintActive();
    }
    async showProviderMenu(row, anchor) {
      var _a, _b;
      const menu = document.createElement("div");
      menu.className = "xlc-menu";
      const lbl = document.createElement("div");
      lbl.className = "xlc-menu-lbl";
      lbl.textContent = row.providerName + " \xB7 " + this.deps.t("providerSection");
      menu.appendChild(lbl);
      const sec = document.createElement("div");
      sec.className = "xlc-menu-sec";
      const mk = (label, run) => {
        const btn = document.createElement("button");
        btn.className = "xlc-menu-item";
        btn.textContent = label;
        btn.addEventListener("click", async () => {
          this.destroy();
          await run();
        });
        sec.appendChild(btn);
      };
      mk(this.deps.t("providerInsert"), () => {
        var _a2;
        return this.deps.insertProviderPayload(row.payload, (_a2 = this.insertTarget) != null ? _a2 : void 0);
      });
      mk(this.deps.t("providerCopy"), () => this.deps.copyProviderPayload(row.payload));
      menu.appendChild(sec);
      ((_b = (_a = this.dialog) == null ? void 0 : _a.element) != null ? _b : anchor).appendChild(menu);
      const dismiss = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("pointerdown", dismiss, true);
        }
      };
      document.addEventListener("pointerdown", dismiss, true);
    }
    async refreshPreservingPosition() {
      var _a;
      const seq = ++this.searchSeq;
      const query = this.buildQuery();
      try {
        const { entries } = await this.deps.search(query);
        if (seq !== this.searchSeq) return;
        this.results = entries;
      } catch {
        return;
      }
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      if (list) this.renderList(list);
    }
    /** 统一导航位：0..results.length-1 为库条目，之后为提供方行 */
    setNav(pos) {
      if (pos < this.results.length) {
        this.activeIndex = pos;
        this.activeProvider = -1;
      } else {
        this.activeIndex = Math.max(Math.min(pos, Math.max(this.results.length - 1, 0)), 0);
        this.activeProvider = pos - this.results.length;
      }
    }
    navPosition() {
      return this.activeProvider >= 0 ? this.results.length + this.activeProvider : this.activeIndex;
    }
    paintActive() {
      var _a;
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      if (!list) return;
      const rows = Array.from(list.children);
      rows.forEach((child, i) => {
        const isReal = i < this.results.length;
        const active3 = isReal ? this.activeProvider < 0 && i === this.activeIndex : this.activeProvider >= 0 && i - this.results.length === this.activeProvider;
        child.classList.toggle("xlc-row--active", active3);
        if (isReal) child.setAttribute("aria-selected", active3 ? "true" : "false");
      });
      const active2 = rows[this.navPosition()];
      active2 == null ? void 0 : active2.scrollIntoView({ block: "nearest" });
    }
    schedulePreview(entry) {
      this.updatePreview(entry.id);
    }
    updatePreview(forceId) {
      var _a, _b, _c, _d, _e, _f;
      const paneBody = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-pane-body");
      const paneTitle = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-pane-title");
      const paneWarn = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-pane-warn");
      const paneAi = (_d = this.dialog) == null ? void 0 : _d.element.querySelector(".xlc-pane-ai");
      if (!paneBody || !paneTitle || !paneWarn || !paneAi) return;
      if (this.activeProvider >= 0) {
        const row = this.providerRows[this.activeProvider];
        if (!row) return;
        this.lastPreviewId = row.virtualId;
        paneTitle.textContent = row.title || row.providerName;
        paneAi.style.display = "none";
        paneWarn.style.display = "none";
        paneBody.textContent = row.payload;
        return;
      }
      const entry = this.results[this.activeIndex];
      const id = (_e = forceId != null ? forceId : entry == null ? void 0 : entry.id) != null ? _e : null;
      if (!id || id === this.lastPreviewId) return;
      const seq = ++this.previewSeq;
      if (paneTitle) paneTitle.textContent = (_f = entry == null ? void 0 : entry.title) != null ? _f : "";
      if (paneAi) paneAi.style.display = this.aiResults ? "" : "none";
      if (paneWarn) {
        const missing = Boolean(entry && this.deps.isSourceMissing(entry));
        paneWarn.style.display = missing ? "" : "none";
        if (missing) paneWarn.textContent = "\u26A0 " + this.deps.t("sourceGone");
      }
      paneBody.textContent = this.deps.t("aiWorking");
      void this.deps.preview(id).then((text) => {
        if (seq !== this.previewSeq) return;
        paneBody.textContent = text || this.deps.t("previewUnavailable");
      }).catch(() => {
        if (seq !== this.previewSeq) return;
        paneBody.textContent = this.deps.t("kernelError", "preview");
      });
    }
    /** 普通点击 = 主动作（insert；blockref = 插入引用） */
    async runPrimary(entry) {
      if (this.deps.insertTarget) {
        this.destroy();
        await this.deps.insertToDoc(entry.id, this.deps.insertTarget.docId, this.deps.insertTarget.hPath);
        return;
      }
      const mode = entry.itemType === "blockref" ? "insert-ref" : "insert";
      await this.deps.runAction(entry.id, mode);
      this.destroy();
    }
    async showActionMenu(entry) {
      var _a, _b;
      const menu = document.createElement("div");
      menu.className = "xlc-menu";
      const rebuild = (render) => {
        menu.innerHTML = "";
        render();
      };
      const buildDefault = () => {
        const previewBox = document.createElement("pre");
        previewBox.className = "xlc-menu-preview";
        previewBox.textContent = this.deps.t("previewUnavailable");
        void this.deps.preview(entry.id).then((text) => {
          if (text) previewBox.textContent = text.slice(0, 500);
        }).catch(() => {
          previewBox.textContent = this.deps.t("kernelError", "preview");
        });
        menu.appendChild(previewBox);
        const sec1 = document.createElement("div");
        sec1.className = "xlc-menu-sec";
        const addAction = (label, run, cls = "xlc-menu-item") => {
          const btn = document.createElement("button");
          btn.className = cls;
          btn.textContent = label;
          btn.addEventListener("click", async () => {
            this.destroy();
            await run();
          });
          sec1.appendChild(btn);
        };
        if (entry.itemType === "blockref") {
          addAction(this.deps.t("insertRef"), () => this.deps.runAction(entry.id, "insert-ref"));
          addAction(this.deps.t("insertEmbed"), () => this.deps.runAction(entry.id, "insert-embed"));
          addAction(this.deps.t("insertCopy"), () => this.deps.runAction(entry.id, "copy-content"));
        } else {
          addAction(this.deps.t("insert"), () => this.deps.runAction(entry.id, "insert"));
          addAction(this.deps.t("copy"), () => this.deps.runAction(entry.id, "copy"));
        }
        menu.appendChild(sec1);
        if (this.deps.aiEnabled()) {
          const secAi = document.createElement("div");
          secAi.className = "xlc-menu-sec xlc-menu-sec--ai";
          for (const kind of TRANSFORM_KINDS) {
            const btn = document.createElement("button");
            btn.className = "xlc-menu-item xlc-menu-item--ai";
            btn.textContent = "\u2726 " + this.deps.t(`tf.${kind}`);
            btn.addEventListener("click", () => {
              rebuild(buildTransform.bind(this, kind));
              void runTransform(kind);
            });
            secAi.appendChild(btn);
          }
          menu.appendChild(secAi);
        }
        const sec2 = document.createElement("div");
        sec2.className = "xlc-menu-sec";
        const addSilent = (label, run) => {
          const btn = document.createElement("button");
          btn.className = "xlc-menu-item";
          btn.textContent = label;
          btn.addEventListener("click", async () => {
            menu.remove();
            await run();
          });
          sec2.appendChild(btn);
        };
        addSilent(this.deps.t("openSource"), () => this.deps.openSource(entry.id));
        addSilent(this.deps.t("edit"), () => this.deps.editItem(entry.id));
        addSilent(this.deps.t("duplicateItem"), () => this.deps.duplicateItem(entry.id));
        const toDocBtn = document.createElement("button");
        toDocBtn.className = "xlc-menu-item";
        toDocBtn.textContent = this.deps.t("insertToDoc");
        toDocBtn.addEventListener("click", () => {
          var _a2;
          let sec = menu.querySelector(".xlc-menu-pickdoc");
          if (sec) {
            sec.remove();
            return;
          }
          sec = document.createElement("div");
          sec.className = "xlc-menu-sec xlc-menu-pickdoc";
          sec.style.flexDirection = "column";
          const input = document.createElement("input");
          input.className = "b3-text-field xlc-pickdoc-input";
          input.placeholder = this.deps.t("insertToDocPick");
          sec.appendChild(input);
          let seq = 0;
          input.addEventListener("input", () => {
            const mySeq = ++seq;
            const k = input.value.trim();
            sec.querySelectorAll(".xlc-pickdoc-hit").forEach((el) => el.remove());
            if (!k) return;
            void this.deps.searchDocs(k).then((hits) => {
              if (mySeq !== seq) return;
              for (const hit of hits.slice(0, 5)) {
                const hitBtn = document.createElement("button");
                hitBtn.className = "xlc-menu-item xlc-pickdoc-hit";
                hitBtn.textContent = hit.hPath || hit.name || hit.id;
                hitBtn.addEventListener("click", async () => {
                  this.destroy();
                  await this.deps.insertToDoc(entry.id, hit.id, hit.hPath);
                });
                sec.appendChild(hitBtn);
              }
            });
          });
          const actions2 = menu.querySelectorAll(".xlc-menu-sec");
          (_a2 = actions2[actions2.length - 1]) == null ? void 0 : _a2.before(sec);
          input.focus();
        });
        sec2.appendChild(toDocBtn);
        addSilent(this.deps.t("delete"), () => this.deps.deleteItem(entry.id));
        menu.appendChild(sec2);
      };
      const buildTransform = (kind) => {
        const lbl = document.createElement("div");
        lbl.className = "xlc-menu-lbl";
        lbl.textContent = entry.title + " \xB7 " + this.deps.t(`tf.${kind}`);
        menu.appendChild(lbl);
        const box = document.createElement("pre");
        box.className = "xlc-menu-preview";
        box.textContent = this.deps.t("aiWorking");
        menu.appendChild(box);
        const sec = document.createElement("div");
        sec.className = "xlc-menu-sec";
        const mk = (label, run) => {
          const btn = document.createElement("button");
          btn.className = "xlc-menu-item";
          btn.textContent = label;
          btn.addEventListener("click", async () => {
            this.destroy();
            await run();
          });
          sec.appendChild(btn);
        };
        mk(this.deps.t("aiInsertTransformed"), async () => {
          var _a2;
          await this.deps.insertRaw((_a2 = box.dataset.transformed) != null ? _a2 : "");
        });
        mk(this.deps.t("aiCopyTransformed"), async () => {
          await this.deps.runAction(entry.id, "copy");
        });
        mk(this.deps.t("aiInsertOriginal"), async () => {
          await this.deps.runAction(entry.id, entry.itemType === "blockref" ? "insert-ref" : "insert");
        });
        const saveNewBtn = document.createElement("button");
        saveNewBtn.className = "xlc-menu-item";
        saveNewBtn.textContent = this.deps.t("saveTransformed");
        saveNewBtn.addEventListener("click", async () => {
          var _a2;
          const transformed = (_a2 = box.dataset.transformed) != null ? _a2 : "";
          this.destroy();
          await this.deps.saveTransformed(entry.id, kind, transformed);
        });
        sec.appendChild(saveNewBtn);
        menu.appendChild(sec);
        const secBack = document.createElement("div");
        secBack.className = "xlc-menu-sec";
        const back = document.createElement("button");
        back.className = "xlc-menu-item";
        back.textContent = "\u2190 " + this.deps.t("more");
        back.addEventListener("click", () => rebuild(buildDefault));
        secBack.appendChild(back);
        menu.appendChild(secBack);
        menu.applyTransform = (text) => {
          box.dataset.transformed = text;
          box.textContent = text.slice(0, 800);
        };
      };
      const runTransform = async (kind) => {
        const result = await this.deps.aiTransform(entry.id, kind);
        const apply = menu.applyTransform;
        if (result.ok) {
          apply == null ? void 0 : apply(result.text);
        } else {
          const box = menu.querySelector(".xlc-menu-preview");
          if (box) box.textContent = result.message;
        }
      };
      rebuild(buildDefault);
      ((_b = (_a = this.dialog) == null ? void 0 : _a.element) != null ? _b : document.body).appendChild(menu);
      const escHandler = (e) => {
        var _a2;
        if (e.key === "Escape") {
          e.preventDefault();
          (_a2 = this.menuDismiss) == null ? void 0 : _a2.call(this);
          this.menuDismiss = null;
        }
      };
      menu.addEventListener("keydown", escHandler);
      const dismiss = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          this.menuDismiss = null;
          document.removeEventListener("pointerdown", dismiss, true);
        }
      };
      this.menuDismiss = () => {
        menu.remove();
        document.removeEventListener("pointerdown", dismiss, true);
      };
      document.addEventListener("pointerdown", dismiss, true);
    }
    async onKeydown(e) {
      var _a;
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      if (!list) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const total = this.results.length + this.providerRows.length;
        if (total > 0) this.setNav(Math.min(this.navPosition() + 1, total - 1));
        this.paintActive();
        this.updatePreview();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.setNav(Math.max(this.navPosition() - 1, 0));
        this.paintActive();
        this.updatePreview();
      } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (this.activeProvider >= 0) {
          const row = this.providerRows[this.activeProvider];
          if (row) {
            this.destroy();
            await this.deps.insertProviderPayload(row.payload);
          }
          return;
        }
        const entry = this.results[this.activeIndex];
        if (entry) await this.runPrimary(entry);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (this.activeProvider >= 0) {
          const row = this.providerRows[this.activeProvider];
          if (row) await this.deps.copyProviderPayload(row.payload);
          return;
        }
        const entry = this.results[this.activeIndex];
        if (entry) await this.deps.runAction(entry.id, "copy");
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.destroy();
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        const entry = this.results[idx];
        if (entry) {
          await this.runPrimary(entry);
        }
      }
    }
    destroy() {
      var _a;
      if (this.inputDebounce) clearTimeout(this.inputDebounce);
      if (this.menuDismiss) {
        this.menuDismiss();
        this.menuDismiss = null;
      }
      (_a = this.dialog) == null ? void 0 : _a.destroy();
      this.dialog = null;
    }
  };

  // src/ui/settings-dialog.ts
  var import_siyuan2 = __toESM(require_stub_dom());

  // src/model/storage.ts
  init_constants();
  var CONFIG_VERSION = 1;

  // src/ui/settings-dialog.ts
  init_constants();

  // src/model/transfer.ts
  init_constants();
  function validateImport(jsonText) {
    const issues = [];
    let obj;
    try {
      obj = JSON.parse(jsonText);
    } catch (e) {
      return { ok: false, reason: "json-parse", issues };
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return { ok: false, reason: "not-an-object", issues };
    }
    const record = obj;
    if (record.protocol !== PROTOCOL_NAME) {
      return { ok: false, reason: "protocol-mismatch", issues };
    }
    const schemaVersion = record.schemaVersion;
    if (schemaVersion !== EXPORT_SCHEMA_VERSION) {
      return { ok: false, reason: "schema-version-unsupported", issues };
    }
    if (!Array.isArray(record.items)) {
      return { ok: false, reason: "items-not-array", issues };
    }
    if (record.items.length > LIMITS.maxItems) {
      return { ok: false, reason: "too-many-items", issues };
    }
    const knownTop = ["protocol", "schemaVersion", "exportedAt", "items"];
    const unknownTopFields = Object.keys(record).filter((k) => !knownTop.includes(k));
    const items = [];
    record.items.forEach((raw, index) => {
      const item = normalizeExportedItem(raw);
      if (!item) {
        issues.push({ index, reason: "invalid-item" });
        return;
      }
      items.push(item);
    });
    return { ok: true, parsed: { schemaVersion: EXPORT_SCHEMA_VERSION, items, unknownTopFields }, issues };
  }
  function normalizeExportedItem(raw) {
    var _a;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const obj = raw;
    if (typeof obj.id !== "string" || !obj.id.startsWith("xlc-") || obj.id.length > 64) return null;
    if (typeof obj.kramdown !== "string" || obj.kramdown.length > LIMITS.contentChars) return null;
    if (typeof obj.itemType !== "string" || obj.itemType.length > 24) return null;
    const sourceRaw = (_a = obj.source) != null ? _a : {};
    const known = ["id", "itemType", "title", "alias", "tags", "category", "kramdown", "source", "url", "targetBlockId", "createdAt", "updatedAt"];
    const extensions = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!known.includes(k)) extensions[k] = v;
    }
    const str = (v, cap) => typeof v === "string" ? v.slice(0, cap) : "";
    const tags = Array.isArray(obj.tags) ? obj.tags.filter((t) => typeof t === "string").slice(0, LIMITS.tags) : [];
    return {
      id: obj.id,
      itemType: obj.itemType,
      title: str(obj.title, LIMITS.title),
      alias: str(obj.alias, LIMITS.alias),
      tags,
      category: str(obj.category, LIMITS.category),
      kramdown: obj.kramdown,
      source: {
        sourceDocId: str(sourceRaw.sourceDocId, 32),
        sourceBlockId: str(sourceRaw.sourceBlockId, 32),
        sourceType: str(sourceRaw.sourceType, 24)
      },
      url: str(obj.url, 2048),
      targetBlockId: str(obj.targetBlockId, 32),
      createdAt: Number(obj.createdAt) || 0,
      updatedAt: Number(obj.updatedAt) || 0,
      extensions: Object.keys(extensions).length ? extensions : void 0
    };
  }

  // src/model/zip.ts
  var CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();
  function crc32(data) {
    let c = 0 ^ -1;
    for (let i = 0; i < data.length; i++) c = c >>> 8 ^ CRC_TABLE[(c ^ data[i]) & 255];
    return (c ^ -1) >>> 0;
  }
  function dosDateTime() {
    const time = 0;
    const date = 2026 - 1980 << 9 | 1 << 5 | 1;
    return { time, date };
  }
  function u16(arr, value) {
    arr.push(value & 255, value >>> 8 & 255);
  }
  function u32(arr, value) {
    arr.push(value & 255, value >>> 8 & 255, value >>> 16 & 255, value >>> 24 & 255);
  }
  function buildZip(entries) {
    if (entries.length === 0) throw new Error("zip: no entries");
    if (entries.length > 65535) throw new Error("zip: too many entries");
    const { time, date } = dosDateTime();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    for (const entry of entries) {
      if (!entry.name || entry.name.startsWith("/") || entry.name.includes("..") || entry.name.includes("\\")) {
        throw new Error(`zip: unsafe entry name ${entry.name}`);
      }
      const nameBytes = new TextEncoder().encode(entry.name);
      const crc = crc32(entry.data);
      const local = [];
      u32(local, 67324752);
      u16(local, 20);
      u16(local, 0);
      u16(local, 0);
      u16(local, time);
      u16(local, date);
      u32(local, crc);
      u32(local, entry.data.length);
      u32(local, entry.data.length);
      u16(local, nameBytes.length);
      u16(local, 0);
      local.push(...nameBytes);
      const headerOffset = offset;
      localParts.push(local, Array.from(entry.data));
      const central = [];
      u32(central, 33639248);
      u16(central, 20);
      u16(central, 20);
      u16(central, 0);
      u16(central, 0);
      u16(central, time);
      u16(central, date);
      u32(central, crc);
      u32(central, entry.data.length);
      u32(central, entry.data.length);
      u16(central, nameBytes.length);
      u16(central, 0);
      u16(central, 0);
      u16(central, 0);
      u16(central, 0);
      u32(central, 0);
      u32(central, headerOffset);
      central.push(...nameBytes);
      centralParts.push(central);
      offset += local.length + entry.data.length;
    }
    const centralStart = offset;
    let centralSize = 0;
    const out = [];
    for (const part of localParts) out.push(...part);
    for (const part of centralParts) {
      out.push(...part);
      centralSize += part.length;
    }
    const eocd = [];
    u32(eocd, 101010256);
    u16(eocd, 0);
    u16(eocd, 0);
    u16(eocd, entries.length);
    u16(eocd, entries.length);
    u32(eocd, centralSize);
    u32(eocd, centralStart);
    u16(eocd, 0);
    out.push(...eocd);
    return new Uint8Array(out);
  }

  // src/model/actions.ts
  init_constants();
  var ASSET_PATH_RE = /^(assets\/[^\s/][^\s]*|assets\/[^\s/])$/;
  function isValidAssetPath(path) {
    return ASSET_PATH_RE.test(path) && !path.includes("..");
  }
  function extractAssetPath(kramdown) {
    const m = kramdown.match(/\]\((assets\/[^)\s]+)[^)]*\)/);
    if (!m) return null;
    return isValidAssetPath(m[1]) ? m[1] : null;
  }

  // src/service/export-markdown.ts
  init_constants();
  async function buildMarkdownExport(items, kramdownById, fetchAssetBytes) {
    var _a;
    const entries = [];
    const skippedAssets = [];
    const assetEntries = /* @__PURE__ */ new Map();
    const usedNames = /* @__PURE__ */ new Set(["items.md"]);
    let assetCount = 0;
    const mdParts = [
      "# \u5C0F\u9A74\u5E38\u7528 \xB7 \u6761\u76EE\u5BFC\u51FA",
      "",
      `> \u5BFC\u51FA\u81EA\u601D\u6E90\u63D2\u4EF6\u300C\u5C0F\u9A74\u5E38\u7528\u300D\uFF0C\u5171 ${items.length} \u6761\u3002\u8D44\u6E90\u4F4D\u4E8E assets/\uFF0C\u6761\u76EE\u5185\u94FE\u63A5\u4E3A\u76F8\u5BF9\u8DEF\u5F84\u3002`,
      ""
    ];
    for (const item of items) {
      const kramdown = (_a = kramdownById.get(item.id)) != null ? _a : "";
      const meta = [
        `<!-- xlc-item`,
        `id: ${item.id}`,
        `type: ${item.itemType}`,
        item.alias ? `alias: ${item.alias}` : "",
        item.tags.length ? `tags: ${item.tags.join(",")}` : "",
        item.category ? `category: ${item.category}` : "",
        item.source.sourceDocId ? `source-doc: ${item.source.sourceDocId}` : "",
        item.source.sourceBlockId ? `source-block: ${item.source.sourceBlockId}` : "",
        `-->`
      ].filter(Boolean).join("\n");
      mdParts.push(`## ${item.title || item.id}`, "", meta, "", kramdown, "");
      if (item.itemType === "image" || item.itemType === "asset") {
        const assetPath = extractAssetPath(kramdown);
        if (assetPath && !assetEntries.has(assetPath)) {
          const bytes = await fetchAssetBytes(assetPath);
          if (bytes && bytes.length > 0) {
            const name = assetPath;
            usedNames.add(name);
            assetEntries.set(assetPath, { name, data: bytes });
            assetCount++;
          } else {
            skippedAssets.push(assetPath);
          }
        }
      }
      if (mdParts.join("").length > LIMITS.contentChars) {
        mdParts.push("", "> \uFF08\u5185\u5BB9\u8D85\u957F\uFF0C\u5BFC\u51FA\u5728\u6B64\u622A\u65AD\uFF09");
        break;
      }
    }
    entries.push({ name: "items.md", data: new TextEncoder().encode(mdParts.join("\n")) });
    entries.push(...assetEntries.values());
    return { entries, itemCount: items.length, assetCount, skippedAssets };
  }

  // src/service/import-markdown.ts
  init_constants();
  var ITEM_COMMENT_START = "<!-- xlc-item";
  var ITEM_COMMENT_END = "-->";
  var TITLE_RE = /^##\s+(.+)$/;
  function parseMetadata(lines) {
    const fields = /* @__PURE__ */ new Map();
    let titleHint = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === ITEM_COMMENT_START || trimmed === ITEM_COMMENT_END) continue;
      const idx = trimmed.indexOf(":");
      if (idx <= 0) continue;
      fields.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1).trim());
    }
    return { fields, titleHint };
  }
  function parseMarkdownPack(md) {
    const items = [];
    const issues = [];
    if (!md || !md.includes(ITEM_COMMENT_START)) return { items, issues };
    const commentStarts = [];
    const commentEnds = [];
    let hasUnclosed = false;
    let scan = 0;
    while (true) {
      const start = md.indexOf(ITEM_COMMENT_START, scan);
      if (start === -1) break;
      const end = md.indexOf(ITEM_COMMENT_END, start);
      if (end === -1) {
        hasUnclosed = true;
        break;
      }
      commentStarts.push(start);
      commentEnds.push(end + ITEM_COMMENT_END.length);
      scan = start + ITEM_COMMENT_START.length;
      if (commentStarts.length > LIMITS.maxItems) break;
    }
    const chunks = [];
    for (let i = 0; i < commentStarts.length; i++) {
      const lowerBound = i > 0 ? commentEnds[i - 1] : 0;
      const titleLineStart = md.lastIndexOf("\n## ", commentStarts[i]) + 1;
      const chunkStart = Math.max(Math.min(titleLineStart, commentStarts[i]), lowerBound);
      const chunkEnd = i + 1 < commentStarts.length ? Math.max(md.lastIndexOf("\n## ", commentStarts[i + 1]) + 1, commentStarts[i + 1]) : md.length;
      chunks.push(md.slice(chunkStart, chunkEnd));
    }
    chunks.forEach((chunk, index) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
      const endIdx = chunk.indexOf(ITEM_COMMENT_END);
      if (endIdx === -1) {
        issues.push({ index, reason: "metadata-comment-unclosed" });
        return;
      }
      const metaLines = chunk.slice(0, endIdx).split("\n");
      const { fields } = parseMetadata(metaLines);
      const id = (_a = fields.get("id")) != null ? _a : "";
      if (!/^xlc-[0-9a-z]{10,40}$/.test(id)) {
        issues.push({ index, reason: "invalid-id" });
        return;
      }
      const itemType = (_b = fields.get("type")) != null ? _b : "text";
      let title = "";
      const before = chunk.slice(0, chunk.indexOf(ITEM_COMMENT_START));
      for (const line of before.split("\n")) {
        const m = line.match(TITLE_RE);
        if (m) title = m[1].trim();
      }
      if (!title && fields.get("alias")) title = (_c = fields.get("alias")) != null ? _c : "";
      const body = chunk.slice(endIdx + ITEM_COMMENT_END.length).replace(/^\s*\n/, "").replace(/\n\s*$/, "");
      items.push({
        id,
        itemType,
        title: title.slice(0, LIMITS.title),
        alias: ((_d = fields.get("alias")) != null ? _d : "").slice(0, LIMITS.alias),
        tags: ((_e = fields.get("tags")) != null ? _e : "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, LIMITS.tags),
        category: ((_f = fields.get("category")) != null ? _f : "").slice(0, LIMITS.category),
        kramdown: body.slice(0, LIMITS.contentChars),
        source: {
          sourceDocId: (_g = fields.get("source-doc")) != null ? _g : "",
          sourceBlockId: (_h = fields.get("source-block")) != null ? _h : "",
          sourceType: (_i = fields.get("source-type")) != null ? _i : "external"
        },
        url: (_j = fields.get("url")) != null ? _j : "",
        targetBlockId: (_k = fields.get("target")) != null ? _k : "",
        createdAt: 0,
        updatedAt: Date.now()
      });
    });
    if (hasUnclosed) issues.push({ index: commentStarts.length, reason: "metadata-comment-unclosed" });
    return { items, issues };
  }

  // src/ui/settings-dialog.ts
  function openSetupDialog(ctx) {
    const t = ctx.t;
    const dialog = new import_siyuan2.Dialog({
      title: t("setupTitle"),
      content: "",
      width: "min(520px, 92vw)",
      height: "auto"
    });
    const body = dialog.element.querySelector(".b3-dialog__content");
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form";
    const hint = document.createElement("p");
    hint.className = "xlc-form-hint";
    hint.textContent = t("setupHint");
    root.appendChild(hint);
    buildLibraryPickerSection(ctx, root, () => dialog.destroy());
    body.appendChild(root);
  }
  function openSettingsDialog(ctx) {
    const t = ctx.t;
    const dialog = new import_siyuan2.Dialog({
      title: t("openSettings"),
      content: "",
      width: "min(560px, 92vw)",
      height: "auto"
    });
    const body = dialog.element.querySelector(".b3-dialog__content");
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form";
    const libSec = document.createElement("div");
    libSec.className = "xlc-form-field";
    const libLabel = document.createElement("span");
    libLabel.className = "xlc-form-label";
    libLabel.textContent = t("librarySection");
    libSec.appendChild(libLabel);
    const libStatus = document.createElement("div");
    libStatus.className = "xlc-form-hint";
    const cfg = ctx.getConfig();
    libStatus.textContent = cfg ? cfg.mode === "notebook" ? `notebook ${cfg.notebookIds.join(",")}` : `${cfg.mode} \xB7 ${cfg.containerDocIds.length} doc(s)` : t("libraryNone");
    libSec.appendChild(libStatus);
    const changeBtn = document.createElement("button");
    changeBtn.className = "b3-button";
    changeBtn.textContent = t("openSettingsChangeLib");
    const pickerHost = document.createElement("div");
    pickerHost.style.display = "none";
    changeBtn.addEventListener("click", () => {
      const show = pickerHost.style.display === "none";
      pickerHost.style.display = show ? "" : "none";
      if (show && pickerHost.childElementCount === 0) {
        buildLibraryPickerSection(ctx, pickerHost, () => dialog.destroy());
      }
    });
    libSec.appendChild(changeBtn);
    libSec.appendChild(pickerHost);
    root.appendChild(libSec);
    buildAiSection(ctx, root);
    buildSearchSection(ctx, root);
    buildProviderSection(ctx, root);
    buildDataSection(ctx, root);
    body.appendChild(root);
  }
  function buildProviderSection(ctx, root) {
    const t = ctx.t;
    const provSec = document.createElement("div");
    provSec.className = "xlc-form-field";
    const provLabel = document.createElement("span");
    provLabel.className = "xlc-form-label";
    provLabel.textContent = t("providerSection");
    provSec.appendChild(provLabel);
    const providers = ctx.registry.list();
    if (providers.length === 0) {
      const empty = document.createElement("div");
      empty.className = "xlc-form-hint";
      empty.textContent = t("providerNone");
      provSec.appendChild(empty);
    } else {
      for (const p of providers) {
        const row = document.createElement("div");
        row.className = "xlc-setting-row";
        const status = document.createElement("span");
        status.className = "xlc-badge " + (p.runtime ? "xlc-badge--text" : "xlc-badge--warn");
        status.textContent = p.runtime ? t("providerExecutable") : t("providerPendingReload");
        const cap = document.createElement("span");
        cap.textContent = `${p.record.displayName}\uFF08v${p.record.protocolVersion}\uFF09`;
        row.appendChild(status);
        row.appendChild(cap);
        provSec.appendChild(row);
      }
    }
    root.appendChild(provSec);
  }
  function buildLibraryPickerSection(ctx, root, onConfigured) {
    const t = ctx.t;
    const modeWrap = document.createElement("div");
    modeWrap.className = "xlc-form-field";
    const modeLabel = document.createElement("span");
    modeLabel.className = "xlc-form-label";
    modeLabel.textContent = t("setupTitle");
    modeWrap.appendChild(modeLabel);
    const modeSelect = document.createElement("select");
    modeSelect.className = "b3-select";
    const modes = [
      { v: "doc", label: t("setupPickDoc") },
      { v: "tree", label: t("setupPickDoc") + " (+\u5B50\u6587\u6863)" },
      { v: "notebook", label: t("setupNotebook") }
    ];
    for (const m of modes) {
      const opt = document.createElement("option");
      opt.value = m.v;
      opt.textContent = m.label;
      modeSelect.appendChild(opt);
    }
    modeWrap.appendChild(modeSelect);
    root.appendChild(modeWrap);
    const nbWrap = document.createElement("div");
    nbWrap.className = "xlc-form-field";
    const nbLabel = document.createElement("span");
    nbLabel.className = "xlc-form-label";
    nbLabel.textContent = t("setupNotebook");
    nbWrap.appendChild(nbLabel);
    const nbSelect = document.createElement("select");
    nbSelect.className = "b3-select";
    nbWrap.appendChild(nbSelect);
    root.appendChild(nbWrap);
    void ctx.library.listNotebooks().then((result) => {
      if (!result.ok) {
        ctx.notify("error", t("kernelError", result.message));
        return;
      }
      for (const nb of result.data) {
        const opt = document.createElement("option");
        opt.value = nb.id;
        opt.textContent = nb.name;
        nbSelect.appendChild(opt);
      }
    });
    const nameWrap = document.createElement("div");
    nameWrap.className = "xlc-form-field";
    const nameLabel = document.createElement("span");
    nameLabel.className = "xlc-form-label";
    nameLabel.textContent = t("setupNewDoc");
    nameWrap.appendChild(nameLabel);
    const nameInput = document.createElement("input");
    nameInput.className = "b3-text-field";
    nameInput.value = t("setupNewDocName");
    nameWrap.appendChild(nameInput);
    root.appendChild(nameWrap);
    const actions = document.createElement("div");
    actions.className = "xlc-form-actions";
    const createBtn = document.createElement("button");
    createBtn.className = "b3-button b3-button--text";
    createBtn.textContent = t("setupNewDoc");
    createBtn.addEventListener("click", () => {
      const notebookId = nbSelect.value;
      const title = nameInput.value.trim();
      if (!notebookId || !title) {
        ctx.notify("error", t("invalidItem"));
        return;
      }
      (0, import_siyuan2.confirm)("\u26A0\uFE0F " + t("setupTitle"), t("setupConfirmCreate", title), () => {
        void ctx.library.createLibraryDoc(notebookId, title).then((result) => {
          if (!result.ok) {
            ctx.notify("error", t("kernelError", result.message));
            return;
          }
          ctx.applyConfig({
            configVersion: CONFIG_VERSION,
            mode: "doc",
            notebookIds: [],
            containerDocIds: [result.data.docId],
            createdDocIds: [result.data.docId],
            configuredAt: Date.now()
          });
          ctx.notify("info", t("libDocCreated", title));
          onConfigured();
        });
      });
    });
    const pickerWrap = document.createElement("div");
    pickerWrap.className = "xlc-form-field";
    const pickerInput = document.createElement("input");
    pickerInput.className = "b3-text-field";
    pickerInput.placeholder = t("docPicker");
    pickerWrap.appendChild(pickerInput);
    const pickerList = document.createElement("div");
    pickerList.className = "xlc-doclist";
    pickerWrap.appendChild(pickerList);
    root.appendChild(pickerWrap);
    let pickedDoc = null;
    let pickerSeq = 0;
    pickerInput.addEventListener("input", () => {
      const seq = ++pickerSeq;
      const k = pickerInput.value.trim();
      pickerList.innerHTML = "";
      pickedDoc = null;
      if (!k) return;
      void ctx.library.searchDocs(k).then((result) => {
        if (seq !== pickerSeq) return;
        if (!result.ok || result.data.length === 0) {
          const empty = document.createElement("div");
          empty.className = "xlc-doclist-empty";
          empty.textContent = result.ok ? t("docPickerEmpty") : t("kernelError", result.message);
          pickerList.appendChild(empty);
          return;
        }
        for (const hit of result.data.slice(0, 8)) {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "xlc-doclist-item";
          item.textContent = hit.hPath || hit.name || hit.id;
          item.addEventListener("click", () => {
            pickedDoc = { id: hit.id, hPath: hit.hPath };
            pickerList.querySelectorAll(".xlc-doclist-item").forEach((el) => el.classList.remove("xlc-doclist-item--on"));
            item.classList.add("xlc-doclist-item--on");
          });
          pickerList.appendChild(item);
        }
      });
    });
    const useNotebookBtn = document.createElement("button");
    useNotebookBtn.className = "b3-button b3-button--text";
    useNotebookBtn.textContent = t("confirm");
    useNotebookBtn.addEventListener("click", () => {
      const mode = modeSelect.value;
      if (mode === "notebook") {
        const notebookId = nbSelect.value;
        if (!notebookId) {
          ctx.notify("error", t("invalidItem"));
          return;
        }
        ctx.applyConfig({
          configVersion: CONFIG_VERSION,
          mode: "notebook",
          notebookIds: [notebookId],
          containerDocIds: [],
          createdDocIds: [],
          configuredAt: Date.now()
        });
        onConfigured();
        return;
      }
      if (!pickedDoc) {
        ctx.notify("error", t("docPickerEmpty"));
        return;
      }
      ctx.applyConfig({
        configVersion: CONFIG_VERSION,
        mode,
        notebookIds: [],
        containerDocIds: [pickedDoc.id],
        createdDocIds: [],
        configuredAt: Date.now()
      });
      onConfigured();
    });
    actions.appendChild(createBtn);
    actions.appendChild(useNotebookBtn);
    root.appendChild(actions);
  }
  function buildAiSection(ctx, root) {
    const t = ctx.t;
    const aiSec = document.createElement("div");
    aiSec.className = "xlc-form-field";
    const aiLabel = document.createElement("span");
    aiLabel.className = "xlc-form-label";
    aiLabel.textContent = t("aiSection");
    aiSec.appendChild(aiLabel);
    const aiRow = (key, text) => {
      const row = document.createElement("label");
      row.className = "xlc-setting-row";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = ctx.state.ai[key];
      box.addEventListener("change", () => {
        ctx.state.ai[key] = box.checked;
        if (key === "enabled" && !box.checked) ctx.state.ai.shareContent = false;
        ctx.ai.updateSettings(ctx.state.ai);
        ctx.persistSoon();
      });
      const cap = document.createElement("span");
      cap.textContent = text;
      row.appendChild(box);
      row.appendChild(cap);
      aiSec.appendChild(row);
      return box;
    };
    const aiEnabledBox = aiRow("enabled", t("aiEnabled"));
    const aiShareBox = aiRow("shareContent", t("aiShareContent"));
    aiEnabledBox.addEventListener("change", () => {
      if (!aiEnabledBox.checked) aiShareBox.checked = false;
    });
    root.appendChild(aiSec);
  }
  function buildSearchSection(ctx, root) {
    const t = ctx.t;
    const searchSec = document.createElement("div");
    searchSec.className = "xlc-form-field";
    const searchLabel = document.createElement("span");
    searchLabel.className = "xlc-form-label";
    searchLabel.textContent = t("searchSection");
    searchSec.appendChild(searchLabel);
    const pinyinRow = document.createElement("label");
    pinyinRow.className = "xlc-setting-row";
    const pinyinBox = document.createElement("input");
    pinyinBox.type = "checkbox";
    pinyinBox.checked = ctx.state.search.pinyin;
    pinyinBox.addEventListener("change", () => {
      ctx.state.search.pinyin = pinyinBox.checked;
      ctx.applyPinyinAdapter();
      ctx.persistSoon();
      void ctx.library.reindex().then((idx) => {
        ctx.notify("info", t("reindexDone", String(idx.entries.length)));
      });
    });
    const pinyinCap = document.createElement("span");
    pinyinCap.textContent = t("pinyinToggle");
    pinyinRow.appendChild(pinyinBox);
    pinyinRow.appendChild(pinyinCap);
    searchSec.appendChild(pinyinRow);
    const phRow = document.createElement("label");
    phRow.className = "xlc-setting-row";
    const phBox = document.createElement("input");
    phBox.type = "checkbox";
    phBox.checked = ctx.state.search.placeholders;
    phBox.addEventListener("change", () => {
      ctx.state.search.placeholders = phBox.checked;
      ctx.persistSoon();
    });
    const phCap = document.createElement("span");
    phCap.textContent = t("placeholdersToggle");
    phRow.appendChild(phBox);
    phRow.appendChild(phCap);
    searchSec.appendChild(phRow);
    const phHint = document.createElement("span");
    phHint.className = "xlc-form-hint";
    phHint.textContent = t("placeholdersHint");
    searchSec.appendChild(phHint);
    root.appendChild(searchSec);
  }
  function buildDataSection(ctx, root) {
    const t = ctx.t;
    const dataSec = document.createElement("div");
    dataSec.className = "xlc-form-field";
    const dataLabel = document.createElement("span");
    dataLabel.className = "xlc-form-label";
    dataLabel.textContent = t("dataSection");
    dataSec.appendChild(dataLabel);
    const libRow = document.createElement("div");
    libRow.className = "xlc-form-hint";
    const cfg = ctx.getConfig();
    libRow.textContent = `${t("librarySection")}\uFF1A${cfg ? cfg.mode === "notebook" ? `notebook ${cfg.notebookIds.join(",")}` : `${cfg.mode} \xB7 ${cfg.containerDocIds.length}` : t("libraryNone")}`;
    dataSec.appendChild(libRow);
    const dataBtns = document.createElement("div");
    dataBtns.style.display = "flex";
    dataBtns.style.gap = "8px";
    dataBtns.style.flexWrap = "wrap";
    const mkBtn = (label, onClick) => {
      const btn = document.createElement("button");
      btn.className = "b3-button";
      btn.textContent = label;
      btn.addEventListener("click", onClick);
      dataBtns.appendChild(btn);
      return btn;
    };
    mkBtn(t("reindexBtn"), () => {
      ctx.library.reindex().then((idx) => {
        ctx.notify("info", idx.truncated ? t("reindexTruncated", String(LIMITS.maxItems)) : t("reindexDone", String(idx.entries.length)));
      });
    });
    mkBtn(t("clearRecents"), () => {
      (0, import_siyuan2.confirm)("\u26A0\uFE0F " + t("clearRecents"), t("clearRecentsConfirm"), () => {
        ctx.state.recents = [];
        ctx.persistSoon();
        ctx.notify("info", t("clearRecentsDone"));
      });
    });
    if (ctx.state.ai.enabled) {
      mkBtn("\u2726 " + t("tagAuditBtn"), () => void runTagAudit(ctx));
    }
    mkBtn(t("exportBtn"), () => {
      void ctx.exportBundle().then((json) => {
        const count = JSON.parse(json).items.length;
        const blob = new Blob([json], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `xiaolv-common-export-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        ctx.notify("info", t("exportDone", String(count)));
      });
    });
    mkBtn(t("exportMdBtn"), () => {
      void (async () => {
        const idx = await ctx.library.ensureIndex();
        const items = [];
        const kramdownById = /* @__PURE__ */ new Map();
        for (const item of idx.items.values()) {
          const kd = await ctx.library.getItemKramdown(item);
          if (kd.ok) {
            items.push(item);
            kramdownById.set(item.id, kd.data);
          }
        }
        const result = await buildMarkdownExport(items, kramdownById, (assetPath) => ctx.fetchAssetBytes(assetPath));
        const zipBytes = buildZip(result.entries);
        const blob = new Blob([zipBytes], { type: "application/zip" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `xiaolv-common-md-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
        ctx.notify("info", t("exportMdDone", String(result.itemCount), String(result.assetCount), String(result.skippedAssets.length)));
      })();
    });
    const importBtn = mkBtn(t("importBtn"), () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json,application/json,.md,text/markdown";
      fileInput.addEventListener("change", () => {
        var _a;
        const file = (_a = fileInput.files) == null ? void 0 : _a[0];
        if (!file) return;
        if (file.size > LIMITS.maxImportBytes) {
          ctx.notify("error", t("importFailed", "file too large"));
          return;
        }
        void file.text().then((text) => {
          var _a2;
          const isMd = /\.md$/i.test(file.name);
          if (isMd) {
            const parsed = parseMarkdownPack(text);
            if (parsed.items.length === 0) {
              ctx.notify("error", t("importFailed", "no xlc-item metadata found"));
              return;
            }
            openImportPolicyDialog(ctx, { items: parsed.items }, parsed.issues, { kind: "markdown-pack", items: parsed.items });
            return;
          }
          const validation = validateImport(text);
          if (!validation.ok || !validation.parsed) {
            ctx.notify("error", t("importFailed", (_a2 = validation.reason) != null ? _a2 : "unknown"));
            return;
          }
          openImportPolicyDialog(ctx, validation.parsed, validation.issues, { kind: "json", text });
        });
      });
      fileInput.click();
    });
    void importBtn;
    dataSec.appendChild(dataBtns);
    root.appendChild(dataSec);
  }
  async function runTagAudit(ctx) {
    const t = ctx.t;
    const idx = await ctx.library.ensureIndex();
    const { collectTags: collectTags2 } = await Promise.resolve().then(() => (init_search(), search_exports));
    const tags = collectTags2(idx.entries);
    if (tags.length < 2) {
      ctx.notify("info", t("tagAuditTooFew"));
      return;
    }
    let suggestions;
    try {
      suggestions = await ctx.ai.tagAudit(tags);
    } catch (err) {
      ctx.notify("error", ctx.aiErrorText(err));
      return;
    }
    const dialog = new import_siyuan2.Dialog({
      title: t("tagAuditTitle"),
      content: "",
      width: "min(520px, 92vw)",
      height: "auto"
    });
    const body = dialog.element.querySelector(".b3-dialog__content");
    if (!body) return;
    body.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "xlc-form";
    if (suggestions.length === 0) {
      const empty = document.createElement("p");
      empty.className = "xlc-form-hint";
      empty.textContent = t("tagAuditEmpty");
      wrap.appendChild(empty);
    } else {
      for (const s of suggestions) {
        const row = document.createElement("div");
        row.className = "xlc-sugrow";
        const label = document.createElement("span");
        label.textContent = `\u2726 ${t(s.type === "merge" ? "tagAuditMerge" : "tagAuditRename")}\uFF1A${s.tags.join(" + ")} \u2192 ${s.suggestion}${s.reason ? `\uFF08${s.reason}\uFF09` : ""}`;
        row.appendChild(label);
        wrap.appendChild(row);
      }
      const hint = document.createElement("span");
      hint.className = "xlc-form-hint";
      hint.textContent = t("aiOriginalPreserved");
      wrap.appendChild(hint);
    }
    const actions = document.createElement("div");
    actions.className = "xlc-form-actions";
    const close = document.createElement("button");
    close.className = "b3-button";
    close.textContent = t("close");
    close.addEventListener("click", () => dialog.destroy());
    actions.appendChild(close);
    wrap.appendChild(actions);
    body.appendChild(wrap);
  }
  function openImportPolicyDialog(ctx, parsed, issues, source) {
    const t = ctx.t;
    const dialog = new import_siyuan2.Dialog({
      title: t("importPolicyTitle"),
      content: "",
      width: "min(440px, 92vw)",
      height: "auto"
    });
    const body = dialog.element.querySelector(".b3-dialog__content");
    if (!body) return;
    body.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "xlc-form";
    const preview = document.createElement("p");
    preview.className = "xlc-form-hint";
    preview.textContent = t("importPreview", String(parsed.items.length), String(issues.length));
    wrap.appendChild(preview);
    const run = (policy) => {
      dialog.destroy();
      const promise = source.kind === "json" ? ctx.importBundleText(source.text, policy) : ctx.importMarkdownItems(source.items, policy);
      void promise.then((receipt) => {
        ctx.notify(receipt.failed > 0 ? "error" : "info", t(
          "importDone",
          String(receipt.created),
          String(receipt.skipped),
          String(receipt.overwritten),
          String(receipt.renamed),
          String(receipt.failed)
        ));
      }).catch((err) => {
        ctx.notify("error", t("importFailed", err.message));
      });
    };
    const btns = document.createElement("div");
    btns.className = "xlc-form-actions";
    btns.style.flexDirection = "column";
    btns.style.alignItems = "stretch";
    for (const [policy, label] of [
      ["skip", t("importPolicySkip")],
      ["overwrite", t("importPolicyOverwrite")],
      ["rename", t("importPolicyRename")]
    ]) {
      const btn = document.createElement("button");
      btn.className = "b3-button";
      btn.textContent = label;
      btn.addEventListener("click", () => run(policy));
      btns.appendChild(btn);
    }
    wrap.appendChild(btns);
    body.appendChild(wrap);
  }

  // src/ui/capture.ts
  var import_siyuan3 = __toESM(require_stub_dom());
  function isBlockRefTarget(blockId) {
    return /^\d{14}-[0-9a-z]{7}$/.test(blockId);
  }
  function classifyLinkTarget(href) {
    const h = (href != null ? href : "").trim();
    if (/^https?:\/\//i.test(h)) return { kind: "url", value: h };
    if (/^assets\/[^\s]+$/.test(h)) return { kind: "asset", value: h };
    return null;
  }
  function inferTypeFromText(text) {
    const trimmed = text.trim();
    if (/^https?:\/\/\S+$/i.test(trimmed)) return "url";
    if (/^```[\w+#.-]*\s*\n[\s\S]*\n```\s*$/.test(trimmed)) return "code";
    if (/^!\[[^\]]*\]\((assets\/[^)\s]+)[^)]*\)$/.test(trimmed)) return "image";
    if (/\]\((assets\/[^)\s]+)[^)]*\)/.test(trimmed)) return "asset";
    if (/^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>\s|\*\*/.test(trimmed) || trimmed.includes("\n")) return "markdown";
    return "text";
  }
  var CaptureDialog = class {
    constructor(deps) {
      this.deps = deps;
    }
    /** 保存当前选区（命令/顶栏入口） */
    async saveSelection() {
      const sel = this.deps.getSelectionText();
      const text = sel.text.trim();
      if (!text) {
        void this.captureFromClipboard();
        return;
      }
      this.openForm(text, inferTypeFromText(text), sel.blockId);
    }
    /** 从剪贴板捕获（失败诚实回执） */
    async captureFromClipboard() {
      try {
        const text = (await this.deps.readClipboardText()).trim();
        if (!text) {
          this.deps.notify("error", this.deps.t("clipboardReadFailed"));
          this.openForm("", "text", null);
          return;
        }
        this.openForm(text.slice(0, 1e5), inferTypeFromText(text), null);
      } catch {
        this.deps.notify("error", this.deps.t("clipboardReadFailed"));
        this.openForm("", "text", null);
      }
    }
    /** 手动新建（空表单） */
    newManual() {
      this.openForm("", "text", null);
    }
    /** 右键块引用捕获：把被引用块存为 blockref 条目（目标块=引用目标） */
    captureBlockRef(blockId, refText) {
      var _a;
      if (!isBlockRefTarget(blockId)) {
        this.deps.notify("error", this.deps.t("invalidItem"));
        return;
      }
      this.openForm("", "blockref", null, {
        title: (refText || blockId).slice(0, 120),
        targetBlockId: blockId,
        docId: (_a = this.deps.currentDocId()) != null ? _a : void 0
      });
    }
    /** 右键图片捕获：assets/ 图片存为图片条目（非 assets 图诚实拒绝） */
    captureImage(assetPath, altText) {
      var _a;
      const target = classifyLinkTarget(assetPath);
      if (!target || target.kind !== "asset") {
        this.deps.notify("error", this.deps.t("invalidItem"));
        return;
      }
      const title = (altText || target.value.split("/").pop() || target.value).slice(0, 120);
      this.openForm(`![](${target.value})`, "image", null, { title, docId: (_a = this.deps.currentDocId()) != null ? _a : void 0 });
    }
    /** 右键链接捕获：http(s) 外链 → url 条目；assets/ → asset 条目；其余诚实拒绝 */
    captureLink(href, text) {
      var _a, _b;
      const target = classifyLinkTarget(href);
      if (!target) {
        this.deps.notify("error", this.deps.t("invalidItem"));
        return;
      }
      if (target.kind === "url") {
        this.openForm(target.value, "url", null, { title: (text || target.value).slice(0, 120), docId: (_a = this.deps.currentDocId()) != null ? _a : void 0 });
      } else {
        this.openForm(`[${text || "\u8D44\u6E90"}](${target.value})`, "asset", null, { title: (text || target.value).slice(0, 120), docId: (_b = this.deps.currentDocId()) != null ? _b : void 0 });
      }
    }
    /** 捕获当前块：光标所在块整体作为条目（选区文本优先级低于整块语义） */
    async captureCurrentBlock() {
      const blockId = this.deps.getSelectionText().blockId;
      if (!blockId) {
        this.deps.notify("error", this.deps.t("captureBlockNone"));
        return;
      }
      const kramdown = await this.deps.getBlockKramdown(blockId);
      if (kramdown === null || !kramdown.trim()) {
        this.deps.notify("error", this.deps.t("kernelError", "block"));
        return;
      }
      this.openForm(kramdown.slice(0, 1e5), inferTypeFromText(kramdown), blockId);
    }
    /** 捕获当前文档：整文档 Markdown 作为结构条目（来源 = 该文档） */
    async captureCurrentDoc() {
      var _a;
      const docId = this.deps.currentDocId();
      if (!docId) {
        this.deps.notify("error", this.deps.t("relinkNoDoc"));
        return;
      }
      const doc = await this.deps.exportDocContent(docId);
      if (!doc) {
        this.deps.notify("error", this.deps.t("kernelError", "doc"));
        return;
      }
      const title = (_a = doc.hPath.split("/").filter(Boolean).pop()) != null ? _a : doc.hPath;
      this.openForm(doc.content, "markdown", null, { title, docId });
    }
    openForm(defaultText, defaultType, sourceBlockId, overrides) {
      var _a;
      const t = this.deps.t;
      const dialog = new import_siyuan3.Dialog({
        title: t("newItem"),
        content: "",
        width: "min(520px, 92vw)",
        height: "auto"
      });
      const body = dialog.element.querySelector(".b3-dialog__content");
      if (!body) return;
      body.innerHTML = "";
      const form = document.createElement("div");
      form.className = "xlc-form";
      const field = (label, value, isArea, cls) => {
        const wrap = document.createElement("label");
        wrap.className = "xlc-form-field";
        const cap = document.createElement("span");
        cap.className = "xlc-form-label";
        cap.textContent = label;
        wrap.appendChild(cap);
        const inputEl = isArea ? document.createElement("textarea") : document.createElement("input");
        if (isArea) {
          inputEl.rows = 6;
        }
        inputEl.className = "b3-text-field " + cls;
        inputEl.value = value;
        wrap.appendChild(inputEl);
        form.appendChild(wrap);
        return inputEl;
      };
      const typeWrap = document.createElement("label");
      typeWrap.className = "xlc-form-field";
      const typeLabel = document.createElement("span");
      typeLabel.className = "xlc-form-label";
      typeLabel.textContent = t("type");
      typeWrap.appendChild(typeLabel);
      const typeSelect = document.createElement("select");
      typeSelect.className = "b3-select xlc-form-type";
      for (const it of ["text", "markdown", "url", "code", "image", "asset", "blockref", "structure"]) {
        const opt = document.createElement("option");
        opt.value = it;
        opt.textContent = t(`type.${it}`);
        if (it === defaultType) opt.selected = true;
        typeSelect.appendChild(opt);
      }
      typeWrap.appendChild(typeSelect);
      form.appendChild(typeWrap);
      const contentEl = field(t("contentLabel"), defaultText, true, "xlc-form-content");
      const titleEl = field(t("title"), (_a = overrides == null ? void 0 : overrides.title) != null ? _a : "", false, "xlc-form-title");
      const aliasEl = field(t("alias"), "", false, "xlc-form-alias");
      const tagsEl = field(t("tags"), "", false, "xlc-form-tags");
      const tagsHint = document.createElement("span");
      tagsHint.className = "xlc-form-hint";
      tagsHint.textContent = t("tagsHint");
      tagsEl.parentElement.appendChild(tagsHint);
      const categoryEl = field(t("category"), "", false, "xlc-form-category");
      const sugrow = document.createElement("div");
      sugrow.className = "xlc-sugrow";
      sugrow.style.display = "none";
      const sugText = document.createElement("span");
      sugrow.appendChild(sugText);
      const adoptBtn = document.createElement("button");
      adoptBtn.className = "xlc-sugrow-adopt";
      let suggestions = {};
      const applySuggestions = () => {
        var _a2;
        if (suggestions.title) titleEl.value = suggestions.title;
        if (suggestions.alias) aliasEl.value = suggestions.alias;
        if ((_a2 = suggestions.tags) == null ? void 0 : _a2.length) tagsEl.value = suggestions.tags.join(", ");
        if (suggestions.category) categoryEl.value = suggestions.category;
        this.deps.notify("info", t("aiApplied"));
      };
      adoptBtn.textContent = t("confirm");
      adoptBtn.addEventListener("click", applySuggestions);
      sugrow.appendChild(adoptBtn);
      form.insertBefore(sugrow, titleEl.parentElement);
      if (this.deps.aiEnabled()) {
        const contentLabel = contentEl.parentElement.querySelector(".xlc-form-label");
        if (contentLabel) {
          const tidyBtn = document.createElement("button");
          tidyBtn.className = "xlc-form-ai";
          tidyBtn.type = "button";
          tidyBtn.textContent = "\u2726 " + t("aiTidy");
          tidyBtn.addEventListener("click", () => {
            const value = contentEl.value.trim();
            if (!value) {
              this.deps.notify("error", t("invalidItem"));
              return;
            }
            tidyBtn.textContent = t("aiWorking");
            void this.deps.aiTidy(value).then((result) => {
              var _a2, _b;
              tidyBtn.textContent = "\u2726 " + t("aiTidy");
              if (!result.ok) {
                this.deps.notify("error", result.message);
                return;
              }
              suggestions = result;
              const parts = [
                result.title ? result.title : "",
                ((_a2 = result.tags) == null ? void 0 : _a2.length) ? result.tags.join("/") : "",
                (_b = result.category) != null ? _b : ""
              ].filter(Boolean);
              sugText.textContent = "\u2726 " + t("aiFound") + "\uFF1A" + parts.join(" \xB7 ");
              sugrow.style.display = "";
              applySuggestions();
            });
          });
          contentLabel.appendChild(tidyBtn);
        }
        const draftWrap = document.createElement("div");
        draftWrap.className = "xlc-form-field";
        const draftLabel = document.createElement("span");
        draftLabel.className = "xlc-form-label";
        draftLabel.textContent = t("aiDraftDesc");
        draftWrap.appendChild(draftLabel);
        const draftRow = document.createElement("div");
        draftRow.style.display = "flex";
        draftRow.style.gap = "6px";
        const draftInput = document.createElement("input");
        draftInput.className = "b3-text-field";
        draftInput.placeholder = t("aiDraftDesc");
        draftRow.appendChild(draftInput);
        const draftBtn = document.createElement("button");
        draftBtn.className = "b3-button b3-button--text xlc-form-ai";
        draftBtn.textContent = "\u2726 " + t("aiDraft");
        draftBtn.addEventListener("click", () => {
          const desc = draftInput.value.trim();
          if (!desc) return;
          draftBtn.textContent = t("aiWorking");
          void this.deps.aiDraft(desc).then((result) => {
            draftBtn.textContent = "\u2726 " + t("aiDraft");
            if (!result.ok) {
              this.deps.notify("error", result.message);
              return;
            }
            contentEl.value = result.text;
          });
        });
        draftRow.appendChild(draftBtn);
        draftWrap.appendChild(draftRow);
        form.insertBefore(draftWrap, form.firstChild);
      }
      const actions = document.createElement("div");
      actions.className = "xlc-form-actions";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "b3-button b3-button--cancel";
      cancelBtn.textContent = t("cancel");
      cancelBtn.addEventListener("click", () => dialog.destroy());
      const saveBtn = document.createElement("button");
      saveBtn.className = "b3-button b3-button--text";
      saveBtn.textContent = t("save");
      const submitOnEnter = (el) => {
        el.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
            ev.preventDefault();
            saveBtn.click();
          }
        });
      };
      [titleEl, aliasEl, tagsEl, categoryEl].forEach((el) => submitOnEnter(el));
      saveBtn.addEventListener("click", () => {
        const contentValue = contentEl.value;
        if (!contentValue.trim()) {
          this.deps.notify("error", t("invalidItem"));
          return;
        }
        const type = typeSelect.value;
        if (type === "blockref" && !(overrides == null ? void 0 : overrides.targetBlockId)) {
          this.deps.notify("error", t("blockrefNeedsTarget"));
          return;
        }
        let markdown = contentValue;
        if (type === "code" && !/^```/.test(contentValue.trim())) {
          markdown = "```\n" + contentValue + "\n```";
        } else if (type === "url") {
          markdown = contentValue.trim();
        }
        const doSave = () => {
          const docId = this.deps.currentDocId();
          void this.deps.createItem({
            itemType: type,
            markdown,
            title: titleEl.value || void 0,
            alias: aliasEl.value || void 0,
            tags: tagsEl.value ? tagsEl.value.split(/[,,]/).map((s) => s.trim()).filter(Boolean) : void 0,
            category: categoryEl.value || void 0,
            targetBlockId: overrides == null ? void 0 : overrides.targetBlockId,
            source: docId ? { sourceDocId: docId, sourceBlockId: sourceBlockId != null ? sourceBlockId : void 0, sourceType: (overrides == null ? void 0 : overrides.docId) ? "doc-fragment" : sourceBlockId ? "selection" : "manual" } : void 0
          }).then((result) => {
            if (result.ok) {
              this.deps.notify("info", t("saved", result.message));
              dialog.destroy();
            } else {
              this.deps.notify("error", result.message);
            }
          });
        };
        void this.deps.findDuplicate(contentValue).then((dup) => {
          if (!dup) {
            doSave();
            return;
          }
          (0, import_siyuan3.confirm)("\u26A0\uFE0F " + t("duplicateTitle"), t("duplicateConfirm", dup.title), () => doSave());
        });
      });
      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);
      form.appendChild(actions);
      body.appendChild(form);
      contentEl.focus();
    }
  };

  // scripts/harness/entry.ts
  var ENTRIES = [
    { id: "xlc-demo0000001", blockId: "20240101120000-aaaaaaa", libraryDocId: "20240101120001-hijklmn", itemType: "markdown", title: "\u9879\u76EE\u5EF6\u671F\u9053\u6B49\u4E0E\u8865\u507F\u65B9\u6848", alias: "\u5EF6\u671F\u9053\u6B49", tags: ["\u5BA2\u6237\u6C9F\u901A", "\u6A21\u677F"], category: "\u5BA2\u670D", summary: "\u5C0A\u656C\u7684\u738B\u603B\uFF1A\u5173\u4E8E\u672C\u671F\u4EA4\u4ED8\u5EF6\u671F\u2026\u2026", createdAt: 1, updatedAt: 2, sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120002-bbbbbbb" },
    { id: "xlc-demo0000002", blockId: "20240101120000-ccccccc", libraryDocId: "20240101120001-hijklmn", itemType: "text", title: "\u5EF6\u671F\u7B80\u77ED\u7248\uFF08IM \u7528\uFF09", alias: "", tags: [], category: "", summary: "\u60A8\u597D\uFF0C\u672C\u6B21\u8FED\u4EE3\u56E0\u8054\u8C03\u8D85\u671F\uFF0C\u4E0A\u7EBF\u63A8\u8FDF 2 \u5929\u2026\u2026", createdAt: 1, updatedAt: 2 },
    { id: "xlc-demo0000003", blockId: "20240101120000-ddddddd", libraryDocId: "20240101120001-hijklmn", itemType: "code", title: "SQL \u5206\u9875\u6A21\u677F", alias: "", tags: ["\u5F00\u53D1"], category: "", summary: "SELECT * FROM t LIMIT \u2026", createdAt: 1, updatedAt: 2 },
    { id: "xlc-demo0000004", blockId: "20240101120000-eeeeeee", libraryDocId: "20240101120001-hijklmn", itemType: "blockref", title: "\u4EA7\u54C1\u9700\u6C42\u6A21\u677F\uFF08\u5F15\u7528\uFF09", alias: "", tags: [], category: "", summary: "", createdAt: 1, updatedAt: 2, targetBlockId: "20240101120002-bbbbbbb" },
    { id: "xlc-demo0000005", blockId: "20240101120000-fffffff", libraryDocId: "20240101120001-hijklmn", itemType: "url", title: "SLA \u8D54\u4ED8\u6807\u51C6\u6587\u6863", alias: "", tags: [], category: "", summary: "https://wiki.example.com/sla", createdAt: 1, updatedAt: 2, url: "https://wiki.example.com/sla" }
  ];
  var PREVIEWS = {
    "xlc-demo0000001": "\u5C0A\u656C\u7684\u738B\u603B\uFF1A\n\n\u5173\u4E8E\u672C\u671F\u300C\u4F1A\u5458\u7CFB\u7EDF\u300D\u4EA4\u4ED8\u5EF6\u671F\uFF0C\u6211\u4EEC\u6DF1\u8868\u6B49\u610F\u3002\u7ECF\u590D\u76D8\uFF0C\u4E3B\u8981\u539F\u56E0\u4E3A\u7B2C\u4E09\u65B9\u652F\u4ED8\u8054\u8C03\u8D85\u671F\u3002\u76EE\u524D\u8054\u8C03\u5DF2\u5B8C\u6210 92%\uFF0C\u9884\u8BA1\u63A8\u8FDF 2 \u4E2A\u5DE5\u4F5C\u65E5\u4E0A\u7EBF\u3002\n\n\u4E3A\u5F25\u8865\u5F71\u54CD\uFF0C\u6211\u4EEC\u63D0\u4F9B\u4EE5\u4E0B\u8865\u507F\uFF1A\n1. \u672C\u671F\u670D\u52A1\u8D39\u51CF\u514D 5%\uFF1B\n2. \u4E0A\u7EBF\u540E 48 \u5C0F\u65F6\u4E13\u5C5E\u503C\u5B88\uFF1B\n3. \u4E0B\u671F\u8FED\u4EE3\u4F18\u5148\u6392\u5165\u8D35\u65B9\u9700\u6C42\u3002\n\n\u518D\u6B21\u611F\u8C22\u7406\u89E3\u4E0E\u652F\u6301\uFF0C\u6709\u4EFB\u4F55\u95EE\u9898\u968F\u65F6\u8054\u7CFB\u6211\u3002",
    "xlc-demo0000002": "\u60A8\u597D\uFF0C\u672C\u6B21\u8FED\u4EE3\u56E0\u8054\u8C03\u8D85\u671F\uFF0C\u4E0A\u7EBF\u63A8\u8FDF 2 \u5929\u3002\u7ED9\u60A8\u5E26\u6765\u4E0D\u4FBF\u6DF1\u8868\u6B49\u610F\uFF0C\u6709\u95EE\u9898\u968F\u65F6\u627E\u6211\u3002",
    "xlc-demo0000003": "```sql\nSELECT * FROM articles\nWHERE status = 'published'\nORDER BY updated_at DESC\nLIMIT 20 OFFSET 40;\n```",
    "xlc-demo0000004": "\uFF08\u5F15\u7528\u8BED\u6CD5\u9884\u89C8\uFF09((20240101120002-bbbbbbb '\u4EA7\u54C1\u9700\u6C42\u6A21\u677F'))",
    "xlc-demo0000005": "https://wiki.example.com/sla"
  };
  var T = (key, ...args) => {
    var _a;
    const map = {
      pluginName: "\u5C0F\u9A74\u5E38\u7528",
      searchPlaceholder: "\u641C\u7D22\u5E38\u7528\u5185\u5BB9\uFF08? \u524D\u7F00 = AI \u8BED\u4E49\u627E\uFF09",
      type: "\u7C7B\u578B",
      tags: "\u6807\u7B7E",
      tagsHint: "\u9017\u53F7\u5206\u9694",
      title: "\u6807\u9898",
      alias: "\u522B\u540D",
      category: "\u5206\u7C7B",
      contentLabel: "\u5185\u5BB9\uFF08Markdown\uFF09",
      filterAll: "\u5168\u90E8\u7C7B\u578B",
      "type.text": "\u7EAF\u6587\u672C",
      "type.markdown": "Markdown",
      "type.url": "\u7F51\u5740",
      "type.code": "\u4EE3\u7801",
      "type.image": "\u56FE\u7247",
      "type.asset": "\u9644\u4EF6",
      "type.blockref": "\u5757\u5F15\u7528",
      "type.structure": "\u5757\u7ED3\u6784",
      filterFavorites: "\u6536\u85CF",
      filterRecent: "\u6700\u8FD1",
      empty: "\u6CA1\u6709\u5339\u914D\u7684\u6761\u76EE",
      usageHint: "\u2191\u2193 \u9009\u62E9 \xB7 Enter \u63D2\u5165 \xB7 Ctrl+Enter \u590D\u5236 \xB7 Esc \u5173\u95ED",
      usageHintMobile: "\u70B9\u6309\u63D2\u5165 \xB7 \u957F\u6309\u66F4\u591A",
      insert: "\u63D2\u5165",
      copy: "\u590D\u5236",
      openSource: "\u6253\u5F00\u6765\u6E90",
      edit: "\u7F16\u8F91",
      delete: "\u5220\u9664",
      insertRef: "\u63D2\u5165\u5F15\u7528",
      insertEmbed: "\u63D2\u5165\u5D4C\u5165",
      insertCopy: "\u590D\u5236\u5185\u5BB9",
      sourceMissing: "\u6765\u6E90\u5931\u6548",
      sourceGone: "\u6765\u6E90\u5757\u5DF2\u4E0D\u5B58\u5728\uFF08\u539F\u6587\u6863\u88AB\u91CD\u7EC4\uFF09\xB7 \u6253\u5F00\u6765\u6E90\u53EF\u91CD\u65B0\u6307\u5B9A",
      previewUnavailable: "\u6682\u65E0\u9884\u89C8",
      aiFound: "AI \u627E\u5230\u7684",
      aiWorking: "AI \u5904\u7406\u4E2D\u2026",
      aiOriginalPreserved: "\u539F\u6587\u672A\u88AB\u4FEE\u6539",
      insertNoEditor: "\u5F53\u524D\u6CA1\u6709\u6D3B\u52A8\u7F16\u8F91\u5668\uFF0C\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF0C\u53EF\u624B\u52A8\u7C98\u8D34",
      kernelError: "\u601D\u6E90\u63A5\u53E3\u8C03\u7528\u5931\u8D25",
      "tf.polish": "\u6DA6\u8272",
      "tf.shorten": "\u7F29\u77ED",
      "tf.formal": "\u6B63\u5F0F\u5316",
      "tf.translate-en": "\u8BD1\u4E3A\u82F1\u6587",
      "tf.bulletize": "\u5217\u8868\u5316",
      more: "\u8FD4\u56DE\u52A8\u4F5C",
      newItem: "\u65B0\u5EFA\u6761\u76EE",
      save: "\u4FDD\u5B58",
      cancel: "\u53D6\u6D88",
      confirm: "\u786E\u5B9A",
      invalidItem: "\u6761\u76EE\u6570\u636E\u65E0\u6548",
      aiTidy: "AI \u6574\u7406",
      aiDraft: "AI \u8349\u7A3F",
      aiDraftDesc: "\u63CF\u8FF0\u4F60\u60F3\u8981\u7684\u5185\u5BB9\uFF0CAI \u751F\u6210\u8349\u7A3F",
      aiApplied: "\u5DF2\u5E94\u7528 AI \u5EFA\u8BAE",
      saved: "\u5DF2\u4FDD\u5B58\uFF1A%s",
      "sort.manual": "\u624B\u52A8/\u7F6E\u9876",
      "sort.recent": "\u6700\u8FD1\u4F7F\u7528",
      "sort.title": "\u6807\u9898",
      totalItems: "\u5171 %s \u6761",
      duplicateItem: "\u521B\u5EFA\u526F\u672C",
      insertToDoc: "\u63D2\u5165\u5230\u6307\u5B9A\u6587\u6863",
      insertToDocPick: "\u9009\u62E9\u76EE\u6807\u6587\u6863\uFF08\u8F93\u5165\u5173\u952E\u8BCD\u641C\u7D22\uFF09",
      saveTransformed: "\u5B58\u4E3A\u65B0\u6761\u76EE",
      deleteConfirm: "\u5220\u9664\u6761\u76EE\u300C%s\u300D\uFF1F",
      providerSection: "\u63D0\u4F9B\u65B9\u5185\u5BB9",
      providerInsert: "\u63D2\u5165\uFF08\u63D0\u4F9B\u65B9\uFF09",
      providerCopy: "\u590D\u5236\uFF08\u63D0\u4F9B\u65B9\uFF09",
      providerExecutable: "\u53EF\u6267\u884C",
      providerPendingReload: "\u5F85\u91CD\u8F7D",
      openSettings: "\u8BBE\u7F6E / \u66F4\u6539\u5185\u5BB9\u5E93",
      openSettingsChangeLib: "\u66F4\u6539\u5185\u5BB9\u5E93",
      aiSection: "AI \u52A9\u624B",
      aiEnabled: "\u542F\u7528 AI \u52A9\u624B",
      aiShareContent: "\u5141\u8BB8 AI \u8BFB\u53D6\u6761\u76EE\u5B8C\u6574\u6B63\u6587",
      searchSection: "\u641C\u7D22",
      pinyinToggle: "\u62FC\u97F3\u641C\u7D22",
      placeholdersToggle: "\u52A8\u6001\u5360\u4F4D\u7B26",
      placeholdersHint: "\u652F\u6301 {{xlc:date}} \u7B49",
      dataSection: "\u6570\u636E\uFF08\u5BFC\u51FA / \u5BFC\u5165\uFF09",
      librarySection: "\u5F53\u524D\u5185\u5BB9\u5E93",
      libraryNone: "\u672A\u914D\u7F6E",
      reindexBtn: "\u91CD\u5EFA\u7D22\u5F15",
      clearRecents: "\u6E05\u7A7A\u6700\u8FD1\u4F7F\u7528",
      clearRecentsConfirm: "\u6E05\u7A7A\u6700\u8FD1\u4F7F\u7528\u8BB0\u5F55\uFF1F",
      exportBtn: "\u5BFC\u51FA\u5168\u90E8\u6761\u76EE (JSON)",
      importBtn: "\u5BFC\u5165 JSON",
      exportMdBtn: "\u5BFC\u51FA Markdown \u5305\uFF08\u542B\u8D44\u6E90\uFF09",
      tagAuditBtn: "AI \u6807\u7B7E\u4F53\u68C0",
      setupTitle: "\u9009\u62E9\u5E38\u7528\u5185\u5BB9\u5E93",
      setupHint: "\u6761\u76EE\u5C06\u4EE5\u771F\u5B9E\u5757\u7684\u5F62\u5F0F\u4FDD\u5B58\u5728\u4F60\u9009\u62E9\u7684\u6587\u6863\u4E2D\uFF08\u53EF\u5728\u601D\u6E90\u4E2D\u6B63\u5E38\u7F16\u8F91\uFF09\u3002\u521B\u5EFA\u65B0\u6587\u6863\u524D\u4F1A\u660E\u786E\u63D0\u793A\uFF0C\u4E0D\u4F1A\u9759\u9ED8\u5199\u5165\u3002",
      setupPickDoc: "\u9009\u62E9\u73B0\u6709\u6587\u6863",
      setupNotebook: "\u6309\u7B14\u8BB0\u672C",
      setupNewDoc: "\u521B\u5EFA\u65B0\u5E93\u6587\u6863",
      setupNewDocName: "\u5E38\u7528\u5185\u5BB9\u5E93",
      docPicker: "\u9009\u62E9\u5E93\u6587\u6863",
      docPickerEmpty: "\u6CA1\u6709\u5339\u914D\u7684\u6587\u6863"
    };
    let text = (_a = map[key]) != null ? _a : key;
    for (const arg of args) text = text.replace("%s", arg);
    return text;
  };
  function makeDeps(overrides = {}) {
    var _a;
    const aiOn = (_a = overrides.aiEnabled) != null ? _a : true;
    return {
      t: T,
      search: async () => ({ entries: ENTRIES, truncated: false, total: 128 }),
      getTags: async () => ["\u5BA2\u6237\u6C9F\u901A", "\u6A21\u677F", "\u5F00\u53D1"],
      preview: async (itemId) => {
        var _a2;
        return (_a2 = PREVIEWS[itemId]) != null ? _a2 : "";
      },
      runAction: async () => ({ ok: true, message: "inserted" }),
      openSource: async () => ({ ok: true, message: "opened" }),
      editItem: async () => {
      },
      deleteItem: async () => {
      },
      toggleFavorite: () => true,
      isFavorite: (id) => id === "xlc-demo0000001",
      insertRaw: async () => true,
      getSort: () => "manual",
      cycleSort: () => {
      },
      searchDocs: async (k) => k ? [{ id: "20240101120001-hijklmn", hPath: "/\u5E38\u7528\u5185\u5BB9\u5E93", name: "\u5E38\u7528\u5185\u5BB9\u5E93" }] : [],
      insertToDoc: async () => true,
      duplicateItem: async () => {
      },
      saveTransformed: async () => {
      },
      getFilters: () => ({ type: "", tag: "" }),
      setFilters: () => {
      },
      getLastQuery: () => "",
      setLastQuery: () => {
      },
      insertTarget: null,
      openSetup: () => {
      },
      providerSearch: async (query) => query.includes("\u5DE5\u4F5C\u53F0") ? [
        { virtualId: "pv:xiaolv-speed-switch:1", providerId: "xiaolv-speed-switch", providerName: "\u5C0F\u9A74\u96F7\u5207", title: "\u5F53\u524D\u5DE5\u4F5C\u53F0", payload: "\u5FEB\u901F\u56DE\u5230\u5DE5\u4F5C\u53F0\u5E03\u5C40\uFF08\u63D0\u4F9B\u65B9\u6F14\u793A\u6570\u636E\uFF09" },
        { virtualId: "pv:xiaolv-checkin:1", providerId: "xiaolv-checkin", providerName: "\u5C0F\u9A74\u6253\u5361", title: "\u4ECA\u65E5\u6253\u5361\u72B6\u6001", payload: "\u5DF2\u5B8C\u6210 3/4 \u9879\u4E60\u60EF\u6253\u5361\uFF08\u63D0\u4F9B\u65B9\u6F14\u793A\u6570\u636E\uFF09" }
      ] : [],
      insertProviderPayload: async () => true,
      copyProviderPayload: async () => true,
      aiSemantic: async (_desc) => ({ ok: true, entries: ENTRIES.slice(0, 3) }),
      aiTransform: async (_itemId, kind) => ({
        ok: true,
        text: kind === "translate-en" ? 'Dear Mr. Wang:\n\nWe sincerely apologize for the delay of the "Membership System" delivery. Root cause: third-party payment integration overrun. Integration is 92% complete; launch postponed by 2 business days.\n\nCompensation: 5% fee reduction; 48h dedicated support after launch; priority scheduling next iteration.' : "\u5C0A\u656C\u7684\u738B\u603B\uFF1A\n\n\u672C\u671F\u300C\u4F1A\u5458\u7CFB\u7EDF\u300D\u56E0\u7B2C\u4E09\u65B9\u652F\u4ED8\u8054\u8C03\u8D85\u671F\u800C\u5EF6\u671F\uFF0C\u6211\u4EEC\u6DF1\u8868\u6B49\u610F\u3002\u8054\u8C03\u5DF2\u5B8C\u6210 92%\uFF0C\u9884\u8BA1\u63A8\u8FDF 2 \u4E2A\u5DE5\u4F5C\u65E5\u4E0A\u7EBF\u3002\n\n\u8865\u507F\u65B9\u6848\uFF1A\u672C\u671F\u670D\u52A1\u8D39\u51CF\u514D 5%\uFF1B\u4E0A\u7EBF\u540E 48 \u5C0F\u65F6\u4E13\u5C5E\u503C\u5B88\uFF1B\u4E0B\u671F\u9700\u6C42\u4F18\u5148\u6392\u671F\u3002"
      }),
      aiEnabled: () => aiOn,
      isSourceMissing: (entry) => overrides.missing === true && entry.id === "xlc-demo0000001",
      close: () => {
      },
      isMobile: () => false
    };
  }
  window.XlcHarness = {
    openDialog(overrides) {
      var _a;
      const dialog = new CommonSearchDialog(makeDeps(overrides), {
        favorites: /* @__PURE__ */ new Set(["xlc-demo0000001"]),
        recents: /* @__PURE__ */ new Map([["xlc-demo0000002", 2]]),
        now: 1
      });
      dialog.open();
      const input = document.querySelector(".xlc-search-input");
      if (input) {
        input.value = (_a = overrides == null ? void 0 : overrides.query) != null ? _a : "?\u7ED9\u5BA2\u6237\u5EF6\u671F\u4E0A\u7EBF\u7684\u9053\u6B49\u56DE\u590D";
        input.dispatchEvent(new Event("input"));
      }
      return dialog;
    },
    openSettings() {
      const ctx = {
        t: T,
        state: {
          schemaVersion: 2,
          favorites: [],
          recents: [],
          sort: "manual",
          uiPrefs: { lastTypeFilter: "", lastTagFilter: "" },
          providers: [{ pluginId: "xiaolv-checkin", displayName: "\u5C0F\u9A74\u6253\u5361", protocolVersion: 1, registeredAt: 1 }],
          ai: { enabled: true, shareContent: true },
          search: { pinyin: true, placeholders: true }
        },
        getConfig: () => ({ configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1 }),
        library: {
          listNotebooks: async () => ({ ok: true, data: [{ id: "20240101", name: "\u7B14\u8BB0" }] }),
          searchDocs: async (k) => k ? [{ id: "20240101120001-hijklmn", hPath: "/\u5E38\u7528\u5185\u5BB9\u5E93", box: "nb", name: "\u5E38\u7528\u5185\u5BB9\u5E93" }] : [],
          reindex: async () => ({ entries: [], items: /* @__PURE__ */ new Map(), truncated: false, docsScanned: 1, errors: [], builtAt: 1 })
        },
        ai: { updateSettings: () => {
        }, getSettings: () => ({ enabled: true, shareContent: true }) },
        registry: {
          list: () => [{ record: { pluginId: "xiaolv-checkin", displayName: "\u5C0F\u9A74\u6253\u5361", protocolVersion: 1, registeredAt: 1 } }],
          listExecutable: () => []
        },
        notify: () => {
        },
        applyConfig: () => {
        },
        persistSoon: () => {
        },
        exportBundle: async () => "{}",
        importBundleText: async () => ({ total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: [] }),
        fetchAssetBytes: async () => null,
        aiErrorText: (err) => String(err),
        applyPinyinAdapter: () => {
        }
      };
      openSettingsDialog(ctx);
    },
    openSetup() {
      const ctx = {
        t: T,
        state: {
          schemaVersion: 2,
          favorites: [],
          recents: [],
          sort: "manual",
          uiPrefs: { lastTypeFilter: "", lastTagFilter: "" },
          providers: [],
          ai: { enabled: false, shareContent: false },
          search: { pinyin: true, placeholders: true }
        },
        getConfig: () => null,
        library: {
          listNotebooks: async () => ({ ok: true, data: [{ id: "20240101", name: "\u7B14\u8BB0" }] }),
          searchDocs: async () => [],
          reindex: async () => ({ entries: [], items: /* @__PURE__ */ new Map(), truncated: false, docsScanned: 0, errors: [], builtAt: 1 })
        },
        ai: { updateSettings: () => {
        }, getSettings: () => ({ enabled: false, shareContent: false }) },
        registry: { list: () => [], listExecutable: () => [] },
        notify: () => {
        },
        applyConfig: () => {
        },
        persistSoon: () => {
        },
        exportBundle: async () => "{}",
        importBundleText: async () => ({ total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: [] }),
        importMarkdownItems: async () => ({ total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: [] }),
        fetchAssetBytes: async () => null,
        aiErrorText: (err) => String(err),
        applyPinyinAdapter: () => {
        }
      };
      openSetupDialog(ctx);
    },
    openCapture(aiOn = true) {
      const capture = new CaptureDialog({
        t: T,
        getSelectionText: () => ({ text: "", blockId: null }),
        currentDocId: () => "20240101120001-hijklmn",
        readClipboardText: async () => "",
        createItem: async (input) => {
          var _a;
          return { ok: true, message: (_a = input.title) != null ? _a : "item", itemId: "xlc-new000000001" };
        },
        notify: () => {
        },
        getBlockKramdown: async () => "\u5757\u5185\u5BB9",
        exportDocContent: async () => ({ hPath: "/\u5E38\u7528\u5185\u5BB9\u5E93", content: "# \u5185\u5BB9" }),
        aiEnabled: () => aiOn,
        aiTidy: async (content) => ({ ok: true, title: "AI \u5EFA\u8BAE " + content.slice(0, 6), tags: ["AI"] }),
        aiDraft: async (desc) => ({ ok: true, text: "\u8349\u7A3F\uFF08" + desc + "\uFF09" })
      });
      capture.newManual();
    }
  };
})();
