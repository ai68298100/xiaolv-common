"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
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
          content.className = "b3-dialog__body";
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
  var import_siyuan2 = __toESM(require_stub_dom());

  // src/ui/dialog-dom.ts
  function getDialogBody(root) {
    var _a;
    return (_a = root.querySelector(".b3-dialog__body")) != null ? _a : root.querySelector(".b3-dialog__content");
  }

  // src/constants.ts
  var PROTOCOL_NAME = "xiaolv-common";
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
    kernelTimeoutMs: 8e3,
    askValueChars: 2e3,
    maxUsage: 2e3,
    maxAskFields: 16,
    maxCustomTransforms: 10,
    customNameChars: 20,
    customPromptChars: 500
  };
  var EXPORT_SCHEMA_VERSION = 1;

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
  var SOURCE_TYPES = [
    "",
    "selection",
    "block",
    "doc-fragment",
    "clipboard",
    "manual",
    "resource",
    "external"
  ];
  function isItemType(v) {
    return typeof v === "string" && ITEM_TYPES.includes(v);
  }
  function isSafeHttpUrl(v) {
    if (typeof v !== "string") return false;
    const value = v.trim();
    if (!/^https?:\/\//i.test(value)) return false;
    try {
      const parsed = new URL(value);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }
  function isSourceType(v) {
    return typeof v === "string" && SOURCE_TYPES.includes(v);
  }
  var LOGICAL_ID_RE = /^xlc-[0-9a-z]{10,40}$/;
  function isLogicalId(v) {
    return typeof v === "string" && LOGICAL_ID_RE.test(v);
  }

  // src/model/variables.ts
  var ASK_PATTERN = /\{\{xlc:ask:([^|}]+)(?:\|([^}]*))?\}\}/g;
  function parseAskField(rawName, rawOptions) {
    var _a, _b;
    const name = rawName.trim().slice(0, LIMITS.tag);
    if (!name) return null;
    const options = (rawOptions != null ? rawOptions : "").split(",").map((s) => s.trim().slice(0, LIMITS.tag)).filter(Boolean).slice(0, 16);
    if (options.length === 1 && ((_a = options[0]) == null ? void 0 : _a.toLowerCase()) === "date") return { name, kind: "date", options: [] };
    if (options.length === 1 && ((_b = options[0]) == null ? void 0 : _b.toLowerCase()) === "textarea") return { name, kind: "textarea", options: [] };
    if (options.length >= 2) return { name, kind: "select", options };
    return { name, kind: "text", options: [] };
  }
  function askFieldTag(field) {
    if (field.kind === "text") return `{{xlc:ask:${field.name}}}`;
    if (field.kind === "select") return `{{xlc:ask:${field.name}|${field.options.join(",")}}}`;
    return `{{xlc:ask:${field.name}|${field.kind}}}`;
  }
  function listAskFields(text) {
    var _a;
    if (!text) return [];
    const fields = [];
    const seen = /* @__PURE__ */ new Set();
    for (const match of text.matchAll(ASK_PATTERN)) {
      const field = parseAskField((_a = match[1]) != null ? _a : "", match[2]);
      if (!field || seen.has(field.name)) continue;
      seen.add(field.name);
      fields.push(field);
      if (fields.length >= 16) break;
    }
    return fields;
  }
  var CURSOR_TOKEN = "{{xlc:cursor}}";
  function hasCursorToken(text) {
    return text.includes(CURSOR_TOKEN);
  }

  // src/ui/variable-form.ts
  var import_siyuan = __toESM(require_stub_dom());
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
  function openVariableFillCard(options) {
    var _a, _b;
    const t = options.t;
    const dialog = new import_siyuan.Dialog({
      title: t("varFormTitle"),
      content: "",
      width: "min(360px, 92vw)",
      height: "auto",
      // 所有关闭路径（Esc/scrim）统一走 onCancel：上层搜索弹窗焦点回归（R128）；
      // 按钮确认/取消已自行结算，不在此重复触发（R138 结算语义）
      destroyCallback: () => {
        var _a2;
        if (!settled) (_a2 = options.onCancel) == null ? void 0 : _a2.call(options);
      }
    });
    const container = dialog.element.querySelector(".b3-dialog__container");
    if (container) container.classList.add("xlc-varform-host");
    const body = getDialogBody(dialog.element);
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-varform";
    const head = document.createElement("div");
    head.className = "xlc-varform-head";
    const badge = document.createElement("span");
    badge.className = "xlc-badge xlc-badge--markdown";
    badge.textContent = (_a = TYPE_BADGES[options.itemType]) != null ? _a : "TXT";
    head.appendChild(badge);
    const title = document.createElement("span");
    title.className = "xlc-varform-title";
    title.textContent = options.title || t("unknownType");
    head.appendChild(title);
    const escHint = document.createElement("span");
    escHint.className = "xlc-kbd";
    escHint.textContent = "Esc " + t("cancel");
    head.appendChild(escHint);
    root.appendChild(head);
    const sub = document.createElement("div");
    sub.className = "xlc-varform-sub";
    sub.textContent = t("varFormSub", String(options.fields.length));
    root.appendChild(sub);
    const inputs = [];
    const fieldsWrap = document.createElement("div");
    fieldsWrap.className = "xlc-varform-fields";
    for (const [fieldIndex, field] of options.fields.entries()) {
      const wrap = document.createElement("label");
      wrap.className = "xlc-varform-field";
      const label = document.createElement("span");
      label.className = "xlc-varform-label";
      label.textContent = field.name;
      const tag = document.createElement("span");
      tag.className = "xlc-varform-tag";
      tag.textContent = askFieldTag(field);
      label.appendChild(tag);
      wrap.appendChild(label);
      const input = field.kind === "textarea" ? document.createElement("textarea") : document.createElement("input");
      input.className = "b3-text-field";
      if (field.kind === "textarea") {
        input.rows = 3;
        input.setAttribute("spellcheck", "false");
      } else {
        input.setAttribute("enterkeyhint", "done");
      }
      if (field.kind === "date") input.type = "date";
      if (field.kind === "select") {
        input.setAttribute("list", `xlc-varform-list-${fieldIndex}`);
        const datalist = document.createElement("datalist");
        datalist.id = `xlc-varform-list-${fieldIndex}`;
        for (const opt of field.options) {
          const option = document.createElement("option");
          option.value = opt;
          datalist.appendChild(option);
        }
        wrap.appendChild(datalist);
      }
      input.dataset.xlcVarField = field.name;
      wrap.appendChild(input);
      inputs.push(input);
      fieldsWrap.appendChild(wrap);
    }
    root.appendChild(fieldsWrap);
    const foot = document.createElement("div");
    foot.className = "xlc-varform-foot";
    const kbdHint = document.createElement("span");
    kbdHint.className = "xlc-varform-hint";
    kbdHint.textContent = options.fields.some((f) => f.kind === "textarea") ? t("varFormHintMultiline") : t("varFormHint");
    foot.appendChild(kbdHint);
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "b3-button";
    cancelBtn.textContent = t("cancel");
    foot.appendChild(cancelBtn);
    const insertBtn = document.createElement("button");
    insertBtn.className = "b3-button xlc-btn-primary";
    insertBtn.textContent = t("insert");
    foot.appendChild(insertBtn);
    root.appendChild(foot);
    body.appendChild(root);
    const collect = () => {
      var _a2;
      const fills = {};
      for (const input of inputs) {
        const name = (_a2 = input.dataset.xlcVarField) != null ? _a2 : "";
        if (name) fills[name] = input.value;
      }
      return fills;
    };
    let settled = false;
    const confirm3 = () => {
      if (settled) return;
      settled = true;
      dialog.destroy();
      options.onConfirm(collect());
    };
    insertBtn.addEventListener("click", confirm3);
    cancelBtn.addEventListener("click", () => {
      var _a2;
      if (settled) return;
      settled = true;
      dialog.destroy();
      (_a2 = options.onCancel) == null ? void 0 : _a2.call(options);
    });
    root.addEventListener("keydown", (ev) => {
      var _a2;
      if (ev.isComposing || ev.keyCode === 229) return;
      if (ev.key === "Enter" && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
        if (ev.target.tagName === "BUTTON") return;
        if (ev.target.tagName === "TEXTAREA") return;
        const el = ev.target;
        if (el instanceof HTMLInputElement && el.list) {
          setTimeout(() => confirm3(), 0);
          return;
        }
        ev.preventDefault();
        confirm3();
        return;
      }
      if (ev.key === "Tab") {
        const focusables = Array.from(
          root.querySelectorAll("input, textarea, button")
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const index = focusables.indexOf(document.activeElement);
        ev.preventDefault();
        const next = ev.shiftKey ? (index - 1 + focusables.length) % focusables.length : (index + 1) % focusables.length;
        (_a2 = focusables[next]) == null ? void 0 : _a2.focus();
      }
    });
    (_b = inputs[0]) == null ? void 0 : _b.focus();
  }
  function buildVariableBar(t, getTarget) {
    const bar = document.createElement("div");
    bar.className = "xlc-varbar";
    const cap = document.createElement("span");
    cap.className = "xlc-varbar-cap";
    cap.textContent = t("insertVariable");
    bar.appendChild(cap);
    const snippets = [
      "{{xlc:ask:\u5B57\u6BB5}}",
      "{{xlc:ask:\u5B57\u6BB5|\u9009\u9879A,\u9009\u9879B}}",
      "{{xlc:ask:\u5B57\u6BB5|textarea}}",
      "{{xlc:snippet:\u6807\u9898}}",
      "{{xlc:cursor}}",
      "{{xlc:date}}",
      "{{xlc:date|+3d}}",
      "{{xlc:random|\u9009\u9879A,\u9009\u9879B}}",
      "{{xlc:doc}}",
      "{{xlc:clipboard}}"
    ];
    for (const snippet of snippets) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "xlc-varbtn";
      btn.textContent = snippet;
      btn.addEventListener("click", () => {
        var _a, _b;
        const el = getTarget();
        const start = (_a = el.selectionStart) != null ? _a : el.value.length;
        const end = (_b = el.selectionEnd) != null ? _b : start;
        el.value = el.value.slice(0, start) + snippet + el.value.slice(end);
        const caret = start + snippet.length;
        el.focus();
        el.setSelectionRange(caret, caret);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      bar.appendChild(btn);
    }
    return bar;
  }

  // src/ui/dialog.ts
  var TYPE_BADGES2 = {
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
    constructor(deps) {
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
      /** 空状态文案（refresh 计算后交 renderList 渲染大空态；瞬态/错误仍走 status 行） */
      this.emptyMessage = "";
      /** 使用计数快照（refresh 时取自侧车；行 meta 与预览徽标展示用） */
      this.usageCounts = /* @__PURE__ */ new Map();
      /** 最近一次查询词（行标题命中高亮用；空串=不高亮） */
      this.lastQueryText = "";
      /** 动作菜单 document 监听兜底清理（destroy 时调用；防键盘关弹窗残留监听） */
      this.menuDismiss = null;
      this.inputDebounce = null;
      this.longPressCancel = null;
      /** IME 组合输入中（中文输入法组词期间跳过刷新，compositionend 后统一刷新） */
      this.isComposing = false;
      /** 普通点击 = 主动作（insert；blockref = 插入引用）。含变量时先弹填充卡片（F1）。
       *  执行期防重入（R138）：双击行/按住 Enter 不得重复插入同一块。 */
      this.primaryBusy = false;
      this.varFormOpen = false;
      /** AI 变换代次：连点两个变换时丢弃慢的旧结果（R138） */
      this.transformSeq = 0;
      /** 排序菜单关闭时刻：chip 的 click 在 pointerdown 关闭之后到达，不得立刻重开（R138 toggle） */
      this.sortMenuClosedAt = 0;
    }
    open() {
      const isMobile = this.deps.isMobile();
      const content = this.buildDom(isMobile);
      this.dialog = new import_siyuan2.Dialog({
        title: this.deps.t("pluginName"),
        content: "",
        width: isMobile ? "100vw" : "min(760px, 94vw)",
        height: isMobile ? "100vh" : "min(600px, 84vh)",
        destroyCallback: () => {
          this.dialog = null;
          this.deps.close();
        }
      });
      const body = getDialogBody(this.dialog.element);
      if (body) {
        body.innerHTML = "";
        body.appendChild(content);
      }
      const container = this.dialog.element.querySelector(".b3-dialog__container");
      if (container) container.classList.add(isMobile ? "xlc-sheet" : "xlc-dialog-host");
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
      input.setAttribute("enterkeyhint", "search");
      input.setAttribute("autocomplete", "off");
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("spellcheck", "false");
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-expanded", "true");
      input.setAttribute("aria-label", this.deps.t("searchPlaceholder"));
      const syncQMark = () => {
        qMark.classList.toggle("xlc-search-q--off", input.value.startsWith("?"));
        clearBtn.classList.toggle("xlc-search-clear--on", input.value.length > 0);
      };
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "xlc-search-clear";
      clearBtn.textContent = "\xD7";
      clearBtn.setAttribute("aria-label", this.deps.t("clearSearch"));
      clearBtn.addEventListener("click", () => {
        input.value = "";
        syncQMark();
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      input.addEventListener("input", () => {
        syncQMark();
        this.currentScope = "all";
        this.syncScopeChips();
        this.deps.setLastQuery(input.value.replace(/^\?+/, ""));
        if (this.isComposing) return;
        if (this.inputDebounce) clearTimeout(this.inputDebounce);
        this.inputDebounce = setTimeout(() => void this.refresh(), 200);
      });
      input.addEventListener("compositionstart", () => {
        this.isComposing = true;
      });
      input.addEventListener("compositionend", () => {
        this.isComposing = false;
        syncQMark();
        this.currentScope = "all";
        this.syncScopeChips();
        if (this.inputDebounce) clearTimeout(this.inputDebounce);
        this.inputDebounce = setTimeout(() => void this.refresh(), 50);
      });
      input.addEventListener("keydown", (e) => void this.onKeydown(e));
      search.appendChild(qMark);
      search.appendChild(input);
      search.appendChild(clearBtn);
      top.appendChild(search);
      if (!isMobile) {
        const isApple = /Mac|iPhone|iPad/i.test(navigator.platform || "");
        const kbdRow = document.createElement("div");
        kbdRow.className = "xlc-kbdrow";
        for (const hint of [
          "\u2191\u2193",
          this.deps.t("kbdEnter"),
          this.deps.t("kbdCopy", isApple ? "\u2318" : "\u2303"),
          this.deps.t("kbdAltDirect"),
          "Esc"
        ]) {
          const kbd = document.createElement("span");
          kbd.className = "xlc-kbd";
          kbd.textContent = hint;
          kbdRow.appendChild(kbd);
        }
        top.appendChild(kbdRow);
      }
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
        var _a, _b;
        this.deps.setFilters({
          type: typeSelect.value,
          tag: (_a = tagSelect == null ? void 0 : tagSelect.value) != null ? _a : "",
          category: (_b = categorySelect == null ? void 0 : categorySelect.value) != null ? _b : ""
        });
        void this.refresh();
      });
      filters.appendChild(typeSelect);
      const tagSelect = document.createElement("select");
      tagSelect.className = "b3-select xlc-tag-select";
      tagSelect.setAttribute("aria-label", this.deps.t("tags"));
      if (savedFilters.tag) tagSelect.value = savedFilters.tag;
      void this.deps.getTags().then((tags) => {
        var _a;
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
        if (savedFilters.tag && tags.includes(savedFilters.tag)) {
          tagSelect.value = savedFilters.tag;
          void this.refresh();
        } else if (savedFilters.tag) {
          this.deps.setFilters({ type: typeSelect.value, tag: "", category: (_a = categorySelect == null ? void 0 : categorySelect.value) != null ? _a : "" });
          void this.refresh();
        }
      }).catch(() => void 0);
      tagSelect.addEventListener("change", () => {
        var _a;
        this.deps.setFilters({
          type: typeSelect.value,
          tag: tagSelect.value,
          category: (_a = categorySelect == null ? void 0 : categorySelect.value) != null ? _a : ""
        });
        void this.refresh();
      });
      filters.appendChild(tagSelect);
      const categorySelect = document.createElement("select");
      categorySelect.className = "b3-select xlc-category-select";
      categorySelect.setAttribute("aria-label", this.deps.t("category"));
      if (savedFilters.category) categorySelect.value = savedFilters.category;
      void this.deps.getCategories().then((categories) => {
        var _a;
        const first = document.createElement("option");
        first.value = "";
        first.textContent = this.deps.t("category");
        categorySelect.appendChild(first);
        if (categories.length === 0) return;
        for (const category of categories) {
          const opt = document.createElement("option");
          opt.value = category;
          opt.textContent = category;
          categorySelect.appendChild(opt);
        }
        if (savedFilters.category && categories.includes(savedFilters.category)) {
          categorySelect.value = savedFilters.category;
          void this.refresh();
        } else if (savedFilters.category) {
          this.deps.setFilters({ type: typeSelect.value, tag: (_a = tagSelect == null ? void 0 : tagSelect.value) != null ? _a : "", category: "" });
          void this.refresh();
        }
      }).catch(() => void 0);
      categorySelect.addEventListener("change", () => {
        this.deps.setFilters({ type: typeSelect.value, tag: tagSelect.value, category: categorySelect.value });
        void this.refresh();
      });
      filters.appendChild(categorySelect);
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
      filters.insertBefore(aiBanner, filters.firstChild);
      const sortChip = document.createElement("button");
      sortChip.className = "xlc-chip xlc-sort-chip";
      const paintSort = () => {
        const sort = this.deps.getSort();
        sortChip.textContent = "\u21C5 " + this.deps.t(`sort.${sort}`);
        sortChip.classList.toggle("xlc-chip--on", sort !== "manual");
      };
      paintSort();
      sortChip.addEventListener("click", () => {
        if (Date.now() - this.sortMenuClosedAt < 300) return;
        this.showSortMenu(paintSort);
      });
      filters.appendChild(sortChip);
      if (this.insertTarget) {
        const targetBanner = document.createElement("span");
        targetBanner.className = "xlc-chip xlc-target-banner";
        targetBanner.textContent = "\u2913 " + this.deps.t("insertTargetBanner", this.insertTarget.hPath || this.insertTarget.docId);
        filters.insertBefore(targetBanner, filters.firstChild);
      }
      root.appendChild(filters);
      const status = document.createElement("div");
      status.className = "xlc-status";
      status.setAttribute("aria-live", "polite");
      root.appendChild(status);
      const bodyWrap = document.createElement("div");
      bodyWrap.className = "xlc-body";
      const list = document.createElement("div");
      list.className = "xlc-list";
      list.id = "xlc-search-results";
      list.tabIndex = 0;
      list.setAttribute("role", "listbox");
      list.setAttribute("aria-label", this.deps.t("pluginName"));
      input.setAttribute("aria-controls", list.id);
      list.addEventListener("keydown", (e) => void this.onKeydown(e));
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
          this.activeProvider = -1;
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
        const paneMeta = document.createElement("div");
        paneMeta.className = "xlc-pane-meta";
        paneMeta.style.display = "none";
        pane.appendChild(paneMeta);
        const paneVars = document.createElement("div");
        paneVars.className = "xlc-pane-vars";
        paneVars.style.display = "none";
        pane.appendChild(paneVars);
        const warn = document.createElement("div");
        warn.className = "xlc-pane-warn";
        warn.style.display = "none";
        pane.appendChild(warn);
        const paneBody = document.createElement("div");
        paneBody.className = "xlc-pane-body xlc-pane-body--muted";
        paneBody.textContent = this.deps.t("previewUnavailable");
        pane.appendChild(paneBody);
        pane.appendChild(this.buildPaneFoot());
        bodyWrap.appendChild(pane);
      }
      root.appendChild(bodyWrap);
      const footer = document.createElement("div");
      footer.className = "xlc-footer";
      const count = document.createElement("span");
      count.className = "xlc-footer-count";
      if (isMobile) {
        const footBtns = document.createElement("div");
        footBtns.className = "xlc-mobile-foot";
        const newBtn = document.createElement("button");
        newBtn.className = "b3-button";
        newBtn.textContent = this.deps.t("quickNew");
        newBtn.addEventListener("click", () => this.deps.newItem());
        footBtns.appendChild(newBtn);
        const insertBtn = document.createElement("button");
        insertBtn.className = "b3-button xlc-btn-primary";
        insertBtn.textContent = this.deps.t("quickInsertSelected");
        insertBtn.addEventListener("click", () => {
          const entry = this.results[this.activeIndex];
          if (entry) void this.runPrimary(entry);
        });
        footBtns.appendChild(insertBtn);
        footer.appendChild(footBtns);
        count.textContent = this.deps.t("usageHintMobile");
      } else {
        count.textContent = "";
      }
      footer.appendChild(count);
      if (!isMobile) {
        const claim = document.createElement("span");
        claim.className = "xlc-footer-claim";
        claim.textContent = this.deps.t("dataTruth");
        footer.appendChild(claim);
      }
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
      const usage = document.createElement("span");
      usage.className = "xlc-badge xlc-badge--ai xlc-pane-usage";
      usage.style.display = "none";
      head.appendChild(usage);
      return head;
    }
    buildPaneFoot() {
      const foot = document.createElement("div");
      foot.className = "xlc-pane-foot";
      const insert = document.createElement("button");
      insert.className = "b3-button xlc-btn-primary";
      insert.textContent = this.deps.t("insert");
      insert.dataset.xlcPaneAct = "insert";
      insert.addEventListener("click", () => {
        var _a;
        if (this.activeProvider >= 0) {
          const row = this.providerRows[this.activeProvider];
          if (row) void this.deps.insertProviderPayload(row.payload, (_a = this.insertTarget) != null ? _a : void 0);
          return;
        }
        const entry = this.results[this.activeIndex];
        if (entry) void this.runPrimary(entry);
      });
      const copy = document.createElement("button");
      copy.className = "b3-button";
      copy.textContent = this.deps.t("copy");
      copy.dataset.xlcPaneAct = "copy";
      copy.addEventListener("click", () => {
        if (this.activeProvider >= 0) {
          const row = this.providerRows[this.activeProvider];
          if (row) void this.deps.copyProviderPayload(row.payload);
          return;
        }
        const entry = this.results[this.activeIndex];
        if (entry) void this.deps.runAction(entry.id, "copy");
      });
      const aiBtn = document.createElement("button");
      aiBtn.className = "b3-button xlc-btn-ai";
      aiBtn.textContent = "\u2726 " + this.deps.t("aiTransform");
      aiBtn.dataset.xlcPaneAct = "ai";
      aiBtn.addEventListener("click", () => {
        const entry = this.results[this.activeIndex];
        if (entry) void this.showActionMenu(entry);
      });
      const spacer = document.createElement("span");
      spacer.className = "xlc-foot-spacer";
      const source = document.createElement("button");
      source.className = "b3-button b3-button--text xlc-btn-ghost";
      source.textContent = this.deps.t("openSource");
      source.dataset.xlcPaneAct = "source";
      source.addEventListener("click", () => {
        const entry = this.results[this.activeIndex];
        if (entry) void this.deps.openSource(entry.id);
      });
      const edit = document.createElement("button");
      edit.className = "b3-button b3-button--text xlc-btn-ghost";
      edit.textContent = this.deps.t("edit");
      edit.dataset.xlcPaneAct = "edit";
      edit.addEventListener("click", () => {
        const entry = this.results[this.activeIndex];
        if (entry) void this.deps.editItem(entry.id);
      });
      foot.appendChild(insert);
      foot.appendChild(aiBtn);
      foot.appendChild(copy);
      foot.appendChild(spacer);
      foot.appendChild(source);
      foot.appendChild(edit);
      return foot;
    }
    attachLongPress(list, isMobile) {
      let pressTimer;
      let startY = 0;
      let startX = 0;
      const cancel = () => {
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = void 0;
      };
      this.longPressCancel = cancel;
      list.addEventListener("contextmenu", cancel);
      list.addEventListener("touchstart", (e) => {
        var _a, _b, _c, _d;
        startY = (_b = (_a = e.touches[0]) == null ? void 0 : _a.clientY) != null ? _b : 0;
        startX = (_d = (_c = e.touches[0]) == null ? void 0 : _c.clientX) != null ? _d : 0;
        const row = e.target.closest("[data-xlc-index]");
        if (!row) return;
        const entry = this.results[Number(row.dataset.xlcIndex)];
        if (!entry) return;
        cancel();
        pressTimer = setTimeout(() => void this.showActionMenu(entry), 550);
      }, { passive: true });
      list.addEventListener("touchmove", (e) => {
        var _a, _b, _c, _d;
        const dy = Math.abs(((_b = (_a = e.touches[0]) == null ? void 0 : _a.clientY) != null ? _b : 0) - startY);
        const dx = Math.abs(((_d = (_c = e.touches[0]) == null ? void 0 : _c.clientX) != null ? _d : 0) - startX);
        if (Math.max(dx, dy) > 10) cancel();
      }, { passive: true });
      list.addEventListener("touchend", cancel, { passive: true });
      list.addEventListener("touchcancel", cancel, { passive: true });
      list.addEventListener("pointercancel", cancel, { passive: true });
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
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      const el = (_a = this.dialog) == null ? void 0 : _a.element;
      const text = (_c = (_b = el == null ? void 0 : el.querySelector(".xlc-search-input")) == null ? void 0 : _b.value) != null ? _c : "";
      const itemType = (_e = (_d = el == null ? void 0 : el.querySelector(".xlc-type-select")) == null ? void 0 : _d.value) != null ? _e : "";
      const tag = (_g = (_f = el == null ? void 0 : el.querySelector(".xlc-tag-select")) == null ? void 0 : _f.value) != null ? _g : "";
      const category = (_i = (_h = el == null ? void 0 : el.querySelector(".xlc-category-select")) == null ? void 0 : _h.value) != null ? _i : "";
      return { text, itemType, tag, category, scope: this.currentScope };
    }
    async refresh() {
      var _a, _b, _c, _d, _e, _f;
      const seq = ++this.searchSeq;
      const query = this.buildQuery();
      this.lastQueryText = query.text.trim();
      this.usageCounts = new Map(Object.entries(this.deps.getUsage()).map(([id, u]) => [id, u.count]));
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      const status = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-status");
      const footer = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-footer");
      const aiBanner = (_d = this.dialog) == null ? void 0 : _d.element.querySelector(".xlc-ai-banner");
      if (!list) return;
      this.lastPreviewId = null;
      list.classList.add("xlc-list--loading");
      list.setAttribute("aria-busy", "true");
      let total = 0;
      let truncated = false;
      let loading = false;
      let loadError;
      let directError = "";
      try {
        const text = query.text.trim();
        if (text.startsWith("?") && text.length > 1) {
          const aiResult = await this.deps.aiSemantic(text.slice(1), { itemType: (_e = query.itemType) != null ? _e : "", tag: (_f = query.tag) != null ? _f : "", scope: this.currentScope });
          if (seq !== this.searchSeq) return;
          if (aiResult.ok) {
            this.results = aiResult.entries;
            this.aiResults = true;
            total = aiResult.entries.length;
          } else {
            this.results = [];
            this.aiResults = false;
            directError = aiResult.message;
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
        this.providerRows = [];
        this.activeIndex = 0;
        this.activeProvider = -1;
        this.aiResults = false;
        this.emptyMessage = "";
        if (aiBanner) aiBanner.style.display = "none";
        if (status) {
          status.textContent = this.deps.t("kernelError", err.message);
          status.classList.add("xlc-status--error");
        }
        if (footer) {
          const count = footer.querySelector(".xlc-footer-count");
          if (count && !this.deps.isMobile()) count.textContent = "";
        }
        this.finishSearchLoad(list);
        this.renderList(list);
        return;
      }
      if (seq !== this.searchSeq) return;
      this.activeIndex = 0;
      this.activeProvider = -1;
      if (status) {
        this.emptyMessage = "";
        const isError = Boolean(directError || loadError);
        status.classList.toggle("xlc-status--error", isError);
        if (directError) {
          status.textContent = directError;
        } else if (this.results.length) {
          status.textContent = "";
        } else if (loadError) {
          status.textContent = this.deps.t("kernelError", loadError);
        } else if (loading) {
          status.textContent = this.deps.t("indexing");
        } else {
          status.textContent = "";
          if (!query.text.trim() && this.currentScope === "favorites") {
            this.emptyMessage = this.deps.t("emptyFavorites");
          } else if (!query.text.trim() && this.currentScope === "recent") {
            this.emptyMessage = this.deps.t("emptyRecent");
          } else if (query.text.trim() && !query.text.trim().startsWith("?") && this.deps.aiEnabled()) {
            this.emptyMessage = this.deps.t("semanticSuggestion");
          } else if (total === 0 && !query.text.trim()) {
            this.emptyMessage = this.deps.t("emptyLibrary");
          } else {
            this.emptyMessage = this.deps.t("empty");
          }
        }
      }
      if (footer) {
        const count = footer.querySelector(".xlc-footer-count");
        if (count && !this.deps.isMobile()) {
          const sortSuffix = this.deps.getSort() === "frequent" ? ` \xB7 ${this.deps.t("sort.frequent")}` : "";
          count.textContent = this.deps.t("totalItems", String(total)) + sortSuffix + (truncated ? " \u26A0" : "");
          count.title = truncated ? this.deps.t("truncatedHint") : "";
        }
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
      this.finishSearchLoad(list);
      this.renderList(list);
      this.updatePreview();
    }
    /** 收尾一次搜索刷新：解除列表加载反馈（成功与失败路径共用）。 */
    finishSearchLoad(list) {
      list.classList.remove("xlc-list--loading");
      list.removeAttribute("aria-busy");
    }
    /** 菜单关闭后把焦点还给搜索框（键盘连续性；弹窗已销毁则静默忽略）。 */
    restoreFocusToSearch() {
      var _a, _b;
      (_b = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-search-input")) == null ? void 0 : _b.focus();
    }
    /** 命中高亮：按字面子串（大小写不敏感）切分并注入 mark span；文本一律 textContent，绝不 innerHTML。 */
    appendHighlighted(parent, text, query) {
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      let cursor = 0;
      while (cursor <= text.length - lowerQuery.length) {
        const at = lowerText.indexOf(lowerQuery, cursor);
        if (at < 0) break;
        if (at > cursor) parent.appendChild(document.createTextNode(text.slice(cursor, at)));
        const mark = document.createElement("mark");
        mark.className = "xlc-hit";
        mark.textContent = text.slice(at, at + query.length);
        parent.appendChild(mark);
        cursor = at + query.length;
      }
      if (cursor < text.length) parent.appendChild(document.createTextNode(text.slice(cursor)));
    }
    renderList(list) {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      list.innerHTML = "";
      if (this.results.length === 0 && this.providerRows.length === 0 && this.emptyMessage) {
        const empty = document.createElement("div");
        empty.className = "xlc-empty";
        const icon = document.createElement("div");
        icon.className = "xlc-empty-icon";
        icon.textContent = "\u2726";
        empty.appendChild(icon);
        const text = document.createElement("div");
        text.className = "xlc-empty-text";
        text.textContent = this.emptyMessage;
        empty.appendChild(text);
        if (this.emptyMessage === this.deps.t("semanticSuggestion")) {
          const hint = document.createElement("div");
          hint.className = "xlc-empty-hint";
          hint.textContent = this.deps.t("aiSemanticHint");
          empty.appendChild(hint);
        } else if (this.emptyMessage === this.deps.t("emptyFavorites")) {
          const hint = document.createElement("div");
          hint.className = "xlc-empty-hint";
          hint.textContent = this.deps.t("emptyFavoritesSub");
          empty.appendChild(hint);
        } else if (this.emptyMessage === this.deps.t("emptyLibrary")) {
          const hint = document.createElement("div");
          hint.className = "xlc-empty-hint";
          hint.textContent = this.deps.t("emptyLibrarySub");
          empty.appendChild(hint);
          const create = document.createElement("button");
          create.type = "button";
          create.className = "b3-button xlc-btn-primary xlc-empty-action";
          create.textContent = "\uFF0B " + this.deps.t("newItem");
          create.addEventListener("click", () => this.deps.newItem());
          empty.appendChild(create);
        }
        list.appendChild(empty);
      }
      const grouping = this.currentScope === "all" && this.deps.getSort() !== "title";
      const groupLabels = [];
      if (grouping && this.results.length > 0) {
        const isManual = this.deps.getSort() === "manual";
        const favs = [];
        const rest = [];
        for (const e of this.results) {
          if (isManual && e && this.deps.isFavorite(e.id)) favs.push(e);
          else rest.push(e);
        }
        const byCat = /* @__PURE__ */ new Map();
        const uncategorized = [];
        for (const e of rest) {
          const cat = (_a = e == null ? void 0 : e.category) != null ? _a : "";
          if (!cat) {
            uncategorized.push(e);
            continue;
          }
          const bucket = (_b = byCat.get(cat)) != null ? _b : [];
          bucket.push(e);
          byCat.set(cat, bucket);
        }
        const catKeys = Array.from(byCat.keys()).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
        const ordered = [];
        if (isManual && favs.length > 0) {
          groupLabels.push({ label: "\u{1F4CC} " + this.deps.t("groupPinned"), count: favs.length });
          ordered.push(...favs);
        }
        for (const key of catKeys) {
          const bucket = (_c = byCat.get(key)) != null ? _c : [];
          groupLabels.push({ label: key, count: bucket.length });
          ordered.push(...bucket);
        }
        if (uncategorized.length > 0) {
          groupLabels.push({ label: this.deps.t("groupUncategorized"), count: uncategorized.length });
          ordered.push(...uncategorized);
        }
        if (groupLabels.length > 1) {
          this.results = ordered;
        } else {
          groupLabels.length = 0;
        }
      }
      let headCursor = -1;
      const headStarts = [];
      let groupAcc = 0;
      for (const g of groupLabels) {
        headStarts.push(groupAcc);
        groupAcc += g.count;
      }
      const placeGroupHead = (label, count) => {
        const head = document.createElement("div");
        head.className = "xlc-group-head";
        head.dataset.xlcHead = "1";
        head.setAttribute("aria-hidden", "true");
        head.textContent = `${label} \xB7 ${count}`;
        list.appendChild(head);
      };
      for (let i = 0; i < this.results.length; i++) {
        while (headCursor + 1 < groupLabels.length && i === headStarts[headCursor + 1]) {
          headCursor++;
          const head = groupLabels[headCursor];
          if (head) placeGroupHead(head.label, head.count);
        }
        const entry = this.results[i];
        if (!entry) continue;
        const fav = this.deps.isFavorite(entry.id);
        const row = document.createElement("div");
        row.className = "xlc-row" + (i === this.activeIndex ? " xlc-row--active" : "") + (fav ? " xlc-row--fav" : "");
        row.dataset.xlcIndex = String(i);
        row.id = `xlc-result-${i}`;
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
        badge.textContent = (_d = TYPE_BADGES2[entry.itemType]) != null ? _d : "TXT";
        title.appendChild(badge);
        const titleText = document.createElement("span");
        titleText.className = "xlc-row-titletext";
        const highlight = this.lastQueryText.length > 0 && !this.lastQueryText.startsWith("?") && !this.aiResults;
        if (highlight) {
          this.appendHighlighted(titleText, entry.title || this.deps.t("unknownType"), this.lastQueryText);
        } else {
          titleText.textContent = entry.title || this.deps.t("unknownType");
        }
        title.appendChild(titleText);
        if (((_e = entry.varCount) != null ? _e : 0) > 0) {
          const varBadge = document.createElement("span");
          varBadge.className = "xlc-badge xlc-badge--var";
          varBadge.textContent = this.deps.t("varCountBadge", String(entry.varCount));
          title.appendChild(varBadge);
        }
        main.appendChild(title);
        const meta = document.createElement("div");
        meta.className = "xlc-row-meta";
        const useCount = (_f = this.usageCounts.get(entry.id)) != null ? _f : 0;
        const joined = [entry.tags.join(" / "), entry.summary].filter(Boolean).join(" \xB7 ");
        const metaBase = joined.length > 140 ? joined.slice(0, 140) + "\u2026" : joined;
        meta.textContent = metaBase + (useCount > 0 ? ` \xB7 ${this.deps.t("useCount", String(useCount))}` : "");
        main.appendChild(meta);
        row.appendChild(main);
        if (this.deps.isSourceMissing(entry)) {
          const warn = document.createElement("span");
          warn.className = "xlc-row-warn";
          warn.textContent = "\u26A0";
          warn.title = this.deps.t("sourceMissing") + " \xB7 " + this.deps.t("sourceGone");
          warn.setAttribute("aria-label", this.deps.t("sourceMissing"));
          title.appendChild(warn);
        }
        const star = document.createElement("button");
        star.className = "b3-button b3-button--small xlc-row-action";
        star.textContent = fav ? "\u2605" : "\u2606";
        star.setAttribute("aria-label", fav ? this.deps.t("unfavorite") : this.deps.t("favorite"));
        star.addEventListener("click", (e) => {
          e.stopPropagation();
          this.deps.toggleFavorite(entry.id);
          star.textContent = this.deps.isFavorite(entry.id) ? "\u2605" : "\u2606";
          void this.refreshPreservingPosition().then(() => this.restoreFocusToSearch());
        });
        row.appendChild(star);
        list.appendChild(row);
      }
      if (this.providerRows.length > 0) {
        const header = document.createElement("div");
        header.className = "xlc-provider-header";
        header.dataset.xlcHead = "1";
        header.setAttribute("aria-hidden", "true");
        header.textContent = "\u2726 " + this.deps.t("providerSection") + " \xB7 " + this.providerRows.length;
        list.appendChild(header);
        for (const row of this.providerRows) {
          const el = document.createElement("div");
          el.className = "xlc-row xlc-row--provider";
          el.dataset.xlcVirtualId = row.virtualId;
          el.id = `xlc-provider-${this.providerRows.indexOf(row)}`;
          el.setAttribute("role", "option");
          el.setAttribute("aria-selected", "false");
          const main = document.createElement("div");
          main.className = "xlc-row-main";
          const title = document.createElement("div");
          title.className = "xlc-row-title";
          const badge = document.createElement("span");
          badge.className = "xlc-badge xlc-badge--ai";
          badge.textContent = row.providerName.length > 12 ? row.providerName.slice(0, 12) + "\u2026" : row.providerName;
          badge.title = row.providerName;
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
      const actionable = this.results.length > 0;
      const scope = (_h = (_g = this.dialog) == null ? void 0 : _g.element) != null ? _h : document;
      scope.querySelectorAll(".xlc-pane-foot .b3-button").forEach((btn) => {
        var _a2;
        if (this.activeProvider >= 0) {
          const act = (_a2 = btn.dataset.xlcPaneAct) != null ? _a2 : "";
          btn.disabled = !(act === "insert" || act === "copy");
        } else {
          btn.disabled = !actionable;
        }
      });
      const mobileInsert = scope.querySelector(".xlc-mobile-foot .xlc-btn-primary");
      if (mobileInsert) mobileInsert.disabled = !actionable;
    }
    async showProviderMenu(row, anchor) {
      var _a, _b, _c, _d, _e, _f;
      (_a = this.menuDismiss) == null ? void 0 : _a.call(this);
      this.menuDismiss = null;
      const menu = document.createElement("div");
      menu.className = "xlc-menu";
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", row.providerName + " \xB7 " + this.deps.t("providerSection"));
      const lbl = document.createElement("div");
      lbl.className = "xlc-menu-lbl";
      lbl.textContent = row.providerName + " \xB7 " + this.deps.t("providerSection");
      menu.appendChild(lbl);
      const sec = document.createElement("div");
      sec.className = "xlc-menu-sec";
      sec.appendChild(this.menuButton("\uFF0B", this.deps.t("providerInsert"), "xlc-menu-item", async () => {
        var _a2;
        this.destroy();
        await this.deps.insertProviderPayload(row.payload, (_a2 = this.insertTarget) != null ? _a2 : void 0);
      }));
      sec.appendChild(this.menuButton("\u29C9", this.deps.t("providerCopy"), "xlc-menu-item", async () => {
        this.destroy();
        await this.deps.copyProviderPayload(row.payload);
      }));
      menu.appendChild(sec);
      const host = (_e = (_d = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-dialog")) != null ? _d : (_c = this.dialog) == null ? void 0 : _c.element) != null ? _e : anchor;
      host.appendChild(menu);
      const dismiss = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          if (this.menuDismiss === dismissMenu) this.menuDismiss = null;
          document.removeEventListener("pointerdown", dismiss, true);
          this.restoreFocusToSearch();
        }
      };
      const dismissMenu = () => {
        menu.remove();
        document.removeEventListener("pointerdown", dismiss, true);
      };
      this.menuDismiss = dismissMenu;
      document.addEventListener("pointerdown", dismiss, true);
      menu.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          menu.remove();
          if (this.menuDismiss === dismissMenu) this.menuDismiss = null;
          document.removeEventListener("pointerdown", dismiss, true);
          this.restoreFocusToSearch();
        }
      });
      (_f = menu.querySelector(".xlc-menu-item")) == null ? void 0 : _f.focus();
    }
    /** 外部变更（动作菜单内删除/建副本等）后的列表同步入口（R138）。 */
    refreshAfterExternalChange() {
      void this.refreshPreservingPosition();
    }
    async refreshPreservingPosition() {
      var _a, _b, _c;
      const seq = ++this.searchSeq;
      const query = this.buildQuery();
      this.lastQueryText = query.text.trim();
      try {
        const { entries } = await this.deps.search(query);
        if (seq !== this.searchSeq) return;
        this.results = entries;
      } catch (err) {
        const status = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-status");
        if (status) {
          status.textContent = this.deps.t("kernelError", (_b = err == null ? void 0 : err.message) != null ? _b : "unknown");
          status.classList.add("xlc-status--error");
        }
        return;
      }
      const list = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-list");
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
      var _a, _b;
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      if (!list) return;
      const rows = Array.from(list.children).filter((el) => !el.dataset.xlcHead);
      rows.forEach((child, i) => {
        const isReal = i < this.results.length;
        const active3 = isReal ? this.activeProvider < 0 && i === this.activeIndex : this.activeProvider >= 0 && i - this.results.length === this.activeProvider;
        child.classList.toggle("xlc-row--active", active3);
        child.setAttribute("aria-selected", active3 ? "true" : "false");
      });
      const active2 = rows[this.navPosition()];
      const input = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-search-input");
      if (active2 == null ? void 0 : active2.id) input == null ? void 0 : input.setAttribute("aria-activedescendant", active2.id);
      else input == null ? void 0 : input.removeAttribute("aria-activedescendant");
      active2 == null ? void 0 : active2.scrollIntoView({ block: "nearest" });
    }
    schedulePreview(entry) {
      this.updatePreview(entry.id);
    }
    /** 变量提示行：从预览文本解析 ask 字段与光标标记并列出语法 chip（code/提供方行不展示）。 */
    paintPaneVars(text, itemType) {
      var _a;
      const paneVars = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-pane-vars");
      if (!paneVars) return;
      const hasCursor = Boolean(text && hasCursorToken(text));
      const fields = itemType && itemType !== "code" && itemType !== "provider" && text ? listAskFields(text) : [];
      paneVars.textContent = "";
      if (fields.length === 0 && !hasCursor) {
        paneVars.style.display = "none";
        return;
      }
      if (fields.length > 0) {
        const label = document.createElement("span");
        label.textContent = this.deps.t("paneVarsLabel", String(fields.length));
        paneVars.appendChild(label);
      }
      for (const field of fields) {
        const chip = document.createElement("code");
        chip.textContent = askFieldTag(field);
        paneVars.appendChild(chip);
      }
      if (hasCursor) {
        const sep = document.createElement("span");
        sep.textContent = (fields.length > 0 ? "\xB7 " : "") + this.deps.t("cursorHint");
        paneVars.appendChild(sep);
        const chip = document.createElement("code");
        chip.textContent = "{{xlc:cursor}}";
        paneVars.appendChild(chip);
      }
      paneVars.style.display = "flex";
    }
    /** 排序直选菜单（R108）：4 档可枚举、当前档 ✓，替代不可见的循环切换。 */
    showSortMenu(paintSort) {
      var _a, _b, _c, _d, _e, _f;
      (_a = this.menuDismiss) == null ? void 0 : _a.call(this);
      this.menuDismiss = null;
      const modes = ["manual", "recent", "frequent", "title"];
      const current = this.deps.getSort();
      const menu = document.createElement("div");
      menu.className = "xlc-menu xlc-menu--compact";
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", this.deps.t("sort"));
      const lbl = document.createElement("div");
      lbl.className = "xlc-menu-lbl";
      lbl.textContent = this.deps.t("sort");
      menu.appendChild(lbl);
      const sec = document.createElement("div");
      sec.className = "xlc-menu-sec";
      for (const mode of modes) {
        sec.appendChild(this.menuButton(mode === current ? "\u2713" : " ", this.deps.t(`sort.${mode}`), "xlc-menu-item" + (mode === current ? " xlc-menu-item--on" : ""), async () => {
          var _a2;
          this.sortMenuClosedAt = Date.now();
          (_a2 = this.menuDismiss) == null ? void 0 : _a2.call(this);
          this.menuDismiss = null;
          this.deps.setSort(mode);
          paintSort();
          this.restoreFocusToSearch();
          void this.refresh();
        }));
      }
      menu.appendChild(sec);
      const host = (_e = (_d = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-dialog")) != null ? _d : (_c = this.dialog) == null ? void 0 : _c.element) != null ? _e : document.body;
      host.appendChild(menu);
      const dismiss = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          this.sortMenuClosedAt = Date.now();
          if (this.menuDismiss === dismissMenu) this.menuDismiss = null;
          document.removeEventListener("pointerdown", dismiss, true);
          this.restoreFocusToSearch();
        }
      };
      const dismissMenu = () => {
        menu.remove();
        document.removeEventListener("pointerdown", dismiss, true);
      };
      this.menuDismiss = dismissMenu;
      document.addEventListener("pointerdown", dismiss, true);
      menu.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          menu.remove();
          this.sortMenuClosedAt = Date.now();
          if (this.menuDismiss === dismissMenu) this.menuDismiss = null;
          document.removeEventListener("pointerdown", dismiss, true);
          this.restoreFocusToSearch();
        }
      });
      (_f = menu.querySelector(".xlc-menu-item")) == null ? void 0 : _f.focus();
    }
    /** 预览窗格元数据行（R108，Raycast Detail.Metadata 惯例）：类型徽标 + 分类/标签可点筛选 + 更新日期。 */
    paintPaneMeta(entry) {
      var _a, _b;
      const meta = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-pane-meta");
      if (!meta) return;
      meta.textContent = "";
      if (!entry) {
        meta.style.display = "none";
        return;
      }
      const typeBadge = document.createElement("span");
      typeBadge.className = `xlc-badge xlc-badge--${entry.itemType}`;
      typeBadge.textContent = (_b = TYPE_BADGES2[entry.itemType]) != null ? _b : "TXT";
      meta.appendChild(typeBadge);
      const setFilter = (patch) => {
        var _a2, _b2, _c, _d;
        const current = this.deps.getFilters();
        const next = {
          type: current.type,
          tag: (_a2 = patch.tag) != null ? _a2 : current.tag,
          category: (_b2 = patch.category) != null ? _b2 : current.category
        };
        this.deps.setFilters(next);
        const tagSelect = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-tag-select");
        const categorySelect = (_d = this.dialog) == null ? void 0 : _d.element.querySelector(".xlc-category-select");
        if (tagSelect) tagSelect.value = next.tag;
        if (categorySelect) categorySelect.value = next.category;
        void this.refresh();
      };
      const toggleChip = (value, active2) => active2 === value ? "" : value;
      const currentFilters = this.deps.getFilters();
      if (entry.category) {
        const cat = document.createElement("button");
        cat.type = "button";
        cat.className = "xlc-meta-chip" + (currentFilters.category === entry.category ? " xlc-meta-chip--on" : "");
        cat.textContent = entry.category;
        cat.title = this.deps.t("category");
        cat.setAttribute("aria-pressed", String(currentFilters.category === entry.category));
        cat.addEventListener("click", () => setFilter({ category: toggleChip(entry.category, this.deps.getFilters().category) }));
        meta.appendChild(cat);
      }
      const cleanTags = entry.tags.filter(Boolean);
      const shownTags = cleanTags.slice(0, 3);
      for (const tag of shownTags) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "xlc-meta-chip" + (currentFilters.tag === tag ? " xlc-meta-chip--on" : "");
        chip.textContent = tag;
        chip.title = this.deps.t("tags");
        chip.setAttribute("aria-pressed", String(currentFilters.tag === tag));
        chip.addEventListener("click", () => setFilter({ tag: toggleChip(tag, this.deps.getFilters().tag) }));
        meta.appendChild(chip);
      }
      if (cleanTags.length > shownTags.length) {
        const more = document.createElement("span");
        more.className = "xlc-meta-chip xlc-meta-chip--static";
        more.textContent = `+${cleanTags.length - shownTags.length}`;
        meta.appendChild(more);
      }
      if (Number.isFinite(entry.updatedAt) && entry.updatedAt > 9466848e5) {
        const date = document.createElement("span");
        date.className = "xlc-pane-meta-date";
        date.textContent = this.deps.t("updatedAtLabel", new Date(entry.updatedAt).toLocaleDateString());
        meta.appendChild(date);
      }
      meta.style.display = "flex";
    }
    updatePreview(forceId) {
      var _a, _b, _c, _d, _e, _f, _g;
      const paneBody = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-pane-body");
      const paneTitle = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-pane-title");
      const paneWarn = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-pane-warn");
      const paneAi = (_d = this.dialog) == null ? void 0 : _d.element.querySelector(".xlc-pane-ai");
      const paneUsage = (_e = this.dialog) == null ? void 0 : _e.element.querySelector(".xlc-pane-usage");
      if (!paneBody || !paneTitle || !paneWarn || !paneAi || !paneUsage) return;
      const paintUsageBadge = (entry2) => {
        var _a2;
        const count = entry2 ? (_a2 = this.usageCounts.get(entry2.id)) != null ? _a2 : 0 : 0;
        if (this.aiResults || count <= 0) {
          paneUsage.style.display = "none";
          return;
        }
        paneUsage.textContent = `\u2726 ${this.deps.t("sort.frequent")} \xB7 ${this.deps.t("useCount", String(count))}`;
        paneUsage.style.display = "inline-block";
      };
      if (this.activeProvider >= 0) {
        const row = this.providerRows[this.activeProvider];
        if (!row) return;
        this.lastPreviewId = row.virtualId;
        paneTitle.textContent = row.title || row.providerName;
        paneAi.style.display = "none";
        paneUsage.style.display = "none";
        paneWarn.style.display = "none";
        this.paintPaneMeta(void 0);
        paneBody.classList.remove("xlc-pane-body--muted", "xlc-pane-body--code");
        this.paintPaneVars(null, "provider");
        paneBody.textContent = row.payload;
        return;
      }
      const entry = this.results[this.activeIndex];
      const id = (_f = forceId != null ? forceId : entry == null ? void 0 : entry.id) != null ? _f : null;
      this.paintPaneMeta(entry);
      if (!id || id === this.lastPreviewId) return;
      const seq = ++this.previewSeq;
      this.lastPreviewId = id;
      if (paneTitle) paneTitle.textContent = (_g = entry == null ? void 0 : entry.title) != null ? _g : "";
      if (paneAi) paneAi.style.display = this.aiResults ? "" : "none";
      paintUsageBadge(entry);
      if (paneWarn) {
        const missing = Boolean(entry && this.deps.isSourceMissing(entry));
        paneWarn.style.display = missing ? "" : "none";
        if (missing) paneWarn.textContent = "\u26A0 " + this.deps.t("sourceGone");
      }
      this.paintPaneVars(null, entry == null ? void 0 : entry.itemType);
      paneBody.classList.add("xlc-pane-body--muted");
      paneBody.textContent = this.deps.t("loading");
      void this.deps.preview(id).then((text) => {
        if (seq !== this.previewSeq) return;
        const finalText = text || this.deps.t("previewUnavailable");
        paneBody.classList.toggle("xlc-pane-body--muted", finalText === this.deps.t("previewUnavailable"));
        paneBody.textContent = finalText;
        paneBody.scrollTop = 0;
        paneBody.classList.toggle("xlc-pane-body--code", (entry == null ? void 0 : entry.itemType) === "code");
        this.paintPaneVars(text, entry == null ? void 0 : entry.itemType);
      }).catch(() => {
        if (seq !== this.previewSeq) return;
        paneBody.classList.add("xlc-pane-body--muted");
        paneBody.textContent = this.deps.t("kernelError", "preview");
        paneBody.classList.remove("xlc-pane-body--code");
        this.paintPaneVars(null, entry == null ? void 0 : entry.itemType);
      });
    }
    async runPrimary(entry) {
      if (this.primaryBusy || this.varFormOpen) return;
      this.primaryBusy = true;
      try {
        await this.insertEntryWithVars(entry, (fills) => this.runActionFor(entry, fills));
      } finally {
        this.primaryBusy = false;
      }
    }
    runActionFor(entry, fills) {
      if (this.deps.insertTarget) {
        const target = this.deps.insertTarget;
        return this.deps.insertToDoc(entry.id, target.docId, target.hPath, fills);
      }
      const mode = entry.itemType === "blockref" ? "insert-ref" : "insert";
      return fills ? this.deps.runActionWithFills(entry.id, mode, fills) : this.deps.runAction(entry.id, mode);
    }
    /** F1：插入前询问变量（设置可关；无 ask 字段零打扰；code 条目不询问）。
     *  perform 收到 fills（undefined=未触发询问，走原路径）。 */
    async insertEntryWithVars(entry, perform) {
      var _a, _b;
      if (!this.deps.promptVariables()) {
        await perform();
        return;
      }
      let fields = [];
      let previewFailed = false;
      try {
        const content = await this.deps.preview(entry.id);
        fields = entry.itemType === "code" || !content ? [] : listAskFields(content);
      } catch {
        fields = [];
        previewFailed = true;
      }
      if (fields.length === 0) {
        if (previewFailed && ((_a = entry.varCount) != null ? _a : 0) > 0) {
          const status = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-status");
          if (status) {
            status.textContent = this.deps.t("varParseFailed");
            status.classList.add("xlc-status--error");
          }
        }
        await perform();
        return;
      }
      if (this.varFormOpen) return;
      this.varFormOpen = true;
      openVariableFillCard({
        t: this.deps.t,
        itemType: entry.itemType,
        title: entry.title,
        fields,
        onConfirm: (fills) => {
          this.varFormOpen = false;
          this.destroy();
          void perform(fills);
        },
        // 取消/关闭（Esc/scrim/取消钮）后焦点回搜索框，与浮层菜单一致（R128）
        onCancel: () => {
          this.varFormOpen = false;
          this.restoreFocusToSearch();
        }
      });
    }
    /** 菜单按钮统一构造：图标列 + 文本（createTextNode 注入，绝不 innerHTML） */
    menuButton(icon, label, cls, run) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = cls;
      btn.setAttribute("role", "menuitem");
      const ic = document.createElement("span");
      ic.className = "xlc-menu-ic";
      ic.textContent = icon;
      btn.appendChild(ic);
      btn.appendChild(document.createTextNode(label));
      btn.addEventListener("click", () => void run());
      return btn;
    }
    async showActionMenu(entry) {
      var _a, _b, _c, _d, _e, _f;
      (_a = this.menuDismiss) == null ? void 0 : _a.call(this);
      this.menuDismiss = null;
      const menu = document.createElement("div");
      menu.className = "xlc-menu";
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", entry.title || this.deps.t("unknownType"));
      const rebuild = (render) => {
        menu.innerHTML = "";
        render();
      };
      const buildDefault = () => {
        const lbl = document.createElement("div");
        lbl.className = "xlc-menu-lbl";
        lbl.textContent = (entry.title || this.deps.t("unknownType")) + " \xB7 " + this.deps.t("actionsNoun");
        menu.appendChild(lbl);
        const previewBox = document.createElement("pre");
        previewBox.className = "xlc-menu-preview xlc-menu-preview--muted";
        previewBox.textContent = this.deps.t("previewUnavailable");
        void this.deps.preview(entry.id).then((text) => {
          if (text) {
            previewBox.textContent = text.slice(0, 500);
            previewBox.classList.remove("xlc-menu-preview--muted");
          }
        }).catch(() => {
          previewBox.textContent = this.deps.t("kernelError", "preview");
        });
        const sec1 = document.createElement("div");
        sec1.className = "xlc-menu-sec";
        const addAction = (icon, label, run, cls = "xlc-menu-item") => {
          sec1.appendChild(this.menuButton(icon, label, cls, async () => {
            this.destroy();
            await run();
          }));
        };
        if (entry.itemType === "blockref") {
          addAction("\uFF0B", this.deps.t("insertRef"), () => this.deps.runAction(entry.id, "insert-ref"));
          addAction("\u229E", this.deps.t("insertEmbed"), () => this.deps.runAction(entry.id, "insert-embed"));
          addAction("\u29C9", this.deps.t("insertCopy"), () => this.deps.runAction(entry.id, "copy-content"));
        } else {
          addAction("\uFF0B", this.deps.t("insert"), () => this.insertEntryWithVars(entry, (fills) => fills ? this.deps.runActionWithFills(entry.id, "insert", fills) : this.deps.runAction(entry.id, "insert")));
          addAction("\u29C9", this.deps.t("copy"), () => this.deps.runAction(entry.id, "copy"));
        }
        menu.appendChild(sec1);
        if (this.deps.aiEnabled()) {
          const secAi = document.createElement("div");
          secAi.className = "xlc-menu-sec xlc-menu-sec--ai";
          const openTransform = (transformLabel, run) => {
            const gen = ++this.transformSeq;
            rebuild(() => buildTransformView(entry.title + " \xB7 " + transformLabel, transformLabel));
            void runTransformView(run, gen);
          };
          for (const kind of TRANSFORM_KINDS) {
            secAi.appendChild(this.menuButton("\u2726", this.deps.t(`tf.${kind}`), "xlc-menu-item xlc-menu-item--ai", () => {
              openTransform(this.deps.t(`tf.${kind}`), async () => this.deps.aiTransform(entry.id, kind));
            }));
          }
          for (const ct of this.deps.listCustomTransforms()) {
            secAi.appendChild(this.menuButton("\u2726", ct.name, "xlc-menu-item xlc-menu-item--ai", () => {
              openTransform(ct.name, async () => this.deps.aiTransformCustom(entry.id, ct.id));
            }));
          }
          menu.appendChild(secAi);
        }
        const sec2 = document.createElement("div");
        sec2.className = "xlc-menu-sec";
        const addSilent = (icon, label, run, cls = "xlc-menu-item") => {
          sec2.appendChild(this.menuButton(icon, label, cls, async () => {
            var _a2;
            (_a2 = this.menuDismiss) == null ? void 0 : _a2.call(this);
            this.menuDismiss = null;
            await run();
          }));
        };
        addSilent("\u2197", this.deps.t("openSource"), () => this.deps.openSource(entry.id));
        addSilent("\u270E", this.deps.t("edit"), () => this.deps.editItem(entry.id));
        addSilent("\u29C9", this.deps.t("duplicateItem"), () => this.deps.duplicateItem(entry.id));
        addSilent("\u{1F5D1}", this.deps.t("delete"), () => this.deps.deleteItem(entry.id), "xlc-menu-item xlc-menu-item--danger");
        const toDocBtn = this.menuButton("\u2913", this.deps.t("insertToDoc"), "xlc-menu-item", () => {
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
          input.setAttribute("aria-label", this.deps.t("insertToDocPick"));
          input.setAttribute("autocomplete", "off");
          input.addEventListener("keydown", (ev) => {
            ev.stopPropagation();
            if (ev.key === "Enter" && !ev.isComposing) {
              ev.preventDefault();
              const first = sec.querySelector(".xlc-pickdoc-hit");
              first == null ? void 0 : first.click();
            }
          });
          sec.appendChild(input);
          let seq = 0;
          input.addEventListener("input", () => {
            const mySeq = ++seq;
            const k = input.value.trim();
            sec.querySelectorAll(".xlc-pickdoc-hit").forEach((el) => el.remove());
            sec.querySelectorAll(".xlc-pickdoc-empty").forEach((el) => el.remove());
            if (!k) return;
            void this.deps.searchDocs(k).then((hits) => {
              if (mySeq !== seq) return;
              if (hits.length === 0) {
                const empty = document.createElement("div");
                empty.className = "xlc-pickdoc-empty";
                empty.textContent = this.deps.t("docPickerEmpty");
                sec.appendChild(empty);
                return;
              }
              for (const hit of hits.slice(0, 5)) {
                sec.appendChild(this.menuButton("\u2913", hit.hPath || hit.name || hit.id, "xlc-menu-item xlc-pickdoc-hit", async () => {
                  var _a3;
                  (_a3 = this.menuDismiss) == null ? void 0 : _a3.call(this);
                  this.menuDismiss = null;
                  await this.insertEntryWithVars(entry, (fills) => this.deps.insertToDoc(entry.id, hit.id, hit.hPath, fills));
                }));
              }
            }).catch(() => void 0);
          });
          const actions2 = menu.querySelectorAll(".xlc-menu-sec");
          (_a2 = actions2[actions2.length - 1]) == null ? void 0 : _a2.before(sec);
          input.focus();
        });
        sec2.appendChild(toDocBtn);
        menu.appendChild(sec2);
        menu.appendChild(previewBox);
      };
      const buildTransformView = (viewLabel, transformLabel) => {
        const lbl = document.createElement("div");
        lbl.className = "xlc-menu-lbl";
        lbl.textContent = viewLabel;
        menu.appendChild(lbl);
        const box = document.createElement("pre");
        box.className = "xlc-menu-preview xlc-menu-preview--muted";
        box.textContent = this.deps.t("aiWorking");
        menu.appendChild(box);
        const sec = document.createElement("div");
        sec.className = "xlc-menu-sec";
        const resultButtons = [];
        const syncReady = () => {
          const ready = Boolean(box.dataset.transformed);
          for (const b of resultButtons) b.disabled = !ready;
        };
        const insertBtn = this.menuButton("\uFF0B", this.deps.t("aiInsertTransformed"), "xlc-menu-item", async () => {
          var _a2;
          const transformed = (_a2 = box.dataset.transformed) != null ? _a2 : "";
          if (!transformed) return;
          this.destroy();
          await this.deps.insertRaw(transformed);
        });
        const copyBtn = this.menuButton("\u29C9", this.deps.t("aiCopyTransformed"), "xlc-menu-item", async () => {
          var _a2;
          const transformed = (_a2 = box.dataset.transformed) != null ? _a2 : "";
          if (!transformed) return;
          await this.deps.copyText(transformed);
        });
        resultButtons.push(insertBtn, copyBtn);
        sec.appendChild(insertBtn);
        sec.appendChild(copyBtn);
        syncReady();
        menu.syncTransformReady = syncReady;
        sec.appendChild(this.menuButton("\u21A9", this.deps.t("aiInsertOriginal"), "xlc-menu-item", async () => {
          this.destroy();
          await this.deps.runAction(entry.id, entry.itemType === "blockref" ? "insert-ref" : "insert");
        }));
        const saveBtn = this.menuButton("\u{1F5CE}", this.deps.t("saveTransformed"), "xlc-menu-item", async () => {
          var _a2;
          const transformed = (_a2 = box.dataset.transformed) != null ? _a2 : "";
          if (!transformed) return;
          this.destroy();
          await this.deps.saveTransformed(entry.id, transformLabel, transformed);
        });
        resultButtons.push(saveBtn);
        sec.appendChild(saveBtn);
        syncReady();
        menu.appendChild(sec);
        const secBack = document.createElement("div");
        secBack.className = "xlc-menu-sec";
        secBack.appendChild(this.menuButton("\u2190", this.deps.t("more"), "xlc-menu-item", () => {
          rebuild(buildDefault);
        }));
        menu.appendChild(secBack);
        menu.applyTransform = (text) => {
          var _a2;
          box.dataset.transformed = text;
          box.textContent = text.slice(0, 800);
          box.classList.remove("xlc-menu-preview--muted");
          (_a2 = menu.syncTransformReady) == null ? void 0 : _a2.call(menu);
        };
      };
      const runTransformView = async (run, gen) => {
        const result = await run();
        if (gen !== this.transformSeq) return;
        const apply = menu.applyTransform;
        if (result.ok) {
          apply == null ? void 0 : apply(result.text);
        } else {
          const box = menu.querySelector(".xlc-menu-preview");
          if (box) box.textContent = result.message;
        }
      };
      rebuild(buildDefault);
      const host = (_e = (_d = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-dialog")) != null ? _d : (_c = this.dialog) == null ? void 0 : _c.element) != null ? _e : document.body;
      host.appendChild(menu);
      const escHandler = (e) => {
        var _a2;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          (_a2 = this.menuDismiss) == null ? void 0 : _a2.call(this);
          this.menuDismiss = null;
          this.restoreFocusToSearch();
        }
      };
      menu.addEventListener("keydown", escHandler);
      const focusMenuItem = (offset) => {
        const items = Array.from(menu.querySelectorAll(".xlc-menu-item"));
        if (items.length === 0) return;
        const current = items.indexOf(document.activeElement);
        const next = items[((current + offset) % items.length + items.length) % items.length];
        next == null ? void 0 : next.focus();
      };
      menu.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          focusMenuItem(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          focusMenuItem(-1);
        } else if (e.key === "Tab") {
          e.preventDefault();
          e.stopPropagation();
          focusMenuItem(e.shiftKey ? -1 : 1);
        }
      });
      const dismiss = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          this.menuDismiss = null;
          document.removeEventListener("pointerdown", dismiss, true);
          this.restoreFocusToSearch();
        }
      };
      this.menuDismiss = () => {
        menu.remove();
        document.removeEventListener("pointerdown", dismiss, true);
      };
      document.addEventListener("pointerdown", dismiss, true);
      (_f = menu.querySelector(".xlc-menu-item")) == null ? void 0 : _f.focus();
    }
    async onKeydown(e) {
      var _a, _b, _c, _d;
      if (e.isComposing || e.keyCode === 229) return;
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
        if ((_c = (_b = e.target).closest) == null ? void 0 : _c.call(_b, ".xlc-row-action")) return;
        if (e.repeat) return;
        e.preventDefault();
        if (this.activeProvider >= 0) {
          const row = this.providerRows[this.activeProvider];
          if (row) {
            this.destroy();
            await this.deps.insertProviderPayload(row.payload, (_d = this.insertTarget) != null ? _d : void 0);
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
        if (e.repeat) return;
        e.preventDefault();
        const idx = Number(e.key) - 1;
        const entry = this.results[idx];
        if (entry) {
          await this.runPrimary(entry);
        }
      }
    }
    destroy() {
      var _a, _b;
      if (this.inputDebounce) clearTimeout(this.inputDebounce);
      (_a = this.longPressCancel) == null ? void 0 : _a.call(this);
      this.longPressCancel = null;
      if (this.menuDismiss) {
        this.menuDismiss();
        this.menuDismiss = null;
      }
      (_b = this.dialog) == null ? void 0 : _b.destroy();
      this.dialog = null;
    }
  };

  // src/ui/settings-dialog.ts
  var import_siyuan3 = __toESM(require_stub_dom());

  // src/model/storage.ts
  var CONFIG_VERSION = 1;

  // src/model/transfer.ts
  function toTimestamp(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  function validateImport(jsonText) {
    const issues = [];
    if (jsonText.length > LIMITS.maxImportBytes) {
      return { ok: false, reason: "file-too-large", issues };
    }
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
    const seenIds = /* @__PURE__ */ new Set();
    record.items.forEach((raw, index) => {
      const item = normalizeExportedItem(raw);
      if (!item) {
        issues.push({ index, reason: "invalid-item" });
        return;
      }
      if (seenIds.has(item.id)) {
        issues.push({ index, reason: "duplicate-id" });
        return;
      }
      seenIds.add(item.id);
      items.push(item);
    });
    return { ok: true, parsed: { schemaVersion: EXPORT_SCHEMA_VERSION, items, unknownTopFields }, issues };
  }
  function normalizeExportedItem(raw) {
    var _a;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const obj = raw;
    if (!isLogicalId(obj.id)) return null;
    if (typeof obj.kramdown !== "string" || obj.kramdown.length > LIMITS.contentChars) return null;
    if (!isItemType(obj.itemType)) return null;
    const sourceRaw = (_a = obj.source) != null ? _a : {};
    const known = ["id", "itemType", "title", "alias", "tags", "category", "kramdown", "source", "url", "targetBlockId", "createdAt", "updatedAt"];
    const extensions = /* @__PURE__ */ Object.create(null);
    for (const [k, v] of Object.entries(obj)) {
      if (!known.includes(k)) extensions[k] = v;
    }
    const str = (v, cap) => typeof v === "string" ? v.slice(0, cap) : "";
    const tags = Array.isArray(obj.tags) ? obj.tags.filter((t) => typeof t === "string").slice(0, LIMITS.tags) : [];
    const url = str(obj.url, 2048);
    if (url && !isSafeHttpUrl(url)) return null;
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
        sourceType: isSourceType(sourceRaw.sourceType) ? sourceRaw.sourceType : "external"
      },
      url,
      targetBlockId: str(obj.targetBlockId, 32),
      createdAt: toTimestamp(obj.createdAt),
      updatedAt: toTimestamp(obj.updatedAt),
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
    var _a;
    let c = 0 ^ -1;
    for (const byte of data) c = c >>> 8 ^ ((_a = CRC_TABLE[(c ^ byte) & 255]) != null ? _a : 0);
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
  var ASSET_PATH_RE = /^(assets\/[^\s/][^\s]*|assets\/[^\s/])$/;
  function isValidAssetPath(path) {
    return ASSET_PATH_RE.test(path) && !path.includes("..");
  }
  function extractAssetPath(kramdown) {
    const m = kramdown.match(/\]\((assets\/[^)\s]+)[^)]*\)/);
    const path = m == null ? void 0 : m[1];
    if (!path) return null;
    return isValidAssetPath(path) ? path : null;
  }

  // src/service/export-markdown.ts
  async function buildMarkdownExport(items, kramdownById, fetchAssetBytes, pack) {
    var _a, _b;
    const oneLine = (value) => value.replace(/[\r\n]+/g, " ").trim();
    const entries = [];
    const skippedAssets = [];
    const assetEntries = /* @__PURE__ */ new Map();
    const usedNames = /* @__PURE__ */ new Set(["items.md"]);
    let assetCount = 0;
    const varNames = [];
    for (const item of items) {
      if (item.itemType === "code") continue;
      for (const field of listAskFields((_a = kramdownById.get(item.id)) != null ? _a : "")) {
        if (!varNames.includes(field.name)) varNames.push(field.name);
        if (varNames.length >= LIMITS.maxAskFields) break;
      }
      if (varNames.length >= LIMITS.maxAskFields) break;
    }
    const mdParts = [
      "# \u5C0F\u9A74\u5E38\u7528\uFF08\u5185\u6D4B\u7248\uFF09 \xB7 \u6761\u76EE\u5BFC\u51FA",
      "",
      `> \u5BFC\u51FA\u81EA\u601D\u6E90\u63D2\u4EF6\u300C\u5C0F\u9A74\u5E38\u7528\uFF08\u5185\u6D4B\u7248\uFF09\u300D\uFF0C\u5171 ${items.length} \u6761\u3002\u8D44\u6E90\u4F4D\u4E8E assets/\uFF0C\u6761\u76EE\u5185\u94FE\u63A5\u4E3A\u76F8\u5BF9\u8DEF\u5F84\u3002`,
      ""
    ];
    let totalLen = mdParts.reduce((n, p) => n + p.length, 0);
    if (pack && pack.name.trim()) {
      const manifest = [
        `<!-- xlc-pack`,
        `name: ${oneLine(pack.name).slice(0, LIMITS.title)}`,
        `items: ${items.length}`,
        varNames.length ? `vars: ${varNames.join(",")}` : "",
        `-->`
      ].filter(Boolean).join("\n");
      mdParts.unshift(manifest, "");
    }
    for (const item of items) {
      const kramdown = (_b = kramdownById.get(item.id)) != null ? _b : "";
      const meta = [
        `<!-- xlc-item`,
        `id: ${item.id}`,
        `type: ${item.itemType}`,
        item.alias ? `alias: ${oneLine(item.alias)}` : "",
        item.tags.length ? `tags: ${item.tags.map(oneLine).join(",")}` : "",
        item.category ? `category: ${oneLine(item.category)}` : "",
        item.source.sourceDocId ? `source-doc: ${oneLine(item.source.sourceDocId)}` : "",
        item.source.sourceBlockId ? `source-block: ${oneLine(item.source.sourceBlockId)}` : "",
        item.source.sourceType ? `source-type: ${oneLine(item.source.sourceType)}` : "",
        item.url ? `url: ${oneLine(item.url)}` : "",
        item.targetBlockId ? `target: ${oneLine(item.targetBlockId)}` : "",
        `-->`
      ].filter(Boolean).join("\n");
      mdParts.push(`## ${oneLine(item.title || item.id)}`, "", meta, "", kramdown, "");
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
      totalLen += 6 + (item.title || item.id).length + meta.length + kramdown.length;
      if (totalLen > LIMITS.contentChars) {
        mdParts.push("", "> \uFF08\u5185\u5BB9\u8D85\u957F\uFF0C\u5BFC\u51FA\u5728\u6B64\u622A\u65AD\uFF09");
        break;
      }
    }
    entries.push({ name: "items.md", data: new TextEncoder().encode(mdParts.join("\n")) });
    entries.push(...assetEntries.values());
    return { entries, itemCount: items.length, assetCount, skippedAssets, varNames };
  }

  // src/service/import-markdown.ts
  var ITEM_COMMENT_START = "<!-- xlc-item";
  var ITEM_COMMENT_END = "-->";
  var PACK_COMMENT_START = "<!-- xlc-pack";
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
  function parsePackManifest(md, firstItemAt) {
    var _a, _b;
    const start = md.indexOf(PACK_COMMENT_START);
    if (start === -1 || start > firstItemAt) return void 0;
    const end = md.indexOf(ITEM_COMMENT_END, start);
    if (end === -1) return void 0;
    const fields = parseMetadata(md.slice(start + PACK_COMMENT_START.length, end).split("\n")).fields;
    const name = ((_a = fields.get("name")) != null ? _a : "").slice(0, LIMITS.title);
    const vars = ((_b = fields.get("vars")) != null ? _b : "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, LIMITS.maxAskFields);
    if (!name) return void 0;
    return { name, vars };
  }
  function parseMarkdownPack(md) {
    var _a, _b;
    const items = [];
    const issues = [];
    const seenIds = /* @__PURE__ */ new Set();
    if (!md || !md.includes(ITEM_COMMENT_START)) return { items, issues };
    const firstItemAt = md.indexOf(ITEM_COMMENT_START);
    const pack = parsePackManifest(md, firstItemAt);
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
      const itemStart = (_a = commentStarts[i]) != null ? _a : 0;
      const lowerBound = i > 0 ? (_b = commentEnds[i - 1]) != null ? _b : 0 : 0;
      const titleLineStart = md.lastIndexOf("\n## ", itemStart) + 1;
      const chunkStart = Math.max(Math.min(titleLineStart, itemStart), lowerBound);
      const nextStart = commentEnds[i + 1];
      const chunkEnd = nextStart !== void 0 ? Math.max(md.lastIndexOf("\n## ", nextStart) + 1, nextStart) : md.length;
      chunks.push(md.slice(chunkStart, chunkEnd));
    }
    chunks.forEach((chunk, index) => {
      var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k;
      const endIdx = chunk.indexOf(ITEM_COMMENT_END);
      if (endIdx === -1) {
        issues.push({ index, reason: "metadata-comment-unclosed" });
        return;
      }
      const metaLines = chunk.slice(0, endIdx).split("\n");
      const { fields } = parseMetadata(metaLines);
      const id = (_a2 = fields.get("id")) != null ? _a2 : "";
      if (!/^xlc-[0-9a-z]{10,40}$/.test(id)) {
        issues.push({ index, reason: "invalid-id" });
        return;
      }
      if (seenIds.has(id)) {
        issues.push({ index, reason: "duplicate-id" });
        return;
      }
      const itemType = (_b2 = fields.get("type")) != null ? _b2 : "text";
      if (!isItemType(itemType)) {
        issues.push({ index, reason: "invalid-item-type" });
        return;
      }
      const url = (_c = fields.get("url")) != null ? _c : "";
      if (url && !isSafeHttpUrl(url)) {
        issues.push({ index, reason: "invalid-url" });
        return;
      }
      let title = "";
      const before = chunk.slice(0, chunk.indexOf(ITEM_COMMENT_START));
      for (const line of before.split("\n")) {
        const m = line.match(TITLE_RE);
        const matched = m == null ? void 0 : m[1];
        if (matched) title = matched.trim();
      }
      if (!title && fields.get("alias")) title = (_d = fields.get("alias")) != null ? _d : "";
      const body = chunk.slice(endIdx + ITEM_COMMENT_END.length).replace(/^\s*\n/, "").replace(/\n\s*$/, "");
      seenIds.add(id);
      items.push({
        id,
        itemType,
        title: title.slice(0, LIMITS.title),
        alias: ((_e = fields.get("alias")) != null ? _e : "").slice(0, LIMITS.alias),
        tags: ((_f = fields.get("tags")) != null ? _f : "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, LIMITS.tags),
        category: ((_g = fields.get("category")) != null ? _g : "").slice(0, LIMITS.category),
        kramdown: body.slice(0, LIMITS.contentChars),
        source: {
          sourceDocId: (_h = fields.get("source-doc")) != null ? _h : "",
          sourceBlockId: (_i = fields.get("source-block")) != null ? _i : "",
          sourceType: (_j = fields.get("source-type")) != null ? _j : "external"
        },
        url,
        targetBlockId: (_k = fields.get("target")) != null ? _k : "",
        createdAt: 0,
        updatedAt: Date.now()
      });
    });
    if (hasUnclosed) issues.push({ index: commentStarts.length, reason: "metadata-comment-unclosed" });
    return { items, issues, pack };
  }

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
  var active = createNoopPinyinAdapter();

  // src/model/search.ts
  function collectTags(entries) {
    const tags = /* @__PURE__ */ new Set();
    for (const e of entries) for (const t of e.tags) tags.add(t);
    return Array.from(tags).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }

  // src/service/prompt-pack.ts
  var PROMPT_PACK_NAME = "\u63D0\u793A\u8BCD\u573A\u666F\u5305";
  var PROMPT_PACK_MD = [
    "<!-- xlc-pack",
    `name: ${PROMPT_PACK_NAME}`,
    "items: 10",
    "vars: \u5BA2\u6237\u540D\u79F0,\u8865\u507F\u6BD4\u4F8B,\u5DE5\u5355\u53F7,\u8DDF\u8FDB\u65E5\u671F,\u5BA2\u6237\u6635\u79F0,\u76EE\u6807\u8BFB\u8005,\u7F16\u7A0B\u8BED\u8A00,\u672C\u5468\u4E3B\u9898,\u4F1A\u8BAE\u4E3B\u9898,\u8868\u540D",
    "-->",
    "# \u63D0\u793A\u8BCD\u573A\u666F\u5305",
    "",
    "> \u5C0F\u9A74\u5E38\u7528\uFF08\u5185\u6D4B\u7248\uFF09\u5185\u7F6E\u6A21\u677F\u96C6\uFF1A\u5BA2\u670D\u56DE\u590D / AI \u63D0\u793A\u8BCD / \u7814\u53D1\u5199\u4F5C\u3002\u5BFC\u5165\u540E\u5373\u4E3A\u771F\u5B9E\u601D\u6E90\u5757\uFF0C\u53EF\u81EA\u7531\u4FEE\u6539\u3002",
    // ---- 场景① 客服模板 ----
    "## \u5EF6\u671F\u81F4\u6B49\u56DE\u590D",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000001",
    "type: markdown",
    "tags: \u5BA2\u670D,\u6A21\u677F",
    "category: \u5BA2\u670D",
    "source-type: external",
    "-->",
    "\u5C0A\u656C\u7684 {{xlc:ask:\u5BA2\u6237\u540D\u79F0}}\uFF1A",
    "",
    "\u5173\u4E8E\u672C\u671F\u4EA4\u4ED8\u8BA1\u5212\u7684\u8C03\u6574\uFF0C\u6211\u4EEC\u6DF1\u8868\u6B49\u610F\u3002\u4E3B\u8981\u539F\u56E0\u4E3A __\u539F\u56E0__\uFF0C\u76EE\u524D\u8FDB\u5EA6\u5DF2\u8FBE __\u767E\u5206\u6BD4__\uFF0C\u9884\u8BA1\u63A8\u8FDF __\u5929\u6570__ \u4E2A\u5DE5\u4F5C\u65E5\u3002",
    "",
    "\u4E3A\u5F25\u8865\u5F71\u54CD\uFF0C\u6211\u4EEC\u63D0\u4F9B\u4EE5\u4E0B\u8865\u507F\uFF1A",
    "1. \u672C\u671F\u670D\u52A1\u8D39\u51CF\u514D {{xlc:ask:\u8865\u507F\u6BD4\u4F8B|5%,10%,\u81EA\u5B9A\u4E49}}\uFF1B",
    "2. \u4E0A\u7EBF\u540E 48 \u5C0F\u65F6\u4E13\u5C5E\u503C\u5B88\uFF1B",
    "3. \u4E0B\u671F\u8FED\u4EE3\u4F18\u5148\u6392\u5165\u8D35\u65B9\u9700\u6C42\u3002",
    "",
    "\u518D\u6B21\u611F\u8C22\u7406\u89E3\u4E0E\u652F\u6301\uFF0C\u6709\u4EFB\u4F55\u95EE\u9898\u968F\u65F6\u8054\u7CFB\u6211\u3002{{xlc:cursor}}",
    "## \u5DE5\u5355\u8FDB\u5EA6\u8DDF\u8FDB",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000002",
    "type: markdown",
    "tags: \u5BA2\u670D,\u8DDF\u8FDB",
    "category: \u5BA2\u670D",
    "source-type: external",
    "-->",
    "{{xlc:ask:\u5BA2\u6237\u540D\u79F0}} \u60A8\u597D\uFF1A",
    "",
    "\u60A8\u7684\u5DE5\u5355 {{xlc:ask:\u5DE5\u5355\u53F7}} \u5F53\u524D\u72B6\u6001\uFF1A__\u5F53\u524D\u72B6\u6001__\u3002",
    "\u9884\u8BA1\u5B8C\u6210\u65F6\u95F4\uFF1A{{xlc:ask:\u8DDF\u8FDB\u65E5\u671F|date}}\u3002\u671F\u95F4\u6709\u4EFB\u4F55\u8865\u5145\u4FE1\u606F\u8BF7\u76F4\u63A5\u56DE\u590D\u672C\u6D88\u606F\u3002",
    "",
    "\u611F\u8C22\u60A8\u7684\u8010\u5FC3\u7B49\u5F85\u3002{{xlc:cursor}}",
    "## \u597D\u8BC4\u611F\u8C22\u56DE\u590D",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000003",
    "type: text",
    "tags: \u5BA2\u670D,\u56DE\u590D",
    "category: \u5BA2\u670D",
    "source-type: external",
    "-->",
    "\u611F\u8C22 {{xlc:ask:\u5BA2\u6237\u6635\u79F0}} \u7684\u8BA4\u53EF\u4E0E\u652F\u6301\uFF01\u60A8\u7684\u9F13\u52B1\u662F\u6211\u4EEC\u524D\u8FDB\u7684\u52A8\u529B\uFF0C\u5982\u518D\u6B21\u5149\u4E34\u6709\u4EFB\u4F55\u95EE\u9898\uFF0C\u968F\u65F6\u8054\u7CFB\u6211\u3002\u795D\u751F\u6D3B\u6109\u5FEB\uFF01{{xlc:cursor}}",
    // ---- 场景② AI 提示词库 ----
    "## \u6587\u7AE0\u6DA6\u8272\u63D0\u793A\u8BCD",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000004",
    "type: text",
    "tags: AI,\u63D0\u793A\u8BCD",
    "category: \u63D0\u793A\u8BCD",
    "source-type: external",
    "-->",
    "\u4F60\u662F\u8D44\u6DF1\u7F16\u8F91\u3002\u8BF7\u6DA6\u8272\u4EE5\u4E0B\u6587\u7AE0\uFF0C\u9762\u5411 {{xlc:ask:\u76EE\u6807\u8BFB\u8005|\u666E\u901A\u8BFB\u8005,\u4E13\u4E1A\u8BFB\u8005}}\uFF1A",
    "\u4FDD\u6301\u539F\u610F\u4E0E\u7ED3\u6784\uFF0C\u4EC5\u63D0\u5347\u6D41\u7545\u5EA6\u4E0E\u8868\u8FBE\u529B\uFF1B\u4E0D\u6539\u5199\u4E8B\u5B9E\uFF0C\u4E0D\u65B0\u589E\u5185\u5BB9\u3002",
    "\u8F93\u51FA\u6DA6\u8272\u540E\u7684\u5168\u6587\uFF1A",
    "",
    "{{xlc:clipboard}}{{xlc:cursor}}",
    "## \u4EE3\u7801\u5BA1\u67E5\u63D0\u793A\u8BCD",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000005",
    "type: text",
    "tags: AI,\u63D0\u793A\u8BCD,\u5F00\u53D1",
    "category: \u63D0\u793A\u8BCD",
    "source-type: external",
    "-->",
    "\u4F60\u662F {{xlc:ask:\u7F16\u7A0B\u8BED\u8A00|TypeScript,Python,Go}} \u8D44\u6DF1\u5DE5\u7A0B\u5E08\uFF0C\u8BF7\u5BA1\u67E5\u4EE5\u4E0B\u4EE3\u7801\uFF0C\u6309\u4E25\u91CD\u5EA6\u8F93\u51FA\uFF1A",
    "1. \u6B63\u786E\u6027\u95EE\u9898\uFF08\u4F1A\u51FA\u9519\u7684\u5730\u65B9\uFF09",
    "2. \u5B89\u5168\u9690\u60A3",
    "3. \u53EF\u8BFB\u6027\u4E0E\u7EF4\u62A4\u6027\u5EFA\u8BAE",
    "\u4EC5\u5217\u95EE\u9898\u4E0E\u4FEE\u6539\u5EFA\u8BAE\uFF0C\u4E0D\u91CD\u5199\u5168\u6587\uFF1A",
    "",
    "{{xlc:clipboard}}{{xlc:cursor}}",
    "## \u4F1A\u8BAE\u8981\u70B9\u63D0\u70BC\u63D0\u793A\u8BCD",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000006",
    "type: text",
    "tags: AI,\u63D0\u793A\u8BCD",
    "category: \u63D0\u793A\u8BCD",
    "source-type: external",
    "-->",
    "\u8BF7\u628A\u4EE5\u4E0B\u4F1A\u8BAE\u8BB0\u5F55\u63D0\u70BC\u4E3A\u8981\u70B9\uFF1A\u7ED3\u8BBA / \u5F85\u529E\uFF08\u8D1F\u8D23\u4EBA+\u622A\u6B62\u65F6\u95F4\uFF09/ \u98CE\u9669\u4E09\u7C7B\uFF0C\u6BCF\u6761\u4E00\u884C\uFF1A",
    "",
    "{{xlc:clipboard}}{{xlc:cursor}}",
    // ---- 场景③ 研发写作常用件 ----
    "## \u5468\u62A5\u5F00\u5934",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000007",
    "type: markdown",
    "tags: \u5199\u4F5C,\u5468\u62A5",
    "category: \u5199\u4F5C",
    "source-type: external",
    "-->",
    "\u672C\u5468\u56F4\u7ED5 {{xlc:ask:\u672C\u5468\u4E3B\u9898}} \u63A8\u8FDB\uFF0C\u5173\u952E\u8FDB\u5C55\uFF1A",
    "",
    "1. __\u4E8B\u9879__\uFF08\u72B6\u6001\uFF1A__\u8FDB\u5EA6__\uFF09",
    "2. __\u4E8B\u9879__\uFF08\u72B6\u6001\uFF1A__\u8FDB\u5EA6__\uFF09",
    "",
    "\u98CE\u9669\u4E0E\u4F9D\u8D56\uFF1A{{xlc:cursor}}",
    "## \u4F1A\u8BAE\u7EAA\u8981\u9AA8\u67B6",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000008",
    "type: markdown",
    "tags: \u5199\u4F5C,\u4F1A\u8BAE",
    "category: \u5199\u4F5C",
    "source-type: external",
    "-->",
    "# {{xlc:ask:\u4F1A\u8BAE\u4E3B\u9898}} \xB7 \u4F1A\u8BAE\u7EAA\u8981\uFF08{{xlc:date}}\uFF09",
    "",
    "## \u7ED3\u8BBA",
    "- {{xlc:cursor}}",
    "## \u5F85\u529E",
    "- [ ] __\u4E8B\u9879__\uFF08\u8D1F\u8D23\u4EBA\uFF1A__ / \u622A\u6B62\uFF1A__\uFF09",
    "## \u98CE\u9669",
    "- ",
    "## \u65E5\u8BA1\u5212\u6A21\u677F",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000009",
    "type: markdown",
    "tags: \u5199\u4F5C,\u8BA1\u5212",
    "category: \u5199\u4F5C",
    "source-type: external",
    "-->",
    "## \u4ECA\u65E5\u4E09\u4EF6\u4E8B\uFF08{{xlc:date}}\uFF09",
    "",
    "1. {{xlc:cursor}}",
    "2. ",
    "3. ",
    "## \u7559\u767D\uFF08\u5E94\u5BF9\u7A81\u53D1\uFF09",
    "- ",
    "## SQL \u5206\u9875\u67E5\u8BE2",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000010",
    "type: code",
    "tags: \u5F00\u53D1,SQL",
    "category: \u5F00\u53D1",
    "source-type: external",
    "-->",
    "```sql",
    "SELECT * FROM {{xlc:ask:\u8868\u540D}}",
    "WHERE status = 'published'",
    "ORDER BY updated_at DESC",
    "LIMIT 20 OFFSET 40;",
    "```"
  ].join("\n");

  // src/ui/settings-dialog.ts
  function buildSwitchRow(text, sub, checked, onChange) {
    const row = document.createElement("label");
    row.className = "xlc-setting-row";
    const cap = document.createElement("span");
    cap.className = "xlc-setting-text";
    cap.textContent = text;
    if (sub) {
      const subEl = document.createElement("span");
      subEl.className = "xlc-setting-sub";
      subEl.textContent = sub;
      cap.appendChild(subEl);
    }
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "xlc-switch";
    box.checked = checked;
    box.addEventListener("change", () => onChange(box.checked));
    row.appendChild(cap);
    row.appendChild(box);
    return row;
  }
  function openSetupDialog(ctx, opts) {
    const t = ctx.t;
    const dialog = new import_siyuan3.Dialog({
      title: t("setupTitle"),
      content: "",
      width: "min(520px, 92vw)",
      height: "min(640px, 90vh)"
      // 固定高：步骤/内容增减不再顶跳弹窗（R146）
    });
    const body = getDialogBody(dialog.element);
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form";
    buildLibraryPickerSection(ctx, root, () => {
      var _a;
      dialog.destroy();
      (_a = opts == null ? void 0 : opts.onConfigured) == null ? void 0 : _a.call(opts);
    }, { onDismiss: () => dialog.destroy() });
    body.appendChild(root);
  }
  function openSettingsDialog(ctx) {
    const t = ctx.t;
    const dialog = new import_siyuan3.Dialog({
      title: t("openSettings"),
      content: "",
      width: "min(560px, 92vw)",
      height: "min(720px, 90vh)"
      // 固定高：展开/收起/提示行显隐不再顶跳弹窗（R146）
    });
    const body = getDialogBody(dialog.element);
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form";
    const libSec = document.createElement("div");
    libSec.className = "xlc-form-field xlc-card";
    const libLabel = document.createElement("span");
    libLabel.className = "xlc-form-label";
    libLabel.textContent = t("librarySection");
    libSec.appendChild(libLabel);
    const libStatus = document.createElement("div");
    libStatus.className = "xlc-form-hint";
    const cfg = ctx.getConfig();
    libStatus.textContent = cfg ? cfg.mode === "notebook" ? t("libModeNotebook", String(cfg.notebookIds.length)) : t("libModeDoc", String(cfg.containerDocIds.length)) : t("libraryNone");
    const changeBtn = document.createElement("button");
    changeBtn.className = "b3-button";
    changeBtn.textContent = t("openSettingsChangeLib");
    changeBtn.setAttribute("aria-expanded", "false");
    const libRow = document.createElement("div");
    libRow.className = "xlc-setting-row";
    const statusText = document.createElement("span");
    statusText.className = "xlc-setting-text";
    statusText.textContent = libStatus.textContent;
    libRow.appendChild(statusText);
    libRow.appendChild(changeBtn);
    libSec.appendChild(libRow);
    const pickerHost = document.createElement("div");
    pickerHost.style.display = "none";
    changeBtn.addEventListener("click", () => {
      const show = pickerHost.style.display === "none";
      pickerHost.style.display = show ? "" : "none";
      changeBtn.setAttribute("aria-expanded", show ? "true" : "false");
      if (show && pickerHost.childElementCount === 0) {
        buildLibraryPickerSection(ctx, pickerHost, () => dialog.destroy());
      }
      if (show) requestAnimationFrame(() => {
        var _a;
        try {
          (_a = pickerHost.querySelector(".b3-text-field")) == null ? void 0 : _a.focus();
        } catch {
        }
      });
    });
    libSec.appendChild(pickerHost);
    root.appendChild(libSec);
    buildAiSection(ctx, root);
    buildInsertSection(ctx, root);
    buildSearchSection(ctx, root);
    buildProviderSection(ctx, root);
    buildDataSection(ctx, root);
    body.appendChild(root);
  }
  async function openPackExportDialog(ctx) {
    const t = ctx.t;
    const idx = await ctx.library.ensureIndex();
    const all = Array.from(idx.items.values());
    const categories = Array.from(new Set(all.map((i) => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
    const dialog = new import_siyuan3.Dialog({
      title: t("packExportTitle"),
      content: "",
      width: "min(460px, 92vw)",
      height: "min(600px, 90vh)"
      // 固定高：分类切换不顶跳（R146）
    });
    const body = getDialogBody(dialog.element);
    if (!body) return;
    body.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "xlc-form";
    const meta = document.createElement("div");
    meta.className = "xlc-import-meta";
    wrap.appendChild(meta);
    const paintMeta = (count, varCount) => {
      meta.textContent = "";
      const countBadge = document.createElement("span");
      countBadge.className = "xlc-badge xlc-badge--markdown";
      countBadge.textContent = t("itemCountBadge", String(count));
      meta.appendChild(countBadge);
      if (varCount > 0) {
        const varBadge = document.createElement("span");
        varBadge.className = "xlc-badge xlc-badge--var";
        varBadge.textContent = t("packVarsBadge", String(varCount));
        meta.appendChild(varBadge);
      }
    };
    const catWrap = document.createElement("div");
    catWrap.className = "xlc-form-field";
    const catLabel = document.createElement("label");
    catLabel.className = "xlc-form-label";
    catLabel.textContent = t("packCategoryLabel");
    catWrap.appendChild(catLabel);
    const catSelect = document.createElement("select");
    catSelect.className = "b3-select";
    catSelect.id = "xlc-pack-category";
    catLabel.htmlFor = catSelect.id;
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = t("allCategories");
    catSelect.appendChild(allOpt);
    for (const c of categories) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      catSelect.appendChild(opt);
    }
    catWrap.appendChild(catSelect);
    wrap.appendChild(catWrap);
    const nameWrap = document.createElement("div");
    nameWrap.className = "xlc-form-field";
    const nameLabel = document.createElement("label");
    nameLabel.className = "xlc-form-label";
    nameLabel.textContent = t("packNameLabel");
    nameWrap.appendChild(nameLabel);
    const nameInput = document.createElement("input");
    nameInput.className = "b3-text-field";
    nameInput.id = "xlc-pack-name";
    nameLabel.htmlFor = nameInput.id;
    nameInput.value = t("packNameDefault");
    nameWrap.appendChild(nameInput);
    wrap.appendChild(nameWrap);
    const contents = document.createElement("div");
    contents.className = "xlc-form-hint";
    contents.style.lineHeight = "1.8";
    contents.style.whiteSpace = "pre-line";
    contents.textContent = t("packContentsHint");
    wrap.appendChild(contents);
    const trustHint = document.createElement("div");
    trustHint.className = "xlc-form-hint";
    trustHint.style.marginTop = "8px";
    trustHint.textContent = t("packTrustHint");
    wrap.appendChild(trustHint);
    const actions = document.createElement("div");
    actions.className = "xlc-form-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "b3-button";
    cancelBtn.textContent = t("cancel");
    cancelBtn.addEventListener("click", () => dialog.destroy());
    actions.appendChild(cancelBtn);
    const exportBtn = document.createElement("button");
    exportBtn.className = "b3-button xlc-btn-primary";
    exportBtn.textContent = t("packExportBtn");
    exportBtn.addEventListener("click", () => {
      const packName = nameInput.value.trim() || t("packNameDefault");
      const category = catSelect.value;
      const items = category ? all.filter((i) => i.category === category) : all;
      if (items.length === 0) {
        ctx.notify("error", t("exportEmpty"));
        return;
      }
      if (exportBtn.disabled) return;
      exportBtn.disabled = true;
      exportBtn.textContent = t("indexing");
      void (async () => {
        const kramdownById = await collectKramdown(ctx, items);
        const result = await buildMarkdownExport(items, kramdownById, (assetPath) => ctx.fetchAssetBytes(assetPath), { name: packName });
        const zipBytes = buildZip(result.entries);
        const blob = new Blob([zipBytes], { type: "application/zip" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const safeName = packName.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "pack";
        a.download = `${safeName}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
        dialog.destroy();
        ctx.notify("info", t("exportMdDone", String(result.itemCount), String(result.assetCount), String(result.skippedAssets.length)));
      })().catch((err) => {
        exportBtn.disabled = false;
        exportBtn.textContent = t("packExportBtn");
        ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
      });
    });
    actions.appendChild(exportBtn);
    wrap.appendChild(actions);
    body.appendChild(wrap);
    const repaint = () => {
      const category = catSelect.value;
      const items = category ? all.filter((i) => i.category === category) : all;
      const withVars = items.filter((i) => {
        var _a;
        return ((_a = i.varCount) != null ? _a : 0) > 0;
      }).length;
      paintMeta(items.length, withVars);
    };
    catSelect.addEventListener("change", repaint);
    repaint();
  }
  async function collectKramdown(ctx, items) {
    const kramdownById = /* @__PURE__ */ new Map();
    for (const item of items) {
      const kd = await ctx.library.getItemKramdown(item);
      if (kd.ok) kramdownById.set(item.id, kd.data);
    }
    return kramdownById;
  }
  function buildInsertSection(ctx, root) {
    const t = ctx.t;
    const sec = document.createElement("div");
    sec.className = "xlc-form-field xlc-card";
    const label = document.createElement("span");
    label.className = "xlc-form-label";
    label.textContent = t("insertSection");
    sec.appendChild(label);
    sec.appendChild(buildSwitchRow(
      t("promptVariablesToggle"),
      t("promptVariablesSub"),
      ctx.state.insert.promptVariables,
      (value) => {
        ctx.state.insert.promptVariables = value;
        ctx.persistSoon();
      }
    ));
    sec.appendChild(buildSwitchRow(
      t("recordUsageToggle"),
      t("recordUsageSub"),
      ctx.state.insert.recordUsage,
      (value) => {
        ctx.state.insert.recordUsage = value;
        ctx.persistSoon();
      }
    ));
    const foot = document.createElement("div");
    foot.className = "xlc-setting-row";
    const hint = document.createElement("span");
    hint.className = "xlc-setting-text";
    hint.textContent = t("usageStatsHint");
    foot.appendChild(hint);
    const clearBtn = document.createElement("button");
    clearBtn.className = "b3-button";
    clearBtn.textContent = t("clearUsageBtn");
    clearBtn.addEventListener("click", () => {
      (0, import_siyuan3.confirm)("\u26A0\uFE0F " + t("clearUsageBtn"), t("clearUsageConfirm"), () => {
        ctx.state.usage = {};
        ctx.persistSoon();
        ctx.notify("info", t("clearUsageDone"));
      });
    });
    foot.appendChild(clearBtn);
    sec.appendChild(foot);
    root.appendChild(sec);
  }
  function buildProviderSection(ctx, root) {
    const t = ctx.t;
    const provSec = document.createElement("div");
    provSec.className = "xlc-form-field xlc-card";
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
        status.className = "xlc-badge " + (p.runtime ? "xlc-badge--ai" : "xlc-badge--warn");
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
  function buildStepsEl(current, caption) {
    const steps = document.createElement("div");
    steps.className = "xlc-steps";
    const dot1 = document.createElement("span");
    dot1.className = "xlc-step-dot" + (current === 1 ? " xlc-step-dot--on" : "");
    dot1.textContent = current === 1 ? "1" : "\u2713";
    steps.appendChild(dot1);
    const line = document.createElement("span");
    line.className = "xlc-step-line";
    steps.appendChild(line);
    const dot2 = document.createElement("span");
    dot2.className = "xlc-step-dot" + (current === 2 ? " xlc-step-dot--on" : "");
    dot2.textContent = "2";
    steps.appendChild(dot2);
    const cap = document.createElement("span");
    cap.className = "xlc-step-cap";
    cap.textContent = caption;
    steps.appendChild(cap);
    return steps;
  }
  function buildLibraryPickerSection(ctx, root, onConfigured, opts) {
    const t = ctx.t;
    let step = 1;
    let pickedDoc = null;
    const stepsEl = buildStepsEl(1, t("setupStep1"));
    root.appendChild(stepsEl);
    const hint = document.createElement("p");
    hint.className = "xlc-form-hint";
    hint.style.marginBottom = "12px";
    hint.textContent = t("setupHint");
    root.appendChild(hint);
    const step1 = document.createElement("div");
    const modeWrap = document.createElement("div");
    modeWrap.className = "xlc-form-field";
    const modeLabel = document.createElement("label");
    modeLabel.className = "xlc-form-label";
    modeLabel.textContent = t("setupModeLabel");
    modeWrap.appendChild(modeLabel);
    const modeSelect = document.createElement("select");
    modeSelect.className = "b3-select";
    modeSelect.id = "xlc-setup-mode";
    modeLabel.htmlFor = modeSelect.id;
    const modes = [
      { v: "doc", label: t("setupPickDoc") },
      { v: "tree", label: t("setupPickDocTree") },
      { v: "notebook", label: t("setupNotebook") }
    ];
    for (const m of modes) {
      const opt = document.createElement("option");
      opt.value = m.v;
      opt.textContent = m.label;
      modeSelect.appendChild(opt);
    }
    modeWrap.appendChild(modeSelect);
    step1.appendChild(modeWrap);
    const pickerWrap = document.createElement("div");
    pickerWrap.className = "xlc-form-field";
    const pickerInput = document.createElement("input");
    pickerInput.className = "b3-text-field";
    pickerInput.placeholder = t("docPicker");
    pickerInput.setAttribute("aria-label", t("docPicker"));
    pickerWrap.appendChild(pickerInput);
    const pickerList = document.createElement("div");
    pickerList.className = "xlc-doclist";
    pickerWrap.appendChild(pickerList);
    step1.appendChild(pickerWrap);
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
      }).catch((err) => {
        if (seq !== pickerSeq) return;
        const empty = document.createElement("div");
        empty.className = "xlc-doclist-empty";
        empty.textContent = t("kernelError", err.message);
        pickerList.appendChild(empty);
      });
    });
    const nbWrap = document.createElement("div");
    nbWrap.className = "xlc-form-field";
    nbWrap.style.display = "none";
    const nbLabel = document.createElement("label");
    nbLabel.className = "xlc-form-label";
    nbLabel.textContent = t("setupNotebook");
    nbWrap.appendChild(nbLabel);
    const nbSelect = document.createElement("select");
    nbSelect.className = "b3-select";
    nbSelect.id = "xlc-setup-notebook";
    nbLabel.htmlFor = nbSelect.id;
    nbWrap.appendChild(nbSelect);
    step1.appendChild(nbWrap);
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
    }).catch((err) => {
      ctx.notify("error", t("kernelError", err.message));
    });
    const syncModeUi = () => {
      const notebook = modeSelect.value === "notebook";
      pickerWrap.style.display = notebook ? "none" : "";
      nbWrap.style.display = notebook ? "" : "none";
    };
    modeSelect.addEventListener("change", syncModeUi);
    syncModeUi();
    const nameWrap = document.createElement("div");
    nameWrap.className = "xlc-form-field";
    const nameLabel = document.createElement("label");
    nameLabel.className = "xlc-form-label";
    nameLabel.textContent = t("setupNewDoc");
    nameWrap.appendChild(nameLabel);
    const nameRow = document.createElement("div");
    nameRow.className = "xlc-form-row";
    const nameInput = document.createElement("input");
    nameInput.className = "b3-text-field";
    nameInput.id = "xlc-setup-newdoc";
    nameLabel.htmlFor = nameInput.id;
    nameInput.value = t("setupNewDocName");
    nameRow.appendChild(nameInput);
    const createBtn = document.createElement("button");
    createBtn.className = "b3-button";
    createBtn.style.whiteSpace = "nowrap";
    createBtn.textContent = t("create");
    createBtn.addEventListener("click", () => {
      const notebookId = nbSelect.value;
      const title = nameInput.value.trim();
      if (!notebookId || !title) {
        ctx.notify("error", t("invalidItem"));
        return;
      }
      (0, import_siyuan3.confirm)("\u26A0\uFE0F " + t("setupTitle"), t("setupConfirmCreate", title), () => {
        if (createBtn.disabled) return;
        createBtn.disabled = true;
        createBtn.textContent = t("saving");
        void ctx.library.createLibraryDoc(notebookId, title).then((result) => {
          createBtn.disabled = false;
          createBtn.textContent = t("create");
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
        }).catch((err) => {
          createBtn.disabled = false;
          createBtn.textContent = t("create");
          ctx.notify("error", t("kernelError", err.message));
        });
      });
    });
    nameRow.appendChild(createBtn);
    nameWrap.appendChild(nameRow);
    step1.appendChild(nameWrap);
    const step1Actions = document.createElement("div");
    step1Actions.className = "xlc-form-actions";
    if (opts == null ? void 0 : opts.onDismiss) {
      const dismissBtn = document.createElement("button");
      dismissBtn.className = "b3-button xlc-btn-ghost";
      dismissBtn.textContent = t("setupLater");
      dismissBtn.addEventListener("click", () => {
        var _a;
        return (_a = opts.onDismiss) == null ? void 0 : _a.call(opts);
      });
      step1Actions.appendChild(dismissBtn);
    }
    const nextBtn = document.createElement("button");
    nextBtn.className = "b3-button xlc-btn-primary";
    nextBtn.textContent = t("setupNext");
    nextBtn.addEventListener("click", () => {
      const mode = modeSelect.value;
      if (mode === "notebook" && !nbSelect.value) {
        ctx.notify("error", t("pickNotebookFirst"));
        return;
      }
      if (mode !== "notebook" && !pickedDoc) {
        ctx.notify("error", t("pickDocFirst"));
        return;
      }
      gotoStep(2);
    });
    step1Actions.appendChild(nextBtn);
    step1.appendChild(step1Actions);
    root.appendChild(step1);
    const step2 = document.createElement("div");
    step2.style.display = "none";
    const summaryWrap = document.createElement("div");
    summaryWrap.className = "xlc-policy-list";
    step2.appendChild(summaryWrap);
    const summaryHint = document.createElement("p");
    summaryHint.className = "xlc-form-hint";
    summaryHint.style.marginTop = "12px";
    summaryHint.textContent = t("setupConfirmHint");
    step2.appendChild(summaryHint);
    const step2Actions = document.createElement("div");
    step2Actions.className = "xlc-form-actions";
    const backBtn = document.createElement("button");
    backBtn.className = "b3-button xlc-btn-ghost";
    backBtn.textContent = t("setupBack");
    backBtn.addEventListener("click", () => gotoStep(1));
    step2Actions.appendChild(backBtn);
    const finishBtn = document.createElement("button");
    finishBtn.className = "b3-button xlc-btn-primary";
    finishBtn.textContent = t("setupFinish");
    finishBtn.addEventListener("click", () => {
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
        ctx.notify("error", t("pickDocFirst"));
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
    step2Actions.appendChild(finishBtn);
    step2.appendChild(step2Actions);
    root.appendChild(step2);
    function paintSummary() {
      var _a, _b;
      summaryWrap.textContent = "";
      const mode = modeSelect.value;
      const card = document.createElement("div");
      card.className = "xlc-policy xlc-policy--recommended";
      const icon = document.createElement("span");
      icon.className = "xlc-policy-ic";
      icon.textContent = "\u2713";
      card.appendChild(icon);
      const text = document.createElement("span");
      const titleEl = document.createElement("span");
      titleEl.className = "xlc-policy-title";
      titleEl.textContent = mode === "notebook" ? `${t("setupNotebook")} \xB7 ${(_b = (_a = nbSelect.selectedOptions[0]) == null ? void 0 : _a.textContent) != null ? _b : nbSelect.value}` : (pickedDoc == null ? void 0 : pickedDoc.hPath) || (pickedDoc == null ? void 0 : pickedDoc.id) || "-";
      text.appendChild(titleEl);
      const desc = document.createElement("span");
      desc.className = "xlc-policy-desc";
      desc.textContent = mode === "notebook" ? t("setupSummaryNotebook") : t("setupSummaryDoc");
      text.appendChild(desc);
      card.appendChild(text);
      summaryWrap.appendChild(card);
    }
    function gotoStep(next) {
      step = next;
      stepsEl.remove();
      root.insertBefore(buildStepsEl(step, step === 1 ? t("setupStep1") : t("setupStep2")), root.firstChild);
      step1.style.display = step === 1 ? "" : "none";
      hint.style.display = step === 1 ? "" : "none";
      step2.style.display = step === 2 ? "" : "none";
      if (step === 2) paintSummary();
    }
  }
  function buildAiSection(ctx, root) {
    const t = ctx.t;
    const aiSec = document.createElement("div");
    aiSec.className = "xlc-form-field xlc-card";
    const aiLabel = document.createElement("span");
    aiLabel.className = "xlc-form-label";
    aiLabel.textContent = t("aiSection");
    aiSec.appendChild(aiLabel);
    const aiRow = (key, text, sub) => {
      const row = buildSwitchRow(text, sub, ctx.state.ai[key], (value) => {
        ctx.state.ai[key] = value;
        if (key === "enabled" && !value) ctx.state.ai.shareContent = false;
        ctx.ai.updateSettings(ctx.state.ai);
        ctx.persistSoon();
      });
      aiSec.appendChild(row);
      return row.querySelector(".xlc-switch");
    };
    const aiEnabledBox = aiRow("enabled", t("aiEnabled"), t("aiEnabledSub"));
    const aiShareBox = aiRow("shareContent", t("aiShareContent"), t("aiShareContentSub"));
    const syncAiShare = () => {
      aiShareBox.disabled = !aiEnabledBox.checked;
      if (!aiEnabledBox.checked) {
        aiShareBox.checked = false;
        ctx.state.ai.shareContent = false;
      }
    };
    const dirtyShare = !aiEnabledBox.checked && ctx.state.ai.shareContent;
    syncAiShare();
    aiEnabledBox.addEventListener("change", syncAiShare);
    if (dirtyShare) ctx.persistSoon();
    const ctLabel = document.createElement("span");
    ctLabel.className = "xlc-form-label";
    ctLabel.style.marginTop = "6px";
    ctLabel.textContent = t("customTransformSection");
    aiSec.appendChild(ctLabel);
    const ctList = document.createElement("div");
    ctList.className = "xlc-ct-list";
    aiSec.appendChild(ctList);
    const persistCt = () => {
      ctx.ai.updateSettings(ctx.state.ai);
      ctx.persistSoon();
    };
    const repaintCt = () => {
      ctList.textContent = "";
      for (const ct of ctx.state.ai.customTransforms) {
        const row = document.createElement("div");
        row.className = "xlc-ct-row";
        const nameInput = document.createElement("input");
        nameInput.className = "b3-text-field xlc-ct-name";
        nameInput.placeholder = t("customTransformName");
        nameInput.setAttribute("aria-label", t("customTransformName"));
        nameInput.value = ct.name;
        nameInput.maxLength = 20;
        nameInput.addEventListener("change", () => {
          ct.name = nameInput.value.trim().slice(0, 20);
          persistCt();
        });
        row.appendChild(nameInput);
        const promptInput = document.createElement("input");
        promptInput.className = "b3-text-field xlc-ct-prompt";
        promptInput.placeholder = t("customTransformPrompt");
        promptInput.setAttribute("aria-label", t("customTransformPrompt"));
        promptInput.value = ct.prompt;
        promptInput.maxLength = 500;
        promptInput.addEventListener("change", () => {
          ct.prompt = promptInput.value.trim().slice(0, 500);
          persistCt();
        });
        row.appendChild(promptInput);
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "b3-button xlc-btn-ghost xlc-ct-del";
        delBtn.textContent = t("delete");
        delBtn.addEventListener("click", () => {
          (0, import_siyuan3.confirm)(t("delete") + " \xB7 " + t("customTransformSection"), t("ctDeleteConfirm", ct.name), () => {
            ctx.state.ai.customTransforms = ctx.state.ai.customTransforms.filter((c) => c.id !== ct.id);
            persistCt();
            repaintCt();
            ctx.notify("info", t("ctDeleted", ct.name));
          });
        });
        row.appendChild(delBtn);
        ctList.appendChild(row);
      }
      if (ctx.state.ai.customTransforms.length === 0) {
        const empty = document.createElement("div");
        empty.className = "xlc-form-hint";
        empty.textContent = t("customTransformEmpty");
        ctList.appendChild(empty);
      }
    };
    repaintCt();
    const addCtBtn = document.createElement("button");
    addCtBtn.type = "button";
    addCtBtn.className = "b3-button";
    addCtBtn.style.alignSelf = "flex-start";
    addCtBtn.textContent = t("customTransformAdd");
    addCtBtn.addEventListener("click", () => {
      var _a;
      if (ctx.state.ai.customTransforms.length >= 10) {
        ctx.notify("error", t("customTransformCap"));
        return;
      }
      const id = `xltf-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      ctx.state.ai.customTransforms = [...ctx.state.ai.customTransforms, { id, name: t("customTransformNewName"), prompt: "" }];
      persistCt();
      repaintCt();
      (_a = ctList.querySelector(".xlc-ct-row:last-child .xlc-ct-name")) == null ? void 0 : _a.focus();
    });
    aiSec.appendChild(addCtBtn);
    const ctHint = document.createElement("span");
    ctHint.className = "xlc-form-hint";
    ctHint.textContent = t("customTransformHint");
    aiSec.appendChild(ctHint);
    const packRow = document.createElement("div");
    packRow.className = "xlc-setting-row";
    const packText = document.createElement("span");
    packText.className = "xlc-setting-text";
    packText.textContent = t("promptPackHint");
    packRow.appendChild(packText);
    const packBtn = document.createElement("button");
    packBtn.type = "button";
    packBtn.className = "b3-button";
    packBtn.textContent = t("promptPackBtn");
    packBtn.addEventListener("click", () => {
      const parsed = parseMarkdownPack(PROMPT_PACK_MD);
      if (parsed.items.length === 0) {
        ctx.notify("error", t("importFailed", t("importReasonPackEmpty")));
        return;
      }
      openImportPolicyDialog(ctx, { items: parsed.items, pack: parsed.pack }, parsed.issues, { kind: "markdown-pack", items: parsed.items });
    });
    packRow.appendChild(packBtn);
    aiSec.appendChild(packRow);
    root.appendChild(aiSec);
  }
  function buildSearchSection(ctx, root) {
    const t = ctx.t;
    let pinyinSeq = 0;
    const searchSec = document.createElement("div");
    searchSec.className = "xlc-form-field xlc-card";
    const searchLabel = document.createElement("span");
    searchLabel.className = "xlc-form-label";
    searchLabel.textContent = t("searchSection");
    searchSec.appendChild(searchLabel);
    const pinyinRow = buildSwitchRow(t("pinyinToggle"), t("pinyinToggleSub"), ctx.state.search.pinyin, (value) => {
      const mySeq = ++pinyinSeq;
      ctx.state.search.pinyin = value;
      ctx.applyPinyinAdapter();
      ctx.persistSoon();
      void ctx.library.reindex().then((idx) => {
        if (mySeq !== pinyinSeq) return;
        ctx.notify("info", t("reindexDone", String(idx.entries.length)));
      }).catch((err) => {
        if (mySeq !== pinyinSeq) return;
        ctx.notify("error", t("kernelError", err.message));
      });
    });
    searchSec.appendChild(pinyinRow);
    const phRow = buildSwitchRow(t("placeholdersToggle"), t("placeholdersToggleSub"), ctx.state.search.placeholders, (value) => {
      ctx.state.search.placeholders = value;
      ctx.persistSoon();
    });
    searchSec.appendChild(phRow);
    root.appendChild(searchSec);
  }
  function buildDataSection(ctx, root) {
    const t = ctx.t;
    const dataSec = document.createElement("div");
    dataSec.className = "xlc-form-field xlc-card";
    const dataLabel = document.createElement("span");
    dataLabel.className = "xlc-form-label";
    dataLabel.textContent = t("dataSection");
    dataSec.appendChild(dataLabel);
    const libRow = document.createElement("div");
    libRow.className = "xlc-form-hint";
    const cfg = ctx.getConfig();
    libRow.textContent = `${t("librarySection")}\uFF1A${cfg ? cfg.mode === "notebook" ? t("libModeNotebook", String(cfg.notebookIds.length)) : t("libModeDoc", String(cfg.containerDocIds.length)) : t("libraryNone")}`;
    dataSec.appendChild(libRow);
    const dataBtns = document.createElement("div");
    dataBtns.style.display = "flex";
    dataBtns.style.gap = "8px";
    dataBtns.style.flexWrap = "wrap";
    const mkBtn = (label, onClick) => {
      const btn = document.createElement("button");
      btn.className = "b3-button";
      btn.textContent = label;
      if (onClick) btn.addEventListener("click", onClick);
      dataBtns.appendChild(btn);
      return btn;
    };
    const withFlight = (btn, run, flightLabel) => {
      btn.addEventListener("click", () => {
        var _a;
        if (btn.disabled) return;
        btn.disabled = true;
        const original = (_a = btn.textContent) != null ? _a : "";
        if (flightLabel) btn.textContent = flightLabel;
        void Promise.resolve().then(run).catch(() => void 0).finally(() => {
          btn.disabled = false;
          if (flightLabel) btn.textContent = original;
        });
      });
    };
    const reindexBtn = mkBtn(t("reindexBtn"), () => {
      reindexBtn.disabled = true;
      reindexBtn.textContent = t("indexing");
      void ctx.library.reindex().then((idx) => {
        ctx.notify("info", idx.truncated ? t("reindexTruncated", String(LIMITS.maxItems)) : t("reindexDone", String(idx.entries.length)));
      }).catch((err) => {
        ctx.notify("error", t("kernelError", err.message));
      }).finally(() => {
        reindexBtn.disabled = false;
        reindexBtn.textContent = t("reindexBtn");
      });
    });
    mkBtn(t("clearRecents"), () => {
      (0, import_siyuan3.confirm)("\u26A0\uFE0F " + t("clearRecents"), t("clearRecentsConfirm"), () => {
        ctx.state.recents = [];
        ctx.persistSoon();
        ctx.notify("info", t("clearRecentsDone"));
      });
    });
    if (ctx.state.ai.enabled) {
      const auditBtn = mkBtn("\u2726 " + t("tagAuditBtn"));
      withFlight(auditBtn, async () => {
        await runTagAudit(ctx).catch((err) => {
          ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
        });
      }, "\u2726 " + t("aiWorking"));
    }
    const exportBtn = mkBtn(t("exportBtn"));
    withFlight(exportBtn, async () => {
      try {
        const json = await ctx.exportBundle();
        const count = JSON.parse(json).items.length;
        if (count === 0) {
          ctx.notify("error", t("emptyLibrary"));
          return;
        }
        const blob = new Blob([json], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `xiaolv-common-export-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
        ctx.notify("info", t("exportDone", String(count)));
      } catch (err) {
        ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
      }
    }, t("indexing"));
    const packBtn = mkBtn(t("packBtn"));
    withFlight(packBtn, async () => {
      try {
        await openPackExportDialog(ctx);
      } catch (err) {
        ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
      }
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
          ctx.notify("error", t("importFailed", t("importReasonTooLarge")));
          return;
        }
        void file.text().then((text) => {
          var _a2;
          const isMd = /\.md$/i.test(file.name);
          if (isMd) {
            const parsed = parseMarkdownPack(text);
            if (parsed.items.length === 0) {
              ctx.notify("error", t("importFailed", t("importReasonNoMeta")));
              return;
            }
            openImportPolicyDialog(ctx, { items: parsed.items, pack: parsed.pack }, parsed.issues, { kind: "markdown-pack", items: parsed.items });
            return;
          }
          const validation = validateImport(text);
          if (!validation.ok || !validation.parsed) {
            ctx.notify("error", t("importFailed", (_a2 = validation.reason) != null ? _a2 : t("importReasonUnknown")));
            return;
          }
          openImportPolicyDialog(ctx, validation.parsed, validation.issues, { kind: "json", text });
        }).catch((err) => {
          ctx.notify("error", t("importFailed", err instanceof Error ? err.message : String(err)));
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
    let idx;
    try {
      idx = await ctx.library.ensureIndex();
    } catch (err) {
      ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
      return;
    }
    const tags = collectTags(idx.entries);
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
    const dialog = new import_siyuan3.Dialog({
      title: t("tagAuditTitle"),
      content: "",
      width: "min(520px, 92vw)",
      height: "min(520px, 84vh)"
      // 固定高：建议清单增长不顶跳（R146）
    });
    const body = getDialogBody(dialog.element);
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
    const dialog = new import_siyuan3.Dialog({
      title: t("importPolicyTitle"),
      content: "",
      width: "min(440px, 92vw)",
      height: "min(560px, 86vh)"
      // 固定高：策略卡片高度稳定（R146）
    });
    const body = getDialogBody(dialog.element);
    if (!body) return;
    body.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "xlc-form";
    const meta = document.createElement("div");
    meta.className = "xlc-import-meta";
    const metaCount = document.createElement("span");
    metaCount.className = "xlc-badge xlc-badge--markdown";
    metaCount.textContent = t("itemCountBadge", String(parsed.items.length));
    meta.appendChild(metaCount);
    if (issues.length > 0) {
      const metaInvalid = document.createElement("span");
      metaInvalid.className = "xlc-badge xlc-badge--warn";
      metaInvalid.textContent = t("invalidSkipBadge", String(issues.length));
      meta.appendChild(metaInvalid);
    }
    if (parsed.pack) {
      const metaPack = document.createElement("span");
      metaPack.className = "xlc-badge xlc-badge--var";
      metaPack.textContent = `${parsed.pack.name} \xB7 ${t("packVarsBadge", String(parsed.pack.vars.length))}`;
      meta.appendChild(metaPack);
    }
    wrap.appendChild(meta);
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
        ctx.notify("error", t("importRunFailed", err.message));
      });
    };
    const policyList = document.createElement("div");
    policyList.className = "xlc-policy-list";
    for (const [policy, title, desc, recommended] of [
      ["skip", t("importPolicySkip"), t("importPolicySkipDesc"), false],
      ["overwrite", t("importPolicyOverwrite"), t("importPolicyOverwriteDesc"), false],
      ["rename", t("importPolicyRename"), t("importPolicyRenameDesc"), true]
    ]) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "xlc-policy" + (recommended ? " xlc-policy--recommended" : "");
      const icon = document.createElement("span");
      icon.className = "xlc-policy-ic";
      icon.textContent = policy === "skip" ? "\u25CB" : policy === "overwrite" ? "\u21C4" : "\uFF0B";
      card.appendChild(icon);
      const text = document.createElement("span");
      const titleEl = document.createElement("span");
      titleEl.className = "xlc-policy-title";
      titleEl.textContent = title + (recommended ? `\uFF08${t("recommended")}\uFF09` : "");
      text.appendChild(titleEl);
      const descEl = document.createElement("span");
      descEl.className = "xlc-policy-desc";
      descEl.textContent = desc;
      text.appendChild(descEl);
      card.appendChild(text);
      card.addEventListener("click", () => run(policy));
      policyList.appendChild(card);
    }
    wrap.appendChild(policyList);
    const receiptHint = document.createElement("p");
    receiptHint.className = "xlc-form-hint";
    receiptHint.textContent = t("importReceiptHint");
    wrap.appendChild(receiptHint);
    body.appendChild(wrap);
  }

  // src/ui/capture.ts
  var import_siyuan4 = __toESM(require_stub_dom());
  function isBlockRefTarget(blockId) {
    return /^\d{14}-[0-9a-z]{7}$/.test(blockId);
  }
  var TOAST_TITLE_MAX = 48;
  var shortTitle = (title) => title.length > TOAST_TITLE_MAX ? `${title.slice(0, TOAST_TITLE_MAX)}\u2026` : title;
  function classifyLinkTarget(href) {
    const h = (href != null ? href : "").trim();
    if (isSafeHttpUrl(h)) return { kind: "url", value: h };
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
      /** 快速捕获并发锁（⌥⇧V 连按防重入） */
      this.quickCapturing = false;
    }
    /** 保存当前选区（命令/顶栏入口） */
    async saveSelection() {
      const sel = this.deps.getSelectionText();
      const text = sel.text.trim();
      if (!text) {
        void this.captureFromClipboard();
        return;
      }
      this.openForm(text.slice(0, 1e5), inferTypeFromText(text), sel.blockId);
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
    /** 快速捕获剪贴板（F8）：无表单一步入库——类型推断 + 首行作标题；
     *  同文已存在则诚实提示不重复写入（不打断）；⌥⇧V 连按防重入。 */
    async quickCaptureFromClipboard() {
      if (this.quickCapturing) return;
      this.quickCapturing = true;
      try {
        await this.doQuickCapture();
      } finally {
        this.quickCapturing = false;
      }
    }
    async doQuickCapture() {
      var _a;
      let text = "";
      try {
        text = (await this.deps.readClipboardText()).trim();
      } catch {
        text = "";
      }
      if (!text) {
        this.deps.notify("error", this.deps.t("clipboardReadFailed"));
        return;
      }
      const content = text.slice(0, 1e5);
      let dup;
      try {
        dup = await this.deps.findDuplicate(content);
      } catch (err) {
        this.deps.notify("error", this.deps.t("kernelError", err instanceof Error ? err.message : String(err)));
        return;
      }
      if (dup) {
        this.deps.notify("info", this.deps.t("quickCaptureDuplicate", shortTitle(dup.title)));
        return;
      }
      const firstLine = (_a = content.split(/\r?\n/).map((line) => line.trim()).find(Boolean)) != null ? _a : content;
      let created;
      try {
        created = await this.deps.createItem({
          itemType: inferTypeFromText(content),
          markdown: content,
          title: firstLine.slice(0, 512)
        });
      } catch (err) {
        this.deps.notify("error", this.deps.t("kernelError", err instanceof Error ? err.message : String(err)));
        return;
      }
      if (created.ok) {
      } else {
        this.deps.notify("error", created.message);
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
        docId: (_a = this.deps.currentDocId()) != null ? _a : void 0,
        sourceType: "block"
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
      this.openForm(`![](${target.value})`, "image", null, { title, docId: (_a = this.deps.currentDocId()) != null ? _a : void 0, sourceType: "resource" });
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
        this.openForm(target.value, "url", null, { title: (text || target.value).slice(0, 120), docId: (_a = this.deps.currentDocId()) != null ? _a : void 0, sourceType: "resource" });
      } else {
        this.openForm(`[${text || this.deps.t("resourceFallback")}](${target.value})`, "asset", null, { title: (text || target.value).slice(0, 120), docId: (_b = this.deps.currentDocId()) != null ? _b : void 0, sourceType: "resource" });
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
        this.deps.notify("error", this.deps.t("captureBlockFailed"));
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
        this.deps.notify("error", this.deps.t("captureDocFailed"));
        return;
      }
      const title = (_a = doc.hPath.split("/").filter(Boolean).pop()) != null ? _a : doc.hPath;
      this.openForm(doc.content.slice(0, 1e5), "markdown", null, { title, docId, sourceType: "doc-fragment" });
    }
    openForm(defaultText, defaultType, sourceBlockId, overrides) {
      var _a;
      const t = this.deps.t;
      let closed = false;
      let saving = false;
      let tidySeq = 0;
      const dialog = new import_siyuan4.Dialog({
        title: t("newItem"),
        content: "",
        width: "min(460px, 92vw)",
        height: "auto",
        destroyCallback: () => {
          closed = true;
          ++tidySeq;
        }
      });
      const body = getDialogBody(dialog.element);
      if (!body) return;
      body.innerHTML = "";
      const form = document.createElement("div");
      form.className = "xlc-form";
      const field = (label, value, isArea, cls, parent) => {
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
        (parent != null ? parent : form).appendChild(wrap);
        return inputEl;
      };
      const metaRow = document.createElement("div");
      metaRow.className = "xlc-form-row";
      const typeWrap = document.createElement("label");
      typeWrap.className = "xlc-form-field xlc-form-field--fixed";
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
      metaRow.appendChild(typeWrap);
      const contentEl = field(t("contentLabel"), defaultText, true, "xlc-form-content");
      const varbar = buildVariableBar(t, () => contentEl);
      contentEl.parentElement.after(varbar);
      const titleEl = field(t("title"), (_a = overrides == null ? void 0 : overrides.title) != null ? _a : "", false, "xlc-form-title");
      form.appendChild(metaRow);
      const aliasEl = field(t("alias"), "", false, "xlc-form-alias", metaRow);
      const tagRow = document.createElement("div");
      tagRow.className = "xlc-form-row";
      const tagsEl = field(t("tags"), "", false, "xlc-form-tags", tagRow);
      const tagsHint = document.createElement("span");
      tagsHint.className = "xlc-form-hint";
      tagsHint.textContent = t("tagsHint");
      tagsEl.parentElement.appendChild(tagsHint);
      const categoryEl = field(t("category"), "", false, "xlc-form-category", tagRow);
      categoryEl.parentElement.classList.add("xlc-form-field--fixed");
      form.appendChild(tagRow);
      const hint = document.createElement("div");
      hint.className = "xlc-form-hint";
      hint.textContent = t("captureHint");
      form.appendChild(hint);
      if (this.deps.getLibraryName) {
        void this.deps.getLibraryName().then((name) => {
          if (closed || !name) return;
          hint.textContent = `${t("captureHint")} \xB7 ${t("captureHintLib", name)}`;
        }).catch(() => void 0);
      }
      const flagContentError = () => {
        contentEl.classList.add("xlc-input--error");
        contentEl.focus();
      };
      contentEl.addEventListener("input", () => contentEl.classList.remove("xlc-input--error"));
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
        if (closed || Object.keys(suggestions).length === 0) return;
        if (suggestions.title) titleEl.value = suggestions.title;
        if (suggestions.alias) aliasEl.value = suggestions.alias;
        if ((_a2 = suggestions.tags) == null ? void 0 : _a2.length) tagsEl.value = suggestions.tags.join(", ");
        if (suggestions.category) categoryEl.value = suggestions.category;
        this.deps.notify("info", t("aiApplied"));
      };
      adoptBtn.textContent = t("adoptAll");
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
            if (closed) return;
            const value = contentEl.value.trim();
            if (!value) {
              this.deps.notify("error", t("invalidItem"));
              return;
            }
            const request = ++tidySeq;
            tidyBtn.disabled = true;
            tidyBtn.textContent = t("aiWorking");
            void this.deps.aiTidy(value).then((result) => {
              var _a2, _b;
              if (closed || request !== tidySeq) return;
              tidyBtn.textContent = "\u2726 " + t("aiTidy");
              tidyBtn.disabled = false;
              if (!result.ok) {
                this.deps.notify("error", result.message);
                return;
              }
              suggestions = result;
              sugText.textContent = "";
              const lead = document.createElement("span");
              lead.textContent = "\u2726 " + t("aiSuggestion") + "\uFF1A";
              sugText.appendChild(lead);
              if (result.title) {
                const titleEl2 = document.createElement("b");
                titleEl2.textContent = result.title;
                sugText.appendChild(titleEl2);
              }
              const parts = [
                ((_a2 = result.tags) == null ? void 0 : _a2.length) ? result.tags.join("/") : "",
                (_b = result.category) != null ? _b : ""
              ].filter(Boolean);
              if (parts.length) {
                const tail = document.createElement("span");
                tail.textContent = (result.title ? " \xB7 " : "") + parts.join(" \xB7 ");
                sugText.appendChild(tail);
              }
              sugrow.style.display = "";
            }).catch((err) => {
              if (closed || request !== tidySeq) return;
              tidyBtn.textContent = "\u2726 " + t("aiTidy");
              tidyBtn.disabled = false;
              this.deps.notify("error", err instanceof Error ? err.message : t("aiTransport"));
            });
          });
          contentLabel.appendChild(tidyBtn);
        }
        const draftWrap = document.createElement("div");
        draftWrap.className = "xlc-form-field";
        const draftLabel = document.createElement("span");
        draftLabel.className = "xlc-form-label";
        draftLabel.textContent = t("aiDraft");
        draftWrap.appendChild(draftLabel);
        const draftBtn = document.createElement("button");
        draftBtn.type = "button";
        draftBtn.className = "xlc-form-ai";
        draftBtn.textContent = "\u2726 " + t("aiDraftDesc");
        draftLabel.appendChild(draftBtn);
        const draftInput = document.createElement("input");
        draftInput.className = "b3-text-field";
        draftInput.placeholder = t("aiDraftDesc");
        draftWrap.appendChild(draftInput);
        draftBtn.addEventListener("click", () => {
          if (closed) return;
          const desc = draftInput.value.trim();
          if (!desc) return;
          if (draftBtn.disabled) return;
          draftBtn.disabled = true;
          const request = ++tidySeq;
          draftBtn.textContent = t("aiWorking");
          void this.deps.aiDraft(desc).then((result) => {
            if (closed || request !== tidySeq) return;
            draftBtn.textContent = "\u2726 " + t("aiDraftDesc");
            draftBtn.disabled = false;
            if (!result.ok) {
              this.deps.notify("error", result.message);
              return;
            }
            const contentBox = contentEl;
            if (contentBox.value.trim()) {
              (0, import_siyuan4.confirm)(t("aiDraft"), t("aiDraftOverwrite"), () => {
                contentBox.value = result.text;
                contentBox.dispatchEvent(new Event("input", { bubbles: true }));
              });
              return;
            }
            contentBox.value = result.text;
            contentBox.dispatchEvent(new Event("input", { bubbles: true }));
          }).catch((err) => {
            if (closed || request !== tidySeq) return;
            draftBtn.textContent = "\u2726 " + t("aiDraftDesc");
            draftBtn.disabled = false;
            this.deps.notify("error", err instanceof Error ? err.message : t("aiTransport"));
          });
        });
        form.insertBefore(draftWrap, form.firstChild);
      }
      const actions = document.createElement("div");
      actions.className = "xlc-form-actions";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "b3-button";
      cancelBtn.textContent = t("cancel");
      cancelBtn.addEventListener("click", () => {
        closed = true;
        ++tidySeq;
        dialog.destroy();
      });
      const saveBtn = document.createElement("button");
      saveBtn.className = "b3-button xlc-btn-primary";
      saveBtn.textContent = t("save");
      const submitOnEnter = (el) => {
        el.addEventListener("keydown", (ev) => {
          if (ev.isComposing || ev.keyCode === 229) return;
          if (ev.key === "Enter" && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
            ev.preventDefault();
            saveBtn.click();
          }
        });
      };
      [titleEl, aliasEl, tagsEl, categoryEl].forEach((el) => submitOnEnter(el));
      saveBtn.addEventListener("click", () => {
        if (closed || saving) return;
        const contentValue = contentEl.value;
        if (!contentValue.trim() && !(typeSelect.value === "blockref" && (overrides == null ? void 0 : overrides.targetBlockId))) {
          flagContentError();
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
          var _a2;
          if (closed || saving) return;
          saving = true;
          saveBtn.disabled = true;
          saveBtn.textContent = t("saving");
          cancelBtn.disabled = true;
          const docId = this.deps.currentDocId();
          void this.deps.createItem({
            itemType: type,
            markdown,
            title: titleEl.value || void 0,
            alias: aliasEl.value || void 0,
            tags: tagsEl.value ? tagsEl.value.split(/[,,]/).map((s) => s.trim()).filter(Boolean) : void 0,
            category: categoryEl.value || void 0,
            targetBlockId: overrides == null ? void 0 : overrides.targetBlockId,
            source: docId ? { sourceDocId: docId, sourceBlockId: sourceBlockId != null ? sourceBlockId : void 0, sourceType: (_a2 = overrides == null ? void 0 : overrides.sourceType) != null ? _a2 : sourceBlockId ? "selection" : "manual" } : void 0
          }).then((result) => {
            saving = false;
            if (result.ok) {
              closed = true;
              dialog.destroy();
            } else {
              saveBtn.disabled = false;
              saveBtn.textContent = t("save");
              cancelBtn.disabled = false;
              this.deps.notify("error", result.message);
            }
          }).catch((err) => {
            saving = false;
            if (closed) return;
            saveBtn.disabled = false;
            saveBtn.textContent = t("save");
            cancelBtn.disabled = false;
            this.deps.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
          });
        };
        void this.deps.findDuplicate(contentValue).then((dup) => {
          if (closed || saving) return;
          if (!dup) {
            doSave();
            return;
          }
          (0, import_siyuan4.confirm)("\u26A0\uFE0F " + t("duplicateTitle"), t("duplicateConfirm", dup.title), () => {
            if (!closed) doSave();
          });
        }).catch((err) => {
          if (closed) return;
          this.deps.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
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
    { id: "xlc-demo0000001", blockId: "20240101120000-aaaaaaa", libraryDocId: "20240101120001-hijklmn", itemType: "markdown", title: "\u9879\u76EE\u5EF6\u671F\u9053\u6B49\u4E0E\u8865\u507F\u65B9\u6848", alias: "\u5EF6\u671F\u9053\u6B49", tags: ["\u5BA2\u6237\u6C9F\u901A", "\u6A21\u677F"], category: "\u5BA2\u670D", summary: "\u5C0A\u656C\u7684\u738B\u603B\uFF1A\u5173\u4E8E\u672C\u671F\u4EA4\u4ED8\u5EF6\u671F\u2026\u2026", createdAt: 1, updatedAt: Date.now() - 3 * 864e5, sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120002-bbbbbbb", varCount: 2 },
    { id: "xlc-demo0000002", blockId: "20240101120000-ccccccc", libraryDocId: "20240101120001-hijklmn", itemType: "text", title: "\u5EF6\u671F\u7B80\u77ED\u7248\uFF08IM \u7528\uFF09", alias: "", tags: [], category: "", summary: "\u60A8\u597D\uFF0C\u672C\u6B21\u8FED\u4EE3\u56E0\u8054\u8C03\u8D85\u671F\uFF0C\u4E0A\u7EBF\u63A8\u8FDF 2 \u5929\u2026\u2026", createdAt: 1, updatedAt: Date.now() - 7 * 864e5 },
    { id: "xlc-demo0000003", blockId: "20240101120000-ddddddd", libraryDocId: "20240101120001-hijklmn", itemType: "code", title: "SQL \u5206\u9875\u6A21\u677F", alias: "", tags: ["\u5F00\u53D1"], category: "\u5F00\u53D1", summary: "SELECT * FROM t LIMIT \u2026", createdAt: 1, updatedAt: Date.now() - 7 * 864e5 },
    { id: "xlc-demo0000004", blockId: "20240101120000-eeeeeee", libraryDocId: "20240101120001-hijklmn", itemType: "blockref", title: "\u4EA7\u54C1\u9700\u6C42\u6A21\u677F\uFF08\u5F15\u7528\uFF09", alias: "", tags: [], category: "", summary: "", createdAt: 1, updatedAt: Date.now() - 30 * 864e5, targetBlockId: "20240101120002-bbbbbbb" },
    { id: "xlc-demo0000005", blockId: "20240101120000-fffffff", libraryDocId: "20240101120001-hijklmn", itemType: "url", title: "SLA \u8D54\u4ED8\u6807\u51C6\u6587\u6863", alias: "", tags: [], category: "", summary: "https://wiki.example.com/sla", createdAt: 1, updatedAt: Date.now() - 1 * 864e5, url: "https://wiki.example.com/sla" }
  ];
  var PREVIEWS = {
    "xlc-demo0000001": "\u5C0A\u656C\u7684 {{xlc:ask:\u5BA2\u6237\u540D\u79F0}}\uFF1A\n\n\u5173\u4E8E\u672C\u671F\u300C\u4F1A\u5458\u7CFB\u7EDF\u300D\u4EA4\u4ED8\u5EF6\u671F\uFF0C\u6211\u4EEC\u6DF1\u8868\u6B49\u610F\u3002\u7ECF\u590D\u76D8\uFF0C\u4E3B\u8981\u539F\u56E0\u4E3A\u7B2C\u4E09\u65B9\u652F\u4ED8\u8054\u8C03\u8D85\u671F\u3002\u76EE\u524D\u8054\u8C03\u5DF2\u5B8C\u6210 92%\uFF0C\u9884\u8BA1\u63A8\u8FDF 2 \u4E2A\u5DE5\u4F5C\u65E5\u4E0A\u7EBF\u3002\n\n\u4E3A\u5F25\u8865\u5F71\u54CD\uFF0C\u6211\u4EEC\u63D0\u4F9B\u4EE5\u4E0B\u8865\u507F\uFF1A\n1. \u672C\u671F\u670D\u52A1\u8D39\u51CF\u514D {{xlc:ask:\u8865\u507F\u6BD4\u4F8B|5%,10%}}\uFF1B\n2. \u4E0A\u7EBF\u540E 48 \u5C0F\u65F6\u4E13\u5C5E\u503C\u5B88\uFF1B\n3. \u4E0B\u671F\u8FED\u4EE3\u4F18\u5148\u6392\u5165\u8D35\u65B9\u9700\u6C42\u3002\n\n\u518D\u6B21\u611F\u8C22\u7406\u89E3\u4E0E\u652F\u6301\uFF0C\u6709\u4EFB\u4F55\u95EE\u9898\u968F\u65F6\u8054\u7CFB\u6211\u3002{{xlc:cursor}}",
    "xlc-demo0000002": "\u60A8\u597D\uFF0C\u672C\u6B21\u8FED\u4EE3\u56E0\u8054\u8C03\u8D85\u671F\uFF0C\u4E0A\u7EBF\u63A8\u8FDF 2 \u5929\u3002\u7ED9\u60A8\u5E26\u6765\u4E0D\u4FBF\u6DF1\u8868\u6B49\u610F\uFF0C\u6709\u95EE\u9898\u968F\u65F6\u627E\u6211\u3002",
    "xlc-demo0000003": "```sql\nSELECT * FROM articles\nWHERE status = 'published'\nORDER BY updated_at DESC\nLIMIT 20 OFFSET 40;\n```",
    "xlc-demo0000004": "\uFF08\u5F15\u7528\u8BED\u6CD5\u9884\u89C8\uFF09((20240101120002-bbbbbbb '\u4EA7\u54C1\u9700\u6C42\u6A21\u677F'))",
    "xlc-demo0000005": "https://wiki.example.com/sla"
  };
  var T = (key, ...args) => {
    var _a;
    const map = {
      pluginName: "\u5C0F\u9A74\u5E38\u7528\uFF08\u5185\u6D4B\u7248\uFF09",
      searchPlaceholder: "\u641C\u7D22\u5E38\u7528\u5185\u5BB9\uFF08? \u524D\u7F00 = AI \u8BED\u4E49\u641C\u7D22\uFF09",
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
      aiFound: "AI \u547D\u4E2D",
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
      saving: "\u4FDD\u5B58\u4E2D\u2026",
      cancel: "\u53D6\u6D88",
      confirm: "\u786E\u5B9A",
      invalidItem: "\u6761\u76EE\u6570\u636E\u65E0\u6548",
      aiTidy: "AI \u6574\u7406",
      aiDraft: "AI \u8349\u7A3F",
      aiDraftDesc: "\u63CF\u8FF0\u4F60\u60F3\u8981\u7684\u5185\u5BB9\uFF0CAI \u751F\u6210\u8349\u7A3F",
      aiApplied: "\u5DF2\u5E94\u7528 AI \u5EFA\u8BAE",
      aiTransform: "AI \u53D8\u6362",
      saved: "\u5DF2\u4FDD\u5B58\uFF1A%s",
      dataTruth: "\u601D\u6E90\u5757\u771F\u6E90 \xB7 \u5931\u6548\u53EF\u89C1",
      adoptAll: "\u5168\u90E8\u91C7\u7EB3",
      actionsNoun: "\u52A8\u4F5C",
      semanticSuggestion: "\u6CA1\u6709\u672C\u5730\u7ED3\u679C\u3002\u8BD5\u8BD5 AI \u8BED\u4E49\u641C\u7D22\uFF1A\u5728\u5173\u952E\u8BCD\u524D\u52A0 ?",
      aiSemanticHint: "\u8F93\u5165 ? \u52A0\u63CF\u8FF0\uFF0C\u5982\u300C?\u7ED9\u5BA2\u6237\u7684\u9053\u6B49\u56DE\u590D\u300D\uFF0CAI \u5728\u5143\u6570\u636E\u4E2D\u627E\u6700\u76F8\u5173\u6761\u76EE",
      varCountBadge: "%s \u53D8\u91CF",
      paneVarsLabel: "\u63D2\u5165\u65F6\u5C06\u8BE2\u95EE %s \u4E2A\u53D8\u91CF\uFF1A",
      insertVariable: "\u63D2\u5165\u53D8\u91CF\uFF1A",
      varFormTitle: "\u586B\u5199\u53D8\u91CF",
      varFormSub: "\u672C\u6761\u76EE\u542B %s \u4E2A\u53D8\u91CF\uFF0C\u586B\u5199\u540E\u4E00\u6B21\u6027\u63D2\u5165\uFF1B\u586B\u5199\u503C\u4EC5\u7528\u4E8E\u672C\u6B21\uFF0C\u4E0D\u56DE\u5199\u5E93\u3002",
      varFormHint: "Tab \u4E0B\u4E00\u9879 \xB7 Enter \u63D2\u5165",
      groupPinned: "\u7F6E\u9876",
      groupAll: "\u5168\u90E8",
      groupUncategorized: "\u65E0\u5206\u7C7B",
      insertSection: "\u53D8\u91CF\u4E0E\u63D2\u5165",
      promptVariablesToggle: "\u63D2\u5165\u524D\u8BE2\u95EE\u53D8\u91CF",
      promptVariablesSub: "\u542B {{xlc:ask:\u2026}} \u7684\u6761\u76EE\u63D2\u5165\u524D\u5F39\u51FA\u586B\u5145\u5361\u7247",
      recordUsageToggle: "\u8BB0\u5F55\u4F7F\u7528\u6B21\u6570",
      recordUsageSub: "\u4EC5\u672C\u5730\u5B58\u50A8\uFF0C\u53EF\u4E00\u952E\u6E05\u9664\uFF1B\u7528\u4E8E\u300C\u5E38\u7528\u300D\u6392\u5E8F",
      usageStatsHint: "\u4F7F\u7528\u7EDF\u8BA1\u4EC5\u4FDD\u5B58\u5728\u672C\u673A",
      clearUsageBtn: "\u6E05\u7A7A\u4F7F\u7528\u7EDF\u8BA1",
      clearUsageConfirm: "\u6E05\u7A7A\u5168\u90E8\u4F7F\u7528\u8BA1\u6570\uFF1F",
      clearUsageDone: "\u5DF2\u6E05\u7A7A\u4F7F\u7528\u7EDF\u8BA1",
      importPolicySkipDesc: "\u540C\u540D\u540C\u6E90\u6761\u76EE\u4E0D\u52A8\uFF0C\u4EC5\u65B0\u589E\u7F3A\u5931\u9879",
      importPolicyOverwriteDesc: "\u4EE5\u5BFC\u5165\u5185\u5BB9\u66F4\u65B0\u73B0\u6709\u6761\u76EE\uFF08\u539F\u6587\u5757\u88AB\u6539\u5199\uFF09",
      importPolicyRenameDesc: "\u5BFC\u5165\u9879\u52A0\u300C\u5BFC\u5165\u300D\u540E\u7F00\uFF0C\u73B0\u6709\u6761\u76EE\u4E0D\u53D7\u5F71\u54CD",
      recommended: "\u63A8\u8350",
      importReceiptHint: "\u5BFC\u5165\u5B8C\u6210\u5C06\u9010\u9879\u56DE\u6267\uFF1A\u65B0\u589E / \u8DF3\u8FC7 / \u8986\u76D6 / \u6539\u540D / \u5931\u8D25",
      importPolicyTitle: "\u9009\u62E9\u91CD\u590D\u5904\u7406\u7B56\u7565",
      importPolicySkip: "\u8DF3\u8FC7\u91CD\u590D\uFF08\u4FDD\u7559\u73B0\u6709\uFF09",
      importPolicyOverwrite: "\u8986\u76D6\u91CD\u590D",
      importPolicyRename: "\u91CD\u540D\u5E76\u5B58",
      importPreview: "\u6587\u4EF6\u5305\u542B %s \u4E2A\u6761\u76EE\uFF0C%s \u6761\u683C\u5F0F\u65E0\u6548\u5C06\u88AB\u8DF3\u8FC7\u3002\u9009\u62E9\u91CD\u590D\u5904\u7406\u7B56\u7565\uFF1A",
      itemCountBadge: "%s \u6761\u76EE",
      invalidSkipBadge: "%s \u6761\u683C\u5F0F\u65E0\u6548\u5C06\u8DF3\u8FC7",
      cursorHint: "\u5149\u6807\u843D\u70B9",
      setupModeLabel: "\u5E93\u65B9\u5F0F",
      setupStep1: "\u7B2C 1 \u6B65 \xB7 \u9009\u62E9\u5E93\u65B9\u5F0F",
      setupStep2: "\u7B2C 2 \u6B65 \xB7 \u786E\u8BA4\u843D\u70B9",
      setupNext: "\u4E0B\u4E00\u6B65\uFF1A\u786E\u8BA4",
      setupBack: "\u4E0A\u4E00\u6B65",
      setupFinish: "\u5B8C\u6210\u8BBE\u7F6E",
      setupLater: "\u7A0D\u540E\u518D\u8BF4",
      setupConfirmHint: "\u521B\u5EFA\u52A8\u4F5C\u6709\u660E\u786E confirm \u63D0\u793A \xB7 \u4E0D\u52A8\u4F60\u5DF2\u6709\u7684\u4EFB\u4F55\u6587\u6863\uFF1B\u4E4B\u540E\u53EF\u5728 \u8BBE\u7F6E \u2192 \u5F53\u524D\u5185\u5BB9\u5E93 \u66F4\u6539\u3002",
      setupSummaryDoc: "\u6761\u76EE\u5C06\u4EE5\u771F\u5B9E\u5757\u4FDD\u5B58\u4E8E\u6B64\u6587\u6863",
      setupSummaryNotebook: "\u6574\u4E2A\u7B14\u8BB0\u672C\u4F5C\u4E3A\u5185\u5BB9\u5E93",
      create: "\u521B\u5EFA",
      useCount: "%s \u6B21",
      quickNew: "\uFF0B \u65B0\u5EFA",
      quickInsertSelected: "\u63D2\u5165\u9009\u4E2D",
      packBtn: "\u6A21\u677F\u5305",
      packExportTitle: "\u5BFC\u51FA \xB7 \u6A21\u677F\u5305",
      packCategoryLabel: "\u5206\u7C7B",
      allCategories: "\u5168\u90E8\u5206\u7C7B",
      packNameLabel: "\u5305\u540D\u79F0",
      packNameDefault: "\u5C0F\u9A74\u5E38\u7528\uFF08\u5185\u6D4B\u7248\uFF09\u6A21\u677F\u5305",
      packExportBtn: "\u5BFC\u51FA .md \u5305",
      packVarsBadge: "%s \u6761\u542B\u53D8\u91CF",
      packContentsHint: "\xB7 \u6761\u76EE Markdown + \u5143\u6570\u636E\uFF08\u6807\u9898/\u6807\u7B7E/\u5206\u7C7B\uFF09\n\xB7 \u53D8\u91CF\u6E05\u5355\uFF08{{xlc:ask:\u2026}} \u5B57\u6BB5\u4E0E\u9009\u9879\uFF09\n\xB7 \u8D44\u6E90\u5F15\u7528\uFF08assets \u539F\u6837\u6253\u5305\uFF09",
      packTrustHint: "\u4ED6\u4EBA\u5BFC\u5165\u540E\u5373\u4E3A\u771F\u5B9E\u601D\u6E90\u5757\uFF0C\u53EF\u7EE7\u7EED\u7F16\u8F91\u4E0E\u518D\u5206\u4EAB\u2014\u2014\u5206\u4EAB\u7684\u662F\u300C\u6D3B\u7684\u5757\u300D\uFF0C\u4E0D\u662F\u6587\u672C\u5FEB\u7167\u3002",
      emptyFavorites: "\u8FD8\u6CA1\u6709\u6536\u85CF\u7684\u6761\u76EE",
      emptyFavoritesSub: "\u70B9\u51FB\u6761\u76EE\u53F3\u4FA7 \u2606 \u4E00\u952E\u6536\u85CF\uFF0C\u6536\u85CF\u4F1A\u7F6E\u9876\u663E\u793A",
      emptyRecent: "\u6682\u65E0\u6700\u8FD1\u4F7F\u7528\u7684\u6761\u76EE",
      "sort.manual": "\u624B\u52A8/\u7F6E\u9876",
      "sort.recent": "\u6700\u8FD1\u4F7F\u7528",
      "sort.title": "\u6807\u9898",
      "sort.frequent": "\u5E38\u7528",
      sort: "\u6392\u5E8F",
      totalItems: "\u5171 %s \u6761",
      duplicateItem: "\u521B\u5EFA\u526F\u672C",
      insertToDoc: "\u63D2\u5165\u5230\u6307\u5B9A\u6587\u6863",
      insertToDocPick: "\u9009\u62E9\u76EE\u6807\u6587\u6863\uFF08\u8F93\u5165\u5173\u952E\u8BCD\u641C\u7D22\uFF09",
      duplicateTitle: "\u5DF2\u5B58\u5728\u540C\u6587\u6761\u76EE",
      duplicateConfirm: "\u5DF2\u5B58\u5728\u300C%s\u300D\uFF0C\u4ECD\u8981\u4FDD\u5B58\u5417\uFF1F\u4E24\u6761\u5185\u5BB9\u5E76\u5B58\u3001\u4E92\u4E0D\u5F71\u54CD\u3002",
      insertTargetBanner: "\u63D2\u5165\u5230\uFF1A%s",
      aiInsertTransformed: "\u63D2\u5165\u53D8\u6362\u7ED3\u679C",
      aiCopyTransformed: "\u590D\u5236\u53D8\u6362\u7ED3\u679C",
      aiInsertOriginal: "\u63D2\u5165\u539F\u6587",
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
      aiEnabledSub: "\u4F7F\u7528\u601D\u6E90 \u8BBE\u7F6E\u2192\u4EBA\u5DE5\u667A\u80FD \u7684\u6A21\u578B\uFF0C\u63D2\u4EF6\u4E0D\u4FDD\u5B58\u5BC6\u94A5",
      aiShareContentSub: "\u6574\u7406/\u53D8\u6362/\u8349\u7A3F\u9700\u8981\uFF1B\u5173\u95ED\u65F6\u4EC5\u5143\u6570\u636E",
      searchSection: "\u641C\u7D22",
      pinyinToggle: "\u62FC\u97F3\u641C\u7D22",
      placeholdersToggle: "\u52A8\u6001\u5360\u4F4D\u7B26",
      placeholdersHint: "\u652F\u6301 {{xlc:date}} \u7B49",
      pinyinToggleSub: "\u5168\u62FC/\u9996\u5B57\u6BCD\u672C\u5730\u5339\u914D",
      placeholdersToggleSub: "\u63D2\u5165\u65F6\u66FF\u6362 {{xlc:date}} \u7B49\u4E3A\u5F53\u524D\u65E5\u671F\u65F6\u95F4",
      aiSuggestion: "AI \u5EFA\u8BAE",
      clearSearch: "\u6E05\u7A7A\u641C\u7D22",
      customTransformSection: "\u81EA\u5B9A\u4E49\u53D8\u6362",
      customTransformAdd: "\uFF0B \u6DFB\u52A0\u81EA\u5B9A\u4E49\u53D8\u6362",
      customTransformName: "\u540D\u79F0",
      customTransformPrompt: "\u53D8\u6362\u6307\u4EE4\uFF0C\u5982\uFF1A\u6539\u5199\u4E3A\u5BA2\u670D\u8BDD\u672F\uFF1A",
      customTransformEmpty: "\u6682\u65E0\u81EA\u5B9A\u4E49\u53D8\u6362",
      customTransformCap: "\u6700\u591A 10 \u4E2A\u81EA\u5B9A\u4E49\u53D8\u6362",
      customTransformNewName: "\u6211\u7684\u53D8\u6362",
      customTransformHint: "\u4E0E\u5185\u7F6E\u53D8\u6362\u5E76\u5217\u51FA\u73B0\u5728\u6761\u76EE\u52A8\u4F5C\u83DC\u5355 \u2726 \u533A\uFF1B\u8BFB\u53D6\u6B63\u6587\u9075\u5FAA\u300C\u5141\u8BB8 AI \u8BFB\u53D6\u5B8C\u6574\u6B63\u6587\u300D\u5F00\u5173",
      quickCapture: "\u5FEB\u901F\u6355\u83B7\u526A\u8D34\u677F\u4E3A\u6761\u76EE",
      quickCaptureDuplicate: "\u5DF2\u5B58\u5728\u540C\u6587\u6761\u76EE\u300C%s\u300D\uFF0C\u672A\u91CD\u590D\u4FDD\u5B58",
      promptPackBtn: "\u5BFC\u5165\u63D0\u793A\u8BCD\u573A\u666F\u5305",
      promptPackHint: "\u5185\u7F6E 10 \u4E2A\u6A21\u677F\uFF1A\u5BA2\u670D\u56DE\u590D / AI \u63D0\u793A\u8BCD / \u7814\u53D1\u5199\u4F5C\uFF1B\u5BFC\u5165\u5F53\u524D\u5E93\u540E\u53EF\u81EA\u7531\u4FEE\u6539",
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
      docPickerEmpty: "\u6CA1\u6709\u5339\u914D\u7684\u6587\u6863",
      captureHint: "\u6761\u76EE\u5C06\u4FDD\u5B58\u4E3A\u771F\u5B9E\u601D\u6E90\u5757 \xB7 \u53D8\u91CF\u5728\u63D2\u5165\u65F6\u8BE2\u95EE",
      captureHintLib: "\u5E93\uFF1A%s",
      docCount: "%s \u4E2A\u6587\u6863",
      emptyLibrary: "\u5185\u5BB9\u5E93\u8FD8\u662F\u7A7A\u7684",
      emptyLibrarySub: "\u4ECE\u9009\u533A\u3001\u526A\u8D34\u677F\u6216\u53F3\u952E\u83DC\u5355\u6355\u83B7\u5E38\u7528\u5185\u5BB9\uFF1B\u4E5F\u53EF\u4EE5\u76F4\u63A5\u65B0\u5EFA\u4E00\u6761",
      updatedAtLabel: "\u66F4\u65B0\u4E8E %s",
      // R138 键集（缺失时 T 回落键名，截图/断言会看到裸键）
      kbdEnter: "\u21A9 \u63D2\u5165",
      kbdCopy: "%s\u21A9 \u590D\u5236",
      kbdAltDirect: "\u23251-9 \u76F4\u8FBE",
      loading: "\u52A0\u8F7D\u4E2D\u2026",
      truncatedHint: "\u6761\u76EE\u8D85\u51FA\u7D22\u5F15\u4E0A\u9650\uFF0C\u5DF2\u622A\u65AD\u663E\u793A\uFF1B\u6570\u636E\u4ECD\u5B89\u5168\u5728\u5E93\u4E2D",
      copyFailed: "\u590D\u5236\u5931\u8D25\uFF1A\u65E0\u6CD5\u5199\u5165\u526A\u8D34\u677F",
      libModeNotebook: "\u7B14\u8BB0\u672C \xD7 %s",
      libModeDoc: "\u6587\u6863\u5E93 \xB7 %s \u4E2A\u6587\u6863",
      setupPickDocTree: "\u9009\u62E9\u73B0\u6709\u6587\u6863\uFF08\u542B\u5B50\u6587\u6863\uFF09",
      ctDeleteConfirm: "\u5220\u9664\u81EA\u5B9A\u4E49\u53D8\u6362\u300C%s\u300D\uFF1F\u8BE5\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002",
      ctDeleted: "\u5DF2\u5220\u9664\u81EA\u5B9A\u4E49\u53D8\u6362\u300C%s\u300D",
      importReasonPackEmpty: "\u5185\u7F6E\u5305\u4E3A\u7A7A",
      importReasonTooLarge: "\u6587\u4EF6\u8D85\u51FA\u5927\u5C0F\u4E0A\u9650",
      importReasonNoMeta: "Markdown \u5305\u7F3A\u5C11\u6761\u76EE\u5143\u6570\u636E",
      importReasonUnknown: "\u672A\u77E5\u539F\u56E0",
      importRunFailed: "\u5BFC\u5165\u5931\u8D25\uFF1A%s\uFF08\u5199\u5165\u53EF\u80FD\u5DF2\u90E8\u5206\u5B8C\u6210\uFF09",
      exportEmpty: "\u5F53\u524D\u7B5B\u9009\u4E0B\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u6761\u76EE",
      resourceFallback: "\u8D44\u6E90",
      captureBlockFailed: "\u8BFB\u53D6\u5F53\u524D\u5757\u5185\u5BB9\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
      captureDocFailed: "\u8BFB\u53D6\u6587\u6863\u5185\u5BB9\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
      aiDraftOverwrite: "\u5185\u5BB9\u6846\u5DF2\u6709\u5185\u5BB9\uFF0C\u7528 AI \u8349\u7A3F\u8986\u76D6\u5417\uFF1F",
      aiParseFailed: "AI \u8FD4\u56DE\u5185\u5BB9\u65E0\u6CD5\u89E3\u6790\uFF0C\u8BF7\u91CD\u8BD5",
      aiContentTooLong: "\u5185\u5BB9\u8D85\u8FC7 %s \u5B57\uFF0C\u8BF7\u7F29\u77ED\u540E\u91CD\u8BD5"
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
      search: async (query) => {
        var _a2, _b;
        const w = window;
        w.__xlcSearchCalls = ((_a2 = w.__xlcSearchCalls) != null ? _a2 : 0) + 1;
        if (overrides.empty) return { entries: [], truncated: false, total: 0 };
        const text = typeof query === "string" ? query : (_b = query == null ? void 0 : query.text) != null ? _b : "";
        const q = text.trim();
        const entries = !q || q.startsWith("?") ? ENTRIES : ENTRIES.filter((e) => {
          var _a3;
          const hay = [e.title, e.alias, e.summary, e.category, ...(_a3 = e.tags) != null ? _a3 : []].join(" ").toLowerCase();
          return hay.includes(q.toLowerCase());
        });
        return { entries, truncated: false, total: 128 };
      },
      getTags: async () => ["\u5BA2\u6237\u6C9F\u901A", "\u6A21\u677F", "\u5F00\u53D1"],
      getCategories: async () => ["\u5BA2\u670D", "\u5F00\u53D1"],
      preview: async (itemId) => {
        var _a2;
        return (_a2 = PREVIEWS[itemId]) != null ? _a2 : "";
      },
      runAction: async (itemId, mode) => {
        var _a2;
        const w = window;
        ((_a2 = w.__xlcActions) != null ? _a2 : w.__xlcActions = []).push({ id: itemId, mode });
        return { ok: true, message: "inserted" };
      },
      runActionWithFills: async (_itemId, _mode, fills) => {
        window.__xlcLastFills = fills;
        return { ok: true, message: "inserted" };
      },
      openSource: async () => ({ ok: true, message: "opened" }),
      editItem: async () => {
      },
      deleteItem: async () => {
      },
      toggleFavorite: () => true,
      isFavorite: (id) => id === "xlc-demo0000001",
      insertRaw: async () => true,
      copyText: async (text) => {
        window.__xlcCopied = text;
        return true;
      },
      getSort: () => "manual",
      setSort: () => {
      },
      searchDocs: async (k) => k ? [{ id: "20240101120001-hijklmn", hPath: "/\u5E38\u7528\u5185\u5BB9\u5E93", name: "\u5E38\u7528\u5185\u5BB9\u5E93" }] : [],
      insertToDoc: async () => true,
      duplicateItem: async () => {
      },
      saveTransformed: async () => {
      },
      getFilters: () => {
        var _a2;
        return (_a2 = overrides.filters) != null ? _a2 : { type: "", tag: "", category: "" };
      },
      getLibraryName: async () => "/\u5E38\u7528\u5185\u5BB9\u5E93",
      setFilters: (filters) => {
        var _a2;
        const w = window;
        ((_a2 = w.__xlcSetFilters) != null ? _a2 : w.__xlcSetFilters = []).push({ ...filters });
      },
      getLastQuery: () => "",
      setLastQuery: () => {
      },
      insertTarget: null,
      openSetup: () => {
      },
      promptVariables: () => true,
      getUsage: () => ({
        "xlc-demo0000001": { count: 32, lastAt: 400 },
        "xlc-demo0000002": { count: 18, lastAt: 300 },
        "xlc-demo0000003": { count: 11, lastAt: 200 },
        "xlc-demo0000005": { count: 4, lastAt: 100 }
      }),
      newItem: () => {
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
      listCustomTransforms: () => [{ id: "xltf-demo00001", name: "\u5BA2\u670D\u8BDD\u672F" }],
      aiTransformCustom: async () => ({ ok: true, text: "\u5BA2\u670D\u8BDD\u672F\u7ED3\u679C\u793A\u4F8B" }),
      aiEnabled: () => aiOn,
      isSourceMissing: (entry) => overrides.missing === true && entry.id === "xlc-demo0000001",
      close: () => {
      },
      isMobile: () => overrides.mobile === true
    };
  }
  window.XlcHarness = {
    openDialog(overrides) {
      var _a;
      const dialog = new CommonSearchDialog(makeDeps(overrides));
      if (overrides == null ? void 0 : overrides.insertTarget) dialog.insertTarget = overrides.insertTarget;
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
          usage: {},
          sort: "manual",
          uiPrefs: { lastTypeFilter: "", lastTagFilter: "", lastCategoryFilter: "" },
          providers: [{ pluginId: "xiaolv-checkin", displayName: "\u5C0F\u9A74\u6253\u5361", protocolVersion: 1, registeredAt: 1 }],
          ai: { enabled: true, shareContent: true, customTransforms: [{ id: "xltf-demo00001", name: "\u5BA2\u670D\u8BDD\u672F", prompt: "\u6539\u5199\u4E3A\u5BA2\u670D\u8BDD\u672F\uFF1A" }] },
          search: { pinyin: true, placeholders: true },
          insert: { promptVariables: true, recordUsage: true }
        },
        getConfig: () => ({ configVersion: 1, mode: "doc", notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1 }),
        library: {
          listNotebooks: async () => ({ ok: true, data: [{ id: "20240101", name: "\u7B14\u8BB0" }] }),
          searchDocs: async (k) => k ? [{ id: "20240101120001-hijklmn", hPath: "/\u5E38\u7528\u5185\u5BB9\u5E93", box: "nb", name: "\u5E38\u7528\u5185\u5BB9\u5E93" }] : [],
          reindex: async () => ({ entries: [], items: /* @__PURE__ */ new Map(), truncated: false, docsScanned: 1, errors: [], builtAt: 1 }),
          ensureIndex: async () => ({
            entries: ENTRIES.map((e) => ({ ...e })),
            items: new Map(ENTRIES.map((e) => [e.id, e])),
            truncated: false,
            docsScanned: 1,
            errors: [],
            builtAt: 1
          }),
          getItemKramdown: async (item) => {
            var _a, _b;
            window.__xlcKdCalls = ((_a = window.__xlcKdCalls) != null ? _a : 0) + 1;
            return { ok: true, data: (_b = PREVIEWS[item.id]) != null ? _b : "\u5185\u5BB9\u793A\u4F8B {{xlc:ask:\u793A\u4F8B\u5B57\u6BB5}}" };
          }
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
        importMarkdownItems: async () => ({ total: 0, created: 0, skipped: 0, overwritten: 0, renamed: 0, failed: 0, lines: [] }),
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
          usage: {},
          sort: "manual",
          uiPrefs: { lastTypeFilter: "", lastTagFilter: "", lastCategoryFilter: "" },
          providers: [],
          ai: { enabled: false, shareContent: false },
          search: { pinyin: true, placeholders: true },
          insert: { promptVariables: true, recordUsage: true }
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
        aiDraft: async (desc) => ({ ok: true, text: "\u8349\u7A3F\uFF08" + desc + "\uFF09" }),
        findDuplicate: async () => null,
        getLibraryName: async () => "/\u5E38\u7528\u5185\u5BB9\u5E93"
      });
      capture.newManual();
    },
    openImport() {
      const ctx = {
        t: T,
        notify: () => {
        },
        importBundleText: async () => ({ total: 18, created: 12, skipped: 4, overwritten: 1, renamed: 1, failed: 0, lines: [] }),
        importMarkdownItems: async () => ({ total: 18, created: 12, skipped: 4, overwritten: 1, renamed: 1, failed: 0, lines: [] })
      };
      const parsed = { items: Array.from({ length: 18 }, (_, i) => ({ id: `xlc-demo${i}`, title: `\u6761\u76EE ${i + 1}` })) };
      const issues = [{ line: 3, reason: "bad shape" }, { line: 7, reason: "bad shape" }, { line: 11, reason: "bad shape" }];
      openImportPolicyDialog(ctx, parsed, issues, { kind: "json", text: "{}" });
    }
  };
})();
