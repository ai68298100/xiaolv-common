(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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

  // src/ui/dialog.ts
  var import_siyuan = __toESM(require_stub_dom());

  // src/constants.ts
  var LIMITS = {
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

  // src/model/item.ts
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
      this.aiResults = false;
      this.activeIndex = 0;
      this.searchSeq = 0;
      this.previewSeq = 0;
      this.currentScope = "all";
      this.lastPreviewId = null;
      this.ctx = ctx;
    }
    open() {
      var _a;
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
      (_a = this.dialog.element.querySelector(".xlc-search-input")) == null ? void 0 : _a.focus();
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
        void this.refresh();
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
      typeSelect.addEventListener("change", () => void this.refresh());
      filters.appendChild(typeSelect);
      const tagSelect = document.createElement("select");
      tagSelect.className = "b3-select xlc-tag-select";
      tagSelect.setAttribute("aria-label", this.deps.t("tags"));
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
      });
      tagSelect.addEventListener("change", () => void this.refresh());
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
      footer.textContent = isMobile ? this.deps.t("usageHintMobile") : this.deps.t("usageHint");
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
      if (status) status.textContent = this.results.length ? "" : this.deps.t("empty");
      if (footer) {
        footer.textContent = (this.deps.isMobile() ? this.deps.t("usageHintMobile") : this.deps.t("usageHint")) + " \uFF5C " + this.deps.t("totalItems", String(total)) + (truncated ? " \u26A0" : "");
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
      this.paintActive();
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
    paintActive() {
      var _a;
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      if (!list) return;
      Array.from(list.children).forEach((child, i) => {
        child.classList.toggle("xlc-row--active", i === this.activeIndex);
        child.setAttribute("aria-selected", i === this.activeIndex ? "true" : "false");
      });
      const active = list.children[this.activeIndex];
      active == null ? void 0 : active.scrollIntoView({ block: "nearest" });
    }
    schedulePreview(entry) {
      this.updatePreview(entry.id);
    }
    updatePreview(forceId) {
      var _a, _b, _c, _d, _e, _f;
      const entry = this.results[this.activeIndex];
      const id = (_a = forceId != null ? forceId : entry == null ? void 0 : entry.id) != null ? _a : null;
      const paneBody = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-pane-body");
      const paneTitle = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-pane-title");
      const paneWarn = (_d = this.dialog) == null ? void 0 : _d.element.querySelector(".xlc-pane-warn");
      const paneAi = (_e = this.dialog) == null ? void 0 : _e.element.querySelector(".xlc-pane-ai");
      if (!paneBody || !id || id === this.lastPreviewId) return;
      this.lastPreviewId = id;
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
      const dismiss = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("pointerdown", dismiss, true);
        }
      };
      document.addEventListener("pointerdown", dismiss, true);
    }
    async onKeydown(e) {
      var _a;
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      if (!list) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, Math.max(this.results.length - 1, 0));
        this.paintActive();
        this.updatePreview();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.paintActive();
        this.updatePreview();
      } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const entry = this.results[this.activeIndex];
        if (entry) await this.runPrimary(entry);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const entry = this.results[this.activeIndex];
        if (entry) await this.deps.runAction(entry.id, "copy");
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.destroy();
      }
    }
    destroy() {
      var _a;
      (_a = this.dialog) == null ? void 0 : _a.destroy();
      this.dialog = null;
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
      filterAll: "\u5168\u90E8\u7C7B\u578B",
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
      "sort.manual": "\u624B\u52A8/\u7F6E\u9876",
      "sort.recent": "\u6700\u8FD1\u4F7F\u7528",
      "sort.title": "\u6807\u9898",
      totalItems: "\u5171 %s \u6761",
      duplicateItem: "\u521B\u5EFA\u526F\u672C",
      insertToDoc: "\u63D2\u5165\u5230\u6307\u5B9A\u6587\u6863",
      insertToDocPick: "\u9009\u62E9\u76EE\u6807\u6587\u6863\uFF08\u8F93\u5165\u5173\u952E\u8BCD\u641C\u7D22\uFF09",
      saveTransformed: "\u5B58\u4E3A\u65B0\u6761\u76EE",
      deleteConfirm: "\u5220\u9664\u6761\u76EE\u300C%s\u300D\uFF1F"
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
      const dialog = new CommonSearchDialog(makeDeps(overrides), {
        favorites: /* @__PURE__ */ new Set(["xlc-demo0000001"]),
        recents: /* @__PURE__ */ new Map([["xlc-demo0000002", 2]]),
        now: 1
      });
      dialog.open();
      const input = document.querySelector(".xlc-search-input");
      if (input) {
        input.value = "?\u7ED9\u5BA2\u6237\u5EF6\u671F\u4E0A\u7EBF\u7684\u9053\u6B49\u56DE\u590D";
        input.dispatchEvent(new Event("input"));
      }
      return dialog;
    }
  };
})();
