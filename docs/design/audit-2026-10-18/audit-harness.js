"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
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
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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
          container.dataset.disableClose = String(this.options.disableClose === true);
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
          root.__xlcHarnessDestroyDialog = () => this.destroy();
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
          if (this._destroyed) return;
          this._destroyed = true;
          const finish = () => {
            if (this._destroy) this._destroy();
            else {
              if (this.element) this.element.remove();
              if (typeof this.options.destroyCallback === "function") this.options.destroyCallback();
            }
          };
          if (globalThis.__xlcDeferDialogDestroy === true) {
            this.element.dataset.dialogClosing = "true";
            setTimeout(finish, 100);
          } else finish();
        }
      };
      module.exports = {
        Dialog: StubDialog,
        confirm: (_title, _message, callback) => {
          if (globalThis.__xlcAutoConfirm === true && typeof callback === "function") callback();
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

  // node_modules/.pnpm/tiny-pinyin@1.3.2/node_modules/tiny-pinyin/dist/dict.js
  var require_dict = __commonJS({
    "node_modules/.pnpm/tiny-pinyin@1.3.2/node_modules/tiny-pinyin/dist/dict.js"(exports, module) {
      "use strict";
      var UNIHANS = ["\u963F", "\u54CE", "\u5B89", "\u80AE", "\u51F9", "\u516B", "\u6300", "\u6273", "\u90A6", "\u52F9", "\u9642", "\u5954", "\u4F3B", "\u5C44", "\u8FB9", "\u706C", "\u618B", "\u6C43", "\u51AB", "\u7676", "\u5CEC", "\u5693", "\u5072", "\u53C2", "\u4ED3", "\u64A1", "\u518A", "\u5D7E", "\u66FD", "\u53C9", "\u8286", "\u8FBF", "\u4F25", "\u6284", "\u8F66", "\u62BB", "\u9637", "\u5403", "\u5145", "\u62BD", "\u51FA", "\u6B3B", "\u63E3", "\u5DDB", "\u5205", "\u5439", "\u65FE", "\u9034", "\u5472", "\u5306", "\u51D1", "\u7C97", "\u6C46", "\u5D14", "\u90A8", "\u6413", "\u5491", "\u5446", "\u4E39", "\u5F53", "\u5200", "\u561A", "\u6265", "\u706F", "\u6C10", "\u7538", "\u5201", "\u7239", "\u4E01", "\u4E1F", "\u4E1C", "\u543A", "\u53BE", "\u8011", "\u5796", "\u5428", "\u591A", "\u59B8", "\u8BF6", "\u5940", "\u97A5", "\u513F", "\u53D1", "\u5E06", "\u531A", "\u98DE", "\u5206", "\u4E30", "\u8985", "\u4ECF", "\u7D11", "\u592B", "\u65EE", "\u4F85", "\u7518", "\u5188", "\u768B", "\u6208", "\u7ED9", "\u6839", "\u522F", "\u5DE5", "\u52FE", "\u4F30", "\u74DC", "\u4E56", "\u5173", "\u5149", "\u5F52", "\u4E28", "\u5459", "\u54C8", "\u548D", "\u4F44", "\u592F", "\u8320", "\u8BC3", "\u9ED2", "\u62EB", "\u4EA8", "\u5677", "\u53FF", "\u9F41", "\u4E4E", "\u82B1", "\u6000", "\u6B22", "\u5DDF", "\u7070", "\u660F", "\u5419", "\u4E0C", "\u52A0", "\u620B", "\u6C5F", "\u827D", "\u9636", "\u5DFE", "\u5755", "\u5182", "\u4E29", "\u51E5", "\u59E2", "\u5658", "\u519B", "\u5494", "\u5F00", "\u520A", "\u5FFC", "\u5C3B", "\u533C", "\u808E", "\u52A5", "\u7A7A", "\u62A0", "\u625D", "\u5938", "\u84AF", "\u5BBD", "\u5321", "\u4E8F", "\u5764", "\u6269", "\u5783", "\u6765", "\u5170", "\u5577", "\u635E", "\u808B", "\u52D2", "\u5D1A", "\u54E9", "\u4FE9", "\u5941", "\u826F", "\u64A9", "\u6BDF", "\u62CE", "\u4F36", "\u6E9C", "\u56D6", "\u9F99", "\u779C", "\u565C", "\u9A74", "\u5A08", "\u63A0", "\u62A1", "\u7F57", "\u5463", "\u5988", "\u57CB", "\u5ADA", "\u7264", "\u732B", "\u4E48", "\u5445", "\u95E8", "\u753F", "\u54AA", "\u5B80", "\u55B5", "\u4E5C", "\u6C11", "\u540D", "\u8C2C", "\u6478", "\u54DE", "\u6BEA", "\u55EF", "\u62CF", "\u8149", "\u56E1", "\u56D4", "\u5B6C", "\u7592", "\u5A1E", "\u6041", "\u80FD", "\u59AE", "\u62C8", "\u5A18", "\u9E1F", "\u634F", "\u56DC", "\u5B81", "\u599E", "\u519C", "\u7FBA", "\u5974", "\u5973", "\u597B", "\u759F", "\u9EC1", "\u632A", "\u5594", "\u8BB4", "\u5991", "\u62CD", "\u7705", "\u4E53", "\u629B", "\u5478", "\u55B7", "\u5309", "\u4E15", "\u56E8", "\u527D", "\u6C15", "\u59D8", "\u4E52", "\u948B", "\u5256", "\u4EC6", "\u4E03", "\u6390", "\u5343", "\u545B", "\u6084", "\u767F", "\u4EB2", "\u9751", "\u536D", "\u4E18", "\u533A", "\u5CD1", "\u7F3A", "\u590B", "\u5465", "\u7A63", "\u5A06", "\u60F9", "\u4EBA", "\u6254", "\u65E5", "\u8338", "\u53B9", "\u909A", "\u633C", "\u5827", "\u5A51", "\u77A4", "\u637C", "\u4EE8", "\u6BE2", "\u4E09", "\u6852", "\u63BB", "\u95AA", "\u68EE", "\u50E7", "\u6740", "\u7B5B", "\u5C71", "\u4F24", "\u5F30", "\u5962", "\u7533", "\u5347", "\u5C38", "\u53CE", "\u4E66", "\u5237", "\u8870", "\u95E9", "\u53CC", "\u813D", "\u542E", "\u8BF4", "\u53B6", "\u5FEA", "\u635C", "\u82CF", "\u72FB", "\u590A", "\u5B59", "\u5506", "\u4ED6", "\u56FC", "\u574D", "\u6C64", "\u5932", "\u5FD1", "\u71A5", "\u5254", "\u5929", "\u65EB", "\u5E16", "\u5385", "\u56F2", "\u5077", "\u51F8", "\u6E4D", "\u63A8", "\u541E", "\u4E47", "\u7A75", "\u6B6A", "\u5F2F", "\u5C23", "\u5371", "\u6637", "\u7FC1", "\u631D", "\u4E4C", "\u5915", "\u8672", "\u4ED9", "\u4E61", "\u7071", "\u4E9B", "\u5FC3", "\u661F", "\u51F6", "\u4F11", "\u5401", "\u5405", "\u524A", "\u5743", "\u4E2B", "\u6079", "\u592E", "\u5E7A", "\u503B", "\u4E00", "\u56D9", "\u5E94", "\u54DF", "\u4F63", "\u4F18", "\u625C", "\u56E6", "\u66F0", "\u6655", "\u5E00", "\u707D", "\u5142", "\u5328", "\u50AE", "\u5219", "\u8D3C", "\u600E", "\u5897", "\u624E", "\u635A", "\u6CBE", "\u5F20", "\u4F4B", "\u8707", "\u8D1E", "\u4E89", "\u4E4B", "\u4E2D", "\u5DDE", "\u6731", "\u6293", "\u62FD", "\u4E13", "\u5986", "\u96B9", "\u5B92", "\u5353", "\u4E72", "\u5B97", "\u90B9", "\u79DF", "\u94BB", "\u539C", "\u5C0A", "\u6628", "\u5159"];
      var PINYINS = ["A", "AI", "AN", "ANG", "AO", "BA", "BAI", "BAN", "BANG", "BAO", "BEI", "BEN", "BENG", "BI", "BIAN", "BIAO", "BIE", "BIN", "BING", "BO", "BU", "CA", "CAI", "CAN", "CANG", "CAO", "CE", "CEN", "CENG", "CHA", "CHAI", "CHAN", "CHANG", "CHAO", "CHE", "CHEN", "CHENG", "CHI", "CHONG", "CHOU", "CHU", "CHUA", "CHUAI", "CHUAN", "CHUANG", "CHUI", "CHUN", "CHUO", "CI", "CONG", "COU", "CU", "CUAN", "CUI", "CUN", "CUO", "DA", "DAI", "DAN", "DANG", "DAO", "DE", "DEN", "DENG", "DI", "DIAN", "DIAO", "DIE", "DING", "DIU", "DONG", "DOU", "DU", "DUAN", "DUI", "DUN", "DUO", "E", "EI", "EN", "ENG", "ER", "FA", "FAN", "FANG", "FEI", "FEN", "FENG", "FIAO", "FO", "FOU", "FU", "GA", "GAI", "GAN", "GANG", "GAO", "GE", "GEI", "GEN", "GENG", "GONG", "GOU", "GU", "GUA", "GUAI", "GUAN", "GUANG", "GUI", "GUN", "GUO", "HA", "HAI", "HAN", "HANG", "HAO", "HE", "HEI", "HEN", "HENG", "HM", "HONG", "HOU", "HU", "HUA", "HUAI", "HUAN", "HUANG", "HUI", "HUN", "HUO", "JI", "JIA", "JIAN", "JIANG", "JIAO", "JIE", "JIN", "JING", "JIONG", "JIU", "JU", "JUAN", "JUE", "JUN", "KA", "KAI", "KAN", "KANG", "KAO", "KE", "KEN", "KENG", "KONG", "KOU", "KU", "KUA", "KUAI", "KUAN", "KUANG", "KUI", "KUN", "KUO", "LA", "LAI", "LAN", "LANG", "LAO", "LE", "LEI", "LENG", "LI", "LIA", "LIAN", "LIANG", "LIAO", "LIE", "LIN", "LING", "LIU", "LO", "LONG", "LOU", "LU", "LV", "LUAN", "LVE", "LUN", "LUO", "M", "MA", "MAI", "MAN", "MANG", "MAO", "ME", "MEI", "MEN", "MENG", "MI", "MIAN", "MIAO", "MIE", "MIN", "MING", "MIU", "MO", "MOU", "MU", "N", "NA", "NAI", "NAN", "NANG", "NAO", "NE", "NEI", "NEN", "NENG", "NI", "NIAN", "NIANG", "NIAO", "NIE", "NIN", "NING", "NIU", "NONG", "NOU", "NU", "NV", "NUAN", "NVE", "NUN", "NUO", "O", "OU", "PA", "PAI", "PAN", "PANG", "PAO", "PEI", "PEN", "PENG", "PI", "PIAN", "PIAO", "PIE", "PIN", "PING", "PO", "POU", "PU", "QI", "QIA", "QIAN", "QIANG", "QIAO", "QIE", "QIN", "QING", "QIONG", "QIU", "QU", "QUAN", "QUE", "QUN", "RAN", "RANG", "RAO", "RE", "REN", "RENG", "RI", "RONG", "ROU", "RU", "RUA", "RUAN", "RUI", "RUN", "RUO", "SA", "SAI", "SAN", "SANG", "SAO", "SE", "SEN", "SENG", "SHA", "SHAI", "SHAN", "SHANG", "SHAO", "SHE", "SHEN", "SHENG", "SHI", "SHOU", "SHU", "SHUA", "SHUAI", "SHUAN", "SHUANG", "SHUI", "SHUN", "SHUO", "SI", "SONG", "SOU", "SU", "SUAN", "SUI", "SUN", "SUO", "TA", "TAI", "TAN", "TANG", "TAO", "TE", "TENG", "TI", "TIAN", "TIAO", "TIE", "TING", "TONG", "TOU", "TU", "TUAN", "TUI", "TUN", "TUO", "WA", "WAI", "WAN", "WANG", "WEI", "WEN", "WENG", "WO", "WU", "XI", "XIA", "XIAN", "XIANG", "XIAO", "XIE", "XIN", "XING", "XIONG", "XIU", "XU", "XUAN", "XUE", "XUN", "YA", "YAN", "YANG", "YAO", "YE", "YI", "YIN", "YING", "YO", "YONG", "YOU", "YU", "YUAN", "YUE", "YUN", "ZA", "ZAI", "ZAN", "ZANG", "ZAO", "ZE", "ZEI", "ZEN", "ZENG", "ZHA", "ZHAI", "ZHAN", "ZHANG", "ZHAO", "ZHE", "ZHEN", "ZHENG", "ZHI", "ZHONG", "ZHOU", "ZHU", "ZHUA", "ZHUAI", "ZHUAN", "ZHUANG", "ZHUI", "ZHUN", "ZHUO", "ZI", "ZONG", "ZOU", "ZU", "ZUAN", "ZUI", "ZUN", "ZUO", ""];
      var EXCEPTIONS = {
        "\u66FE": "ZENG",
        // CENG 曾
        "\u6C88": "SHEN",
        // CHEN 沈
        "\u55F2": "DIA",
        // DIE 嗲
        "\u78A1": "ZHOU",
        // DU 碡
        "\u8052": "GUO",
        // GUA 聒
        "\u7094": "QUE",
        // GUI 炔
        "\u86B5": "KE",
        // HE 蚵
        "\u7809": "HUA",
        // HUO 砉
        "\u5B24": "MO",
        // MA 嬤
        "\u5B37": "MO",
        // MA 嬷
        "\u8E52": "PAN",
        // MAN 蹒
        "\u8E4A": "XI",
        // QI 蹊
        "\u4E2C": "PAN",
        // QIANG 丬
        "\u9730": "XIAN",
        // SAN 霰
        "\u8398": "XIN",
        // SHEN 莘
        "\u8C49": "CHI",
        // SHI 豉
        "\u9967": "XING",
        // TANG 饧
        "\u7B60": "JUN",
        // YUN 筠
        "\u957F": "CHANG",
        // ZHANG 长
        "\u5E27": "ZHEN",
        // ZHENG 帧
        "\u5CD9": "SHI",
        // ZHI 峙
        "\u90CD": "NA",
        "\u828E": "XIONG",
        "\u8C01": "SHUI"
      };
      module.exports = {
        PINYINS,
        UNIHANS,
        EXCEPTIONS
      };
    }
  });

  // node_modules/.pnpm/tiny-pinyin@1.3.2/node_modules/tiny-pinyin/dist/core.js
  var require_core = __commonJS({
    "node_modules/.pnpm/tiny-pinyin@1.3.2/node_modules/tiny-pinyin/dist/core.js"(exports, module) {
      "use strict";
      var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
        return typeof obj;
      } : function(obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
      var DICT = require_dict();
      var FIRST_PINYIN_UNIHAN = "\u963F";
      var LAST_PINYIN_UNIHAN = "\u9FFF";
      var LATIN = 1;
      var PINYIN = 2;
      var UNKNOWN = 3;
      var supported = null;
      var COLLATOR = void 0;
      function patchDict(patchers) {
        if (!patchers) return;
        if (typeof patchers === "function") {
          patchers = [patchers];
        }
        if (patchers.forEach) {
          patchers.forEach(function(p) {
            typeof p === "function" && p(DICT);
          });
        }
      }
      function isSupported(force) {
        if (!force && supported !== null) {
          return supported;
        }
        if ((typeof Intl === "undefined" ? "undefined" : _typeof(Intl)) === "object" && Intl.Collator) {
          COLLATOR = new Intl.Collator(["zh-Hans-CN", "zh-CN"]);
          supported = Intl.Collator.supportedLocalesOf(["zh-CN"]).length === 1;
        } else {
          supported = false;
        }
        return supported;
      }
      function genToken(ch) {
        var UNIHANS = DICT.UNIHANS;
        var PINYINS = DICT.PINYINS;
        var EXCEPTIONS = DICT.EXCEPTIONS;
        var token = {
          source: ch
          // First check EXCEPTIONS map, then search with UNIHANS table.
        };
        if (ch in EXCEPTIONS) {
          token.type = PINYIN;
          token.target = EXCEPTIONS[ch];
          return token;
        }
        var offset = -1;
        var cmp = void 0;
        if (ch.charCodeAt(0) < 256) {
          token.type = LATIN;
          token.target = ch;
          return token;
        } else {
          cmp = COLLATOR.compare(ch, FIRST_PINYIN_UNIHAN);
          if (cmp < 0) {
            token.type = UNKNOWN;
            token.target = ch;
            return token;
          } else if (cmp === 0) {
            token.type = PINYIN;
            offset = 0;
          } else {
            cmp = COLLATOR.compare(ch, LAST_PINYIN_UNIHAN);
            if (cmp > 0) {
              token.type = UNKNOWN;
              token.target = ch;
              return token;
            } else if (cmp === 0) {
              token.type = PINYIN;
              offset = UNIHANS.length - 1;
            }
          }
        }
        token.type = PINYIN;
        if (offset < 0) {
          var begin = 0;
          var end = UNIHANS.length - 1;
          while (begin <= end) {
            offset = ~~((begin + end) / 2);
            var unihan = UNIHANS[offset];
            cmp = COLLATOR.compare(ch, unihan);
            if (cmp === 0) {
              break;
            } else if (cmp > 0) {
              begin = offset + 1;
            } else {
              end = offset - 1;
            }
          }
        }
        if (cmp < 0) {
          offset--;
        }
        token.target = PINYINS[offset];
        if (!token.target) {
          token.type = UNKNOWN;
          token.target = token.source;
        }
        return token;
      }
      function parse(str) {
        if (typeof str !== "string") {
          throw new Error("argument should be string.");
        }
        if (!isSupported()) {
          throw new Error("not support Intl or zh-CN language.");
        }
        return str.split("").map(function(v) {
          return genToken(v);
        });
      }
      module.exports = {
        isSupported,
        parse,
        patchDict,
        genToken,
        // inner usage
        convertToPinyin: function convertToPinyin(str, separator, lowerCase) {
          return parse(str).map(function(v) {
            if (lowerCase && v.type === PINYIN) {
              return v.target.toLowerCase();
            }
            return v.target;
          }).join(separator || "");
        }
      };
    }
  });

  // node_modules/.pnpm/tiny-pinyin@1.3.2/node_modules/tiny-pinyin/dist/patchers/56l.js
  var require_l = __commonJS({
    "node_modules/.pnpm/tiny-pinyin@1.3.2/node_modules/tiny-pinyin/dist/patchers/56l.js"(exports, module) {
      "use strict";
      exports = module.exports = function patcher(DICT) {
        DICT.EXCEPTIONS = {
          "\u55F2": "DIA",
          // DIE 嗲
          "\u78A1": "ZHOU",
          // DU 碡
          "\u8052": "GUO",
          // GUA 聒
          "\u7094": "QUE",
          // GUI 炔
          "\u86B5": "KE",
          // HE 蚵
          "\u7809": "HUA",
          // HUO 砉
          "\u5B37": "MO",
          // MA 嬷 新增
          "\u8E4A": "XI",
          // QI 蹊
          "\u4E2C": "PAN",
          // QIANG 丬
          "\u9730": "XIAN",
          // SAN 霰
          "\u8C49": "CHI",
          // SHI 豉
          "\u9967": "XING",
          // TANG 饧
          "\u5E27": "ZHEN",
          // ZHENG 帧
          "\u828E": "XIONG",
          // 芎
          "\u8C01": "SHUI",
          // 谁
          "\u94B6": "KE"
          // 钶
          // Update UNIHANS dict.
        };
        DICT.UNIHANS[91] = "\u4F15";
        DICT.UNIHANS[347] = "\u4EDA";
        DICT.UNIHANS[393] = "\u8BCC";
        DICT.UNIHANS[39] = "\u5A64";
        DICT.UNIHANS[50] = "\u8160";
        DICT.UNIHANS[369] = "\u6538";
        DICT.UNIHANS[123] = "\u4E6F";
        DICT.UNIHANS[171] = "\u5215";
        DICT.UNIHANS[102] = "\u4F5D";
        DICT.UNIHANS[126] = "\u72BF";
        DICT.UNIHANS[176] = "\u5217";
        DICT.UNIHANS[178] = "\u5222";
        DICT.UNIHANS[252] = "\u5A1D";
        DICT.UNIHANS[330] = "\u5078";
      };
      exports.shouldPatch = function shouldPatch(toToken) {
        if (typeof toToken !== "function") return false;
        if (toToken("\u4F15").target === "FOU" && toToken("\u4EDA").target === "XIA" && toToken("\u8BCC").target === "ZHONG" && toToken("\u5A64").target === "CHONG" && toToken("\u8160").target === "CONG" && toToken("\u6538").target === "YONG" && toToken("\u4E6F").target === "HOU" && toToken("\u5215").target === "LENG" && toToken("\u4F5D").target === "GONG" && toToken("\u72BF").target === "HUAI" && toToken("\u5217").target === "LIAO" && toToken("\u5222").target === "LIN" && toToken("\u94B6").target === "E") {
          return true;
        }
        return false;
      };
    }
  });

  // node_modules/.pnpm/tiny-pinyin@1.3.2/node_modules/tiny-pinyin/dist/index.js
  var require_dist = __commonJS({
    "node_modules/.pnpm/tiny-pinyin@1.3.2/node_modules/tiny-pinyin/dist/index.js"(exports, module) {
      "use strict";
      var pinyin = require_core();
      var patcher56L = require_l();
      if (pinyin.isSupported() && patcher56L.shouldPatch(pinyin.genToken)) {
        pinyin.patchDict(patcher56L);
      }
      module.exports = pinyin;
    }
  });

  // node_modules/.pnpm/js-yaml@5.4.3/node_modules/js-yaml/dist/js-yaml.mjs
  function defineScalarTag(tagName, options) {
    var _a, _b, _c, _d, _e;
    return {
      tagName,
      nodeKind: "scalar",
      implicit: (_a = options.implicit) != null ? _a : false,
      matchByTagPrefix: (_b = options.matchByTagPrefix) != null ? _b : false,
      implicitFirstChars: (_c = options.implicitFirstChars) != null ? _c : null,
      resolve: options.resolve,
      identify: options.identify,
      represent: (_d = options.represent) != null ? _d : ((data) => String(data)),
      representTagName: (_e = options.representTagName) != null ? _e : (() => tagName)
    };
  }
  function defineSequenceTag(tagName, options) {
    var _a, _b, _c, _d;
    const carrierIsResult = options.finalize === void 0;
    return {
      tagName,
      nodeKind: "sequence",
      implicit: false,
      matchByTagPrefix: (_a = options.matchByTagPrefix) != null ? _a : false,
      create: options.create,
      addItem: options.addItem,
      finalize: (_b = options.finalize) != null ? _b : ((carrier) => carrier),
      carrierIsResult,
      identify: options.identify,
      represent: (_c = options.represent) != null ? _c : ((data) => data),
      representTagName: (_d = options.representTagName) != null ? _d : (() => tagName)
    };
  }
  function defineMappingTag(tagName, options) {
    var _a, _b, _c, _d;
    const carrierIsResult = options.finalize === void 0;
    return {
      tagName,
      nodeKind: "mapping",
      implicit: false,
      matchByTagPrefix: (_a = options.matchByTagPrefix) != null ? _a : false,
      create: options.create,
      addPair: options.addPair,
      has: options.has,
      keys: options.keys,
      get: options.get,
      finalize: (_b = options.finalize) != null ? _b : ((carrier) => carrier),
      carrierIsResult,
      identify: options.identify,
      represent: (_c = options.represent) != null ? _c : ((data) => data),
      representTagName: (_d = options.representTagName) != null ? _d : (() => tagName)
    };
  }
  function parseYamlInteger$2(source) {
    let value = source;
    let sign = 1;
    if (value[0] === "-" || value[0] === "+") {
      if (value[0] === "-") sign = -1;
      value = value.slice(1);
    }
    if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
    if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
    if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
    return sign * parseInt(value, 10);
  }
  function resolveYamlInteger$2(source, isExplicit) {
    if (isExplicit) {
      if (!YAML_INTEGER_EXPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
    } else if (!YAML_INTEGER_IMPLICIT_PATTERN$1.test(source)) return NOT_RESOLVED;
    const result = parseYamlInteger$2(source);
    return Number.isFinite(result) ? result : NOT_RESOLVED;
  }
  function parseYamlInteger$1(source) {
    let value = source;
    let sign = 1;
    if (value[0] === "-" || value[0] === "+") {
      if (value[0] === "-") sign = -1;
      value = value.slice(1);
    }
    if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
    if (value.startsWith("0o")) return sign * parseInt(value.slice(2), 8);
    if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
    return sign * parseInt(value, 10);
  }
  function resolveYamlInteger$1(source, isExplicit) {
    if (isExplicit) {
      if (!YAML_INTEGER_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
    } else if (!YAML_INTEGER_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
    const result = parseYamlInteger$1(source);
    return Number.isFinite(result) ? result : NOT_RESOLVED;
  }
  function parseYamlInteger(source) {
    let value = source.replace(/_/g, "");
    let sign = 1;
    if (value[0] === "-" || value[0] === "+") {
      if (value[0] === "-") sign = -1;
      value = value.slice(1);
    }
    if (value.startsWith("0b")) return sign * parseInt(value.slice(2), 2);
    if (value.startsWith("0x")) return sign * parseInt(value.slice(2), 16);
    if (value.includes(":")) {
      let result = 0;
      for (const part of value.split(":")) result = result * 60 + Number(part);
      return sign * result;
    }
    if (value !== "0" && value[0] === "0") return sign * parseInt(value, 8);
    return sign * parseInt(value, 10);
  }
  function resolveYamlInteger(source) {
    if (!YAML_INTEGER_PATTERN.test(source)) return NOT_RESOLVED;
    const result = parseYamlInteger(source);
    return Number.isFinite(result) ? result : NOT_RESOLVED;
  }
  function resolveYamlFloat$2(source) {
    if (!YAML_FLOAT_PATTERN$1.test(source)) return NOT_RESOLVED;
    let value = source.toLowerCase();
    const sign = value[0] === "-" ? -1 : 1;
    if ("+-".includes(value[0])) value = value.slice(1);
    if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    if (value === ".nan") return NaN;
    const result = sign * parseFloat(value);
    if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN$1.test(source)) return result;
    return NOT_RESOLVED;
  }
  function representYamlFloat$2(object) {
    if (isNaN(object)) return ".nan";
    if (object === Number.POSITIVE_INFINITY) return ".inf";
    if (object === Number.NEGATIVE_INFINITY) return "-.inf";
    if (Object.is(object, -0)) return "-0.0";
    const result = object.toString(10);
    return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
  }
  function resolveYamlFloat$1(source, isExplicit) {
    if (isExplicit) {
      if (!YAML_FLOAT_EXPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
      let value = source.toLowerCase();
      const sign = value[0] === "-" ? -1 : 1;
      if ("+-".includes(value[0])) value = value.slice(1);
      if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      if (value === ".nan") return NaN;
      const result2 = sign * parseFloat(value);
      return Number.isFinite(result2) ? result2 : NOT_RESOLVED;
    }
    if (!YAML_FLOAT_IMPLICIT_PATTERN.test(source)) return NOT_RESOLVED;
    const result = Number(source);
    if (Number.isFinite(result)) return result;
    return NOT_RESOLVED;
  }
  function representYamlFloat$1(object) {
    if (isNaN(object)) return ".nan";
    if (object === Number.POSITIVE_INFINITY) return ".inf";
    if (object === Number.NEGATIVE_INFINITY) return "-.inf";
    if (Object.is(object, -0)) return "-0.0";
    const result = object.toString(10);
    return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
  }
  function resolveYamlFloat(source) {
    if (!YAML_FLOAT_PATTERN.test(source)) return NOT_RESOLVED;
    let value = source.toLowerCase().replace(/_/g, "");
    const sign = value[0] === "-" ? -1 : 1;
    if ("+-".includes(value[0])) value = value.slice(1);
    if (value === ".inf") return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    if (value === ".nan") return NaN;
    let result = 0;
    if (value.includes(":")) {
      for (const part of value.split(":")) result = result * 60 + Number(part);
      result *= sign;
    } else result = sign * parseFloat(value);
    if (Number.isFinite(result) || YAML_FLOAT_SPECIAL_PATTERN.test(source)) return result;
    return NOT_RESOLVED;
  }
  function representYamlFloat(object) {
    if (isNaN(object)) return ".nan";
    if (object === Number.POSITIVE_INFINITY) return ".inf";
    if (object === Number.NEGATIVE_INFINITY) return "-.inf";
    if (Object.is(object, -0)) return "-0.0";
    const result = object.toString(10);
    return /^[-+]?[0-9]+e/.test(result) ? result.replace("e", ".e") : result;
  }
  function resolveYamlBinary(source) {
    const input = source.replace(/\s/g, "");
    if (input.length % 4 !== 0 || !BASE64_PATTERN.test(input)) return NOT_RESOLVED;
    const binary = atob(input);
    const result = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) result[index] = binary.charCodeAt(index);
    return result;
  }
  function representYamlBinary(object) {
    let binary = "";
    for (let index = 0; index < object.length; index++) binary += String.fromCharCode(object[index]);
    return btoa(binary);
  }
  function makeUtcDate(year, month, day, hour = 0, minute = 0, second = 0, fraction = 0) {
    const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    date.setUTCFullYear(year, month, day);
    return date;
  }
  function resolveYamlTimestamp(source) {
    let match = YAML_DATE_REGEXP.exec(source);
    if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(source);
    if (match === null) return NOT_RESOLVED;
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    if (!match[4]) {
      const date2 = makeUtcDate(year, month, day);
      if (date2.getUTCFullYear() !== year || date2.getUTCMonth() !== month || date2.getUTCDate() !== day) return NOT_RESOLVED;
      return date2;
    }
    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    let fraction = 0;
    if (hour > 23 || minute > 59 || second > 59) return NOT_RESOLVED;
    if (match[7]) {
      let value = match[7].slice(0, 3);
      while (value.length < 3) value += "0";
      fraction = +value;
    }
    const date = makeUtcDate(year, month, day, hour, minute, second, fraction);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return NOT_RESOLVED;
    if (match[9]) {
      const offsetHour = +match[10];
      const offsetMinute = +(match[11] || 0);
      if (offsetHour > 23 || offsetMinute > 59) return NOT_RESOLVED;
      const offset = (offsetHour * 60 + offsetMinute) * 6e4;
      date.setTime(date.getTime() - (match[9] === "-" ? -offset : offset));
    }
    return date;
  }
  function isPlainObject(data) {
    if (data === null || typeof data !== "object" || Array.isArray(data)) return false;
    const prototype = Object.getPrototypeOf(data);
    return prototype === null || prototype === Object.prototype;
  }
  function pick(object, keys) {
    const result = {};
    for (const key of keys) if (object[key] !== void 0) result[key] = object[key];
    return result;
  }
  function createTagDefinitionMap() {
    return {
      scalar: /* @__PURE__ */ Object.create(null),
      sequence: /* @__PURE__ */ Object.create(null),
      mapping: /* @__PURE__ */ Object.create(null)
    };
  }
  function createTagDefinitionListMap() {
    return {
      scalar: [],
      sequence: [],
      mapping: []
    };
  }
  function compileTags(tags) {
    const result = [];
    for (const tag of tags) {
      let index = result.length;
      for (let previousIndex = 0; previousIndex < result.length; previousIndex++) {
        const previous = result[previousIndex];
        if (previous.nodeKind === tag.nodeKind && previous.tagName === tag.tagName && previous.matchByTagPrefix === tag.matchByTagPrefix) {
          index = previousIndex;
          break;
        }
      }
      result[index] = tag;
    }
    return result;
  }
  function normalizeKey(key) {
    if (Array.isArray(key)) {
      const array = Array.prototype.slice.call(key);
      for (let index = 0; index < array.length; index++) {
        if (Array.isArray(array[index])) return null;
        if (typeof array[index] === "object" && Object.prototype.toString.call(array[index]) === "[object Object]") array[index] = "[object Object]";
      }
      return String(array);
    }
    if (typeof key === "object" && Object.prototype.toString.call(key) === "[object Object]") return "[object Object]";
    return String(key);
  }
  function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
    let head = "";
    let tail = "";
    const maxHalfLength = Math.floor(maxLineLength / 2) - 1;
    if (position - lineStart > maxHalfLength) {
      head = " ... ";
      lineStart = position - maxHalfLength + head.length;
    }
    if (lineEnd - position > maxHalfLength) {
      tail = " ...";
      lineEnd = position + maxHalfLength - tail.length;
    }
    return {
      str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
      pos: position - lineStart + head.length
    };
  }
  function padStart(string, max) {
    return " ".repeat(Math.max(max - string.length, 0)) + string;
  }
  function makeSnippet(mark, options) {
    if (!mark.buffer) return null;
    const opts = {
      ...DEFAULT_SNIPPET_OPTIONS,
      ...options
    };
    const re = /\r?\n|\r|\0/g;
    const lineStarts = [0];
    const lineEnds = [];
    let match;
    let foundLineNo = -1;
    while (match = re.exec(mark.buffer)) {
      lineEnds.push(match.index);
      lineStarts.push(match.index + match[0].length);
      if (mark.position <= match.index && foundLineNo < 0) foundLineNo = lineStarts.length - 2;
    }
    if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
    let result = "";
    const lineNoLength = Math.min(mark.line + opts.linesAfter, lineEnds.length).toString().length;
    const maxLineLength = opts.maxLength - (opts.indent + lineNoLength + 3);
    for (let i = 1; i <= opts.linesBefore; i++) {
      if (foundLineNo - i < 0) break;
      const line2 = getLine(mark.buffer, lineStarts[foundLineNo - i], lineEnds[foundLineNo - i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]), maxLineLength);
      result = `${" ".repeat(opts.indent)}${padStart((mark.line - i + 1).toString(), lineNoLength)} | ${line2.str}
${result}`;
    }
    const line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
    result += `${" ".repeat(opts.indent)}${padStart((mark.line + 1).toString(), lineNoLength)} | ${line.str}
`;
    result += `${"-".repeat(opts.indent + lineNoLength + 3 + line.pos)}^
`;
    for (let i = 1; i <= opts.linesAfter; i++) {
      if (foundLineNo + i >= lineEnds.length) break;
      const line2 = getLine(mark.buffer, lineStarts[foundLineNo + i], lineEnds[foundLineNo + i], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]), maxLineLength);
      result += `${" ".repeat(opts.indent)}${padStart((mark.line + i + 1).toString(), lineNoLength)} | ${line2.str}
`;
    }
    return result.replace(/\n$/, "");
  }
  function formatError(exception, compact) {
    let where = "";
    if (!exception.mark) return exception.reason;
    if (exception.mark.name) where += `in "${exception.mark.name}" `;
    where += `(${exception.mark.line + 1}:${exception.mark.column + 1})`;
    if (!compact && exception.mark.snippet) where += `

${exception.mark.snippet}`;
    return `${exception.reason} ${where}`;
  }
  function simpleEscapeSequence(c) {
    switch (c) {
      case 48:
        return "\0";
      case 97:
        return "\x07";
      case 98:
        return "\b";
      case 116:
        return "	";
      case 9:
        return "	";
      case 110:
        return "\n";
      case 118:
        return "\v";
      case 102:
        return "\f";
      case 114:
        return "\r";
      case 101:
        return "\x1B";
      case 32:
        return " ";
      case 34:
        return '"';
      case 47:
        return "/";
      case 92:
        return "\\";
      case 78:
        return "\x85";
      case 95:
        return "\xA0";
      case 76:
        return "\u2028";
      case 80:
        return "\u2029";
      default:
        return "";
    }
  }
  function charFromCodepoint(c) {
    if (c <= 65535) return String.fromCharCode(c);
    return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
  }
  function fromHexCode$1(c) {
    if (c >= 48 && c <= 57) return c - 48;
    return (c | 32) - 97 + 10;
  }
  function escapedHexLen$1(c) {
    if (c === 120) return 2;
    if (c === 117) return 4;
    return 8;
  }
  function skipFoldedBreaks(input, position, end) {
    let breaks = 0;
    while (position < end) {
      const ch = input.charCodeAt(position);
      if (ch === 10) {
        breaks++;
        position++;
      } else if (ch === 13) {
        breaks++;
        position++;
        if (input.charCodeAt(position) === 10) position++;
      } else if (ch === 32 || ch === 9) position++;
      else break;
    }
    return {
      position,
      breaks
    };
  }
  function foldedBreaks(count) {
    if (count === 1) return " ";
    return "\n".repeat(count - 1);
  }
  function getPlainValue(input, start, end) {
    let result = "";
    let position = start;
    let captureStart = start;
    let captureEnd = start;
    while (position < end) {
      const ch = input.charCodeAt(position);
      if (ch === 10 || ch === 13) {
        result += input.slice(captureStart, captureEnd);
        const fold = skipFoldedBreaks(input, position, end);
        result += foldedBreaks(fold.breaks);
        position = captureStart = captureEnd = fold.position;
      } else {
        position++;
        if (ch !== 32 && ch !== 9) captureEnd = position;
      }
    }
    return result + input.slice(captureStart, captureEnd);
  }
  function getSingleQuotedValue(input, start, end) {
    let result = "";
    let position = start;
    let captureStart = start;
    let captureEnd = start;
    while (position < end) {
      const ch = input.charCodeAt(position);
      if (ch === 39) {
        result += input.slice(captureStart, position) + "'";
        position += 2;
        captureStart = captureEnd = position;
      } else if (ch === 10 || ch === 13) {
        result += input.slice(captureStart, captureEnd);
        const fold = skipFoldedBreaks(input, position, end);
        result += foldedBreaks(fold.breaks);
        position = captureStart = captureEnd = fold.position;
      } else {
        position++;
        if (ch !== 32 && ch !== 9) captureEnd = position;
      }
    }
    return result + input.slice(captureStart, end);
  }
  function getDoubleQuotedValue(input, start, end) {
    let result = "";
    let position = start;
    let captureStart = start;
    let captureEnd = start;
    while (position < end) {
      const ch = input.charCodeAt(position);
      if (ch === 92) {
        result += input.slice(captureStart, position);
        position++;
        const escaped = input.charCodeAt(position);
        if (escaped === 10 || escaped === 13) position = skipFoldedBreaks(input, position, end).position;
        else if (escaped < 256 && simpleEscapeCheck[escaped]) {
          result += simpleEscapeMap[escaped];
          position++;
        } else {
          let hexLength = escapedHexLen$1(escaped);
          let hexResult = 0;
          for (; hexLength > 0; hexLength--) {
            position++;
            const digit = fromHexCode$1(input.charCodeAt(position));
            hexResult = (hexResult << 4) + digit;
          }
          result += charFromCodepoint(hexResult);
          position++;
        }
        captureStart = captureEnd = position;
      } else if (ch === 10 || ch === 13) {
        result += input.slice(captureStart, captureEnd);
        const fold = skipFoldedBreaks(input, position, end);
        result += foldedBreaks(fold.breaks);
        position = captureStart = captureEnd = fold.position;
      } else {
        position++;
        if (ch !== 32 && ch !== 9) captureEnd = position;
      }
    }
    return result + input.slice(captureStart, end);
  }
  function getBlockValue(input, start, end, indent, chomping, folded) {
    const textIndent = indent < 0 ? 0 : indent;
    const region = input.slice(start, end).replace(/\r\n?/g, "\n");
    const lines = region === "" ? [] : (region.endsWith("\n") ? region.slice(0, -1) : region).split("\n");
    let result = "";
    let didReadContent = false;
    let emptyLines = 0;
    let atMoreIndented = false;
    for (const line of lines) {
      let column = 0;
      while (column < textIndent && line.charCodeAt(column) === 32) column++;
      if (indent < 0 || column >= line.length) {
        emptyLines++;
        continue;
      }
      const content = line.slice(textIndent);
      const first = content.charCodeAt(0);
      if (folded) if (first === 32 || first === 9) {
        atMoreIndented = true;
        result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        result += "\n".repeat(emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) result += " ";
      } else result += "\n".repeat(emptyLines);
      else result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
      result += content;
      didReadContent = true;
      emptyLines = 0;
    }
    if (chomping === CHOMPING_MODE.KEEP) result += "\n".repeat(didReadContent ? 1 + emptyLines : emptyLines);
    else if (chomping !== CHOMPING_MODE.STRIP) {
      if (didReadContent) result += "\n";
    }
    return result;
  }
  function getScalarValue(input, scalar) {
    if (scalar.valueStart === NO_RANGE$3) return "";
    const { valueStart, valueEnd } = scalar;
    if (scalar.fast) return input.slice(valueStart, valueEnd);
    switch (scalar.style) {
      case SCALAR_STYLE.SINGLE_QUOTED:
        return getSingleQuotedValue(input, valueStart, valueEnd);
      case SCALAR_STYLE.DOUBLE_QUOTED:
        return getDoubleQuotedValue(input, valueStart, valueEnd);
      case SCALAR_STYLE.LITERAL_BLOCK:
        return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, false);
      case SCALAR_STYLE.FOLDED_BLOCK:
        return getBlockValue(input, valueStart, valueEnd, scalar.indent, scalar.chomping, true);
      default:
        return getPlainValue(input, valueStart, valueEnd);
    }
  }
  function tagNameFull(rawTag, tagHandlers) {
    var _a, _b;
    if (rawTag.startsWith("!<") && rawTag.endsWith(">")) return decodeURIComponent(rawTag.slice(2, -1));
    const handleEnd = rawTag.indexOf("!", 1);
    const handle = handleEnd === -1 ? "!" : rawTag.slice(0, handleEnd + 1);
    const prefix = (_b = (_a = tagHandlers == null ? void 0 : tagHandlers[handle]) != null ? _a : DEFAULT_TAG_HANDLERS[handle]) != null ? _b : handle;
    return decodeURIComponent(prefix) + decodeURIComponent(rawTag.slice(handle.length));
  }
  function eventPosition$1(event) {
    if ("tagStart" in event && event.tagStart !== NO_RANGE$2) return event.tagStart;
    if ("anchorStart" in event && event.anchorStart !== NO_RANGE$2) return event.anchorStart;
    if ("valueStart" in event && event.valueStart !== NO_RANGE$2) return event.valueStart;
    if ("start" in event) return event.start;
    return 0;
  }
  function throwError$1(state, message) {
    YAMLException.throwAt(state.source, state.position, message, state.filename);
  }
  function finalizeCollection(state, position, tag, carrier) {
    try {
      return tag.finalize(carrier);
    } catch (error) {
      if (error instanceof YAMLException) throw error;
      YAMLException.throwAt(state.source, position, error instanceof Error ? error.message : String(error), state.filename);
    }
  }
  function constructScalar(state, event) {
    var _a;
    const source = getScalarValue(state.source, event);
    const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
    const strTag2 = state.schema.defaultScalarTag;
    if (rawTag !== "") {
      if (rawTag === "!") return {
        value: source,
        tag: strTag2
      };
      const tagName = tagNameFull(rawTag, state.tagHandlers);
      const scalarTag = state.schema.lookupScalarTag(tagName);
      if (scalarTag) {
        const result = scalarTag.resolve(source, true, tagName);
        if (result === NOT_RESOLVED) throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
        return {
          value: result,
          tag: scalarTag
        };
      }
      const collectionTagDef = (_a = state.schema.lookupMappingTag(tagName)) != null ? _a : state.schema.lookupSequenceTag(tagName);
      if (collectionTagDef) {
        if (source !== "") throwError$1(state, `cannot resolve a node with !<${tagName}> explicit tag`);
        const carrier = collectionTagDef.create(tagName);
        return {
          value: collectionTagDef.carrierIsResult ? carrier : finalizeCollection(state, state.position, collectionTagDef, carrier),
          tag: collectionTagDef
        };
      }
      throwError$1(state, `unknown scalar tag !<${tagName}>`);
    }
    if (event.style === SCALAR_STYLE.PLAIN) return state.schema.resolveImplicitScalarTag(source);
    return {
      value: strTag2.resolve(source, false, strTag2.tagName),
      tag: strTag2
    };
  }
  function collectionTagName(state, event, defaultTagName) {
    const rawTag = event.tagStart === NO_RANGE$2 ? "" : state.source.slice(event.tagStart, event.tagEnd);
    return rawTag === "" || rawTag === "!" ? defaultTagName : tagNameFull(rawTag, state.tagHandlers);
  }
  function isMappingTag(tag) {
    return tag.nodeKind === "mapping";
  }
  function chargeMergeWork(state) {
    state.totalMergeKeys++;
    if (state.maxTotalMergeKeys !== -1 && state.totalMergeKeys > state.maxTotalMergeKeys) throwError$1(state, `merge keys exceeded maxTotalMergeKeys (${state.maxTotalMergeKeys})`);
  }
  function mergeKeys(state, frame, source, sourceTag) {
    var _a;
    chargeMergeWork(state);
    for (const sourceKey of sourceTag.keys(source)) {
      chargeMergeWork(state);
      if (frame.tag.has(frame.value, sourceKey)) continue;
      const err = frame.tag.addPair(frame.value, sourceKey, sourceTag.get(source, sourceKey));
      if (err) throwError$1(state, err);
      (_a = frame.overridable) != null ? _a : frame.overridable = /* @__PURE__ */ new Set();
      frame.overridable.add(sourceKey);
    }
  }
  function mergeSource(state, frame, source, sourceTag) {
    state.position = frame.keyPosition;
    if (isMappingTag(sourceTag)) mergeKeys(state, frame, source, sourceTag);
    else if (sourceTag.nodeKind === "sequence" && Array.isArray(source)) {
      if (source.length > 100) throwError$1(state, "abnormal merge sequence size");
      for (const element of source) {
        const elementTag = state.nodeTags.get(element);
        if (!elementTag) throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
        mergeKeys(state, frame, element, elementTag);
      }
    } else throwError$1(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  function addMappingValue(state, frame, key, value, tag) {
    var _a, _b;
    state.position = frame.keyPosition;
    if (frame.keyIsMerge) {
      mergeSource(state, frame, value, tag);
      return;
    }
    if (!state.json && frame.tag.has(frame.value, key) && !((_a = frame.overridable) == null ? void 0 : _a.has(key))) throwError$1(state, "duplicated mapping key");
    const err = frame.tag.addPair(frame.value, key, value);
    if (err) throwError$1(state, err);
    (_b = frame.overridable) == null ? void 0 : _b.delete(key);
  }
  function addValue(state, value, tag) {
    const frame = state.frames[state.frames.length - 1];
    if (frame.kind === "document") {
      frame.value = value;
      frame.hasValue = true;
    } else if (frame.kind === "sequence") {
      if (isMappingTag(tag)) state.nodeTags.set(value, tag);
      const err = frame.tag.addItem(frame.value, value, frame.index++);
      if (err) throwError$1(state, err);
    } else if (frame.hasKey) {
      const key = frame.key;
      frame.key = void 0;
      frame.hasKey = false;
      addMappingValue(state, frame, key, value, tag);
    } else {
      frame.key = value;
      frame.keyPosition = state.position;
      frame.hasKey = true;
      frame.keyIsMerge = tag.tagName === MERGE_TAG_NAME;
    }
  }
  function storeAnchor(state, event, value, tag, isValueFinal) {
    if (event.anchorStart !== NO_RANGE$2) {
      const anchor = {
        value,
        tag,
        isValueFinal
      };
      state.anchors.set(state.source.slice(event.anchorStart, event.anchorEnd), anchor);
      return anchor;
    }
    return null;
  }
  function constructFromEvents(events, options) {
    const state = {
      ...DEFAULT_CONSTRUCTOR_OPTIONS,
      ...options,
      events,
      documents: [],
      eventIndex: 0,
      position: 0,
      frames: [],
      anchors: /* @__PURE__ */ new Map(),
      nodeTags: /* @__PURE__ */ new Map(),
      tagHandlers: /* @__PURE__ */ Object.create(null),
      totalMergeKeys: 0,
      aliasCount: 0
    };
    while (state.eventIndex < state.events.length) {
      const event = state.events[state.eventIndex++];
      state.position = eventPosition$1(event);
      switch (event.type) {
        case EVENT_ID.DOCUMENT:
          state.anchors = /* @__PURE__ */ new Map();
          state.nodeTags = /* @__PURE__ */ new Map();
          state.aliasCount = 0;
          state.tagHandlers = /* @__PURE__ */ Object.create(null);
          for (const directive of event.directives) if (directive.kind === "tag") state.tagHandlers[directive.handle] = directive.prefix;
          state.frames.push({
            kind: "document",
            position: state.position,
            value: void 0,
            hasValue: false
          });
          break;
        case EVENT_ID.SCALAR: {
          const { value, tag } = constructScalar(state, event);
          storeAnchor(state, event, value, tag, true);
          addValue(state, value, tag);
          break;
        }
        case EVENT_ID.SEQUENCE: {
          const tagName = collectionTagName(state, event, "tag:yaml.org,2002:seq");
          const tag = state.schema.lookupSequenceTag(tagName);
          if (!tag) throwError$1(state, `unknown sequence tag !<${tagName}>`);
          const value = tag.create(tagName);
          const anchor = storeAnchor(state, event, value, tag, tag.carrierIsResult);
          state.frames.push({
            kind: "sequence",
            position: state.position,
            value,
            tag,
            anchor,
            index: 0
          });
          break;
        }
        case EVENT_ID.MAPPING: {
          const tagName = collectionTagName(state, event, "tag:yaml.org,2002:map");
          const tag = state.schema.lookupMappingTag(tagName);
          if (!tag) throwError$1(state, `unknown mapping tag !<${tagName}>`);
          const value = tag.create(tagName);
          const anchor = storeAnchor(state, event, value, tag, tag.carrierIsResult);
          state.frames.push({
            kind: "mapping",
            position: state.position,
            value,
            tag,
            anchor,
            key: void 0,
            keyPosition: state.position,
            hasKey: false,
            keyIsMerge: false,
            overridable: null
          });
          break;
        }
        case EVENT_ID.ALIAS: {
          if (state.maxAliases !== -1 && ++state.aliasCount > state.maxAliases) throwError$1(state, `aliases exceeded maxAliases (${state.maxAliases})`);
          const name = state.source.slice(event.anchorStart, event.anchorEnd);
          const anchor = state.anchors.get(name);
          if (!anchor) throwError$1(state, `unidentified alias "${name}"`);
          if (!anchor.isValueFinal) throwError$1(state, `recursive alias "${name}" is not supported for tag ${anchor.tag.tagName} because it uses finalize()`);
          addValue(state, anchor.value, anchor.tag);
          break;
        }
        case EVENT_ID.POP: {
          const frame = state.frames.pop();
          if (frame.kind === "mapping" && frame.hasKey) {
            state.position = frame.keyPosition;
            throwError$1(state, "incomplete mapping pair in event stream");
          }
          if (frame.kind === "document") state.documents.push(frame.value);
          else {
            const value = frame.tag.carrierIsResult ? frame.value : finalizeCollection(state, frame.position, frame.tag, frame.value);
            if (frame.anchor) {
              frame.anchor.value = value;
              frame.anchor.isValueFinal = true;
            }
            addValue(state, value, frame.tag);
          }
          break;
        }
      }
    }
    return state.documents;
  }
  function addDocumentEvent(state, explicitStart, explicitEnd) {
    state.events.push({
      type: EVENT_ID.DOCUMENT,
      explicitStart,
      explicitEnd,
      directives: state.directives
    });
  }
  function addSequenceEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
    state.events.push({
      type: EVENT_ID.SEQUENCE,
      start,
      anchorStart,
      anchorEnd,
      tagStart,
      tagEnd,
      style
    });
  }
  function addMappingEvent(state, start, anchorStart, anchorEnd, tagStart, tagEnd, style) {
    state.events.push({
      type: EVENT_ID.MAPPING,
      start,
      anchorStart,
      anchorEnd,
      tagStart,
      tagEnd,
      style
    });
  }
  function insertFlowPairMappingEvent(state, snapshot) {
    state.events.splice(snapshot.eventsLength, 0, {
      type: EVENT_ID.MAPPING,
      start: snapshot.position,
      anchorStart: NO_RANGE$1,
      anchorEnd: NO_RANGE$1,
      tagStart: NO_RANGE$1,
      tagEnd: NO_RANGE$1,
      style: COLLECTION_STYLE.FLOW
    });
  }
  function addScalarEvent(state, valueStart, valueEnd, anchorStart, anchorEnd, tagStart, tagEnd, style, chomping = CHOMPING_MODE.CLIP, indent = -1, fast = false) {
    state.events.push({
      type: EVENT_ID.SCALAR,
      valueStart,
      valueEnd,
      anchorStart,
      anchorEnd,
      tagStart,
      tagEnd,
      style,
      chomping,
      indent,
      fast
    });
  }
  function addAliasEvent(state, anchorStart, anchorEnd) {
    state.events.push({
      type: EVENT_ID.ALIAS,
      anchorStart,
      anchorEnd
    });
  }
  function addPopEvent(state) {
    state.events.push({ type: EVENT_ID.POP });
  }
  function addEmptyScalarEvent(state) {
    addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, NO_RANGE$1, SCALAR_STYLE.PLAIN);
  }
  function emptyProperties() {
    return {
      anchorStart: NO_RANGE$1,
      anchorEnd: NO_RANGE$1,
      tagStart: NO_RANGE$1,
      tagEnd: NO_RANGE$1
    };
  }
  function snapshotState(state) {
    return {
      position: state.position,
      line: state.line,
      lineStart: state.lineStart,
      lineIndent: state.lineIndent,
      firstTabInLine: state.firstTabInLine,
      eventsLength: state.events.length
    };
  }
  function restoreState(state, snapshot) {
    state.position = snapshot.position;
    state.line = snapshot.line;
    state.lineStart = snapshot.lineStart;
    state.lineIndent = snapshot.lineIndent;
    state.firstTabInLine = snapshot.firstTabInLine;
    state.events.length = snapshot.eventsLength;
  }
  function throwError(state, message) {
    YAMLException.throwAt(state.input.slice(0, state.length), state.position, message, state.filename);
  }
  function isEol(c) {
    return c === 10 || c === 13;
  }
  function isWhiteSpace(c) {
    return c === 9 || c === 32;
  }
  function isWsOrEol(c) {
    return isWhiteSpace(c) || isEol(c);
  }
  function isWsOrEolOrEnd(c) {
    return c === 0 || isWsOrEol(c);
  }
  function isFlowIndicator(c) {
    return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
  }
  function fromDecimalCode(c) {
    return c >= 48 && c <= 57 ? c - 48 : -1;
  }
  function fromHexCode(c) {
    if (c >= 48 && c <= 57) return c - 48;
    const lc = c | 32;
    if (lc >= 97 && lc <= 102) return lc - 97 + 10;
    return -1;
  }
  function escapedHexLen(c) {
    if (c === 120) return 2;
    if (c === 117) return 4;
    if (c === 85) return 8;
    return 0;
  }
  function isSimpleEscape(c) {
    return c === 48 || c === 97 || c === 98 || c === 116 || c === 9 || c === 110 || c === 118 || c === 102 || c === 114 || c === 101 || c === 32 || c === 34 || c === 47 || c === 92 || c === 78 || c === 95 || c === 76 || c === 80;
  }
  function consumeLineBreak(state) {
    if (state.input.charCodeAt(state.position) === 10) state.position++;
    else {
      state.position++;
      if (state.input.charCodeAt(state.position) === 10) state.position++;
    }
    state.line++;
    state.lineStart = state.position;
    state.lineIndent = 0;
    state.firstTabInLine = -1;
  }
  function skipSeparationSpace(state, allowComments) {
    let lineBreaks = 0;
    let ch = state.input.charCodeAt(state.position);
    let hasSeparation = state.position === state.lineStart || isWsOrEol(state.input.charCodeAt(state.position - 1));
    while (ch !== 0) {
      while (isWhiteSpace(ch)) {
        hasSeparation = true;
        if (ch === 9 && state.firstTabInLine === -1) state.firstTabInLine = state.position;
        ch = state.input.charCodeAt(++state.position);
      }
      if (allowComments && hasSeparation && ch === 35) do
        ch = state.input.charCodeAt(++state.position);
      while (!isEol(ch) && ch !== 0);
      if (!isEol(ch)) break;
      consumeLineBreak(state);
      lineBreaks++;
      hasSeparation = true;
      ch = state.input.charCodeAt(state.position);
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    }
    return lineBreaks;
  }
  function testDocumentSeparator(state, position = state.position) {
    const ch = state.input.charCodeAt(position);
    if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(position + 1) && ch === state.input.charCodeAt(position + 2)) {
      const following = state.input.charCodeAt(position + 3);
      return following === 0 || isWsOrEol(following);
    }
    return false;
  }
  function skipByteOrderMark(state) {
    if (state.position === state.lineStart && state.input.charCodeAt(state.position) === 65279) {
      state.position++;
      state.lineStart = state.position;
    }
  }
  function testDocumentBoundary(state) {
    if (state.position !== state.lineStart) return false;
    if (testDocumentSeparator(state)) return true;
    if (state.input.charCodeAt(state.position) !== 65279) return false;
    const snapshot = snapshotState(state);
    skipByteOrderMark(state);
    skipSeparationSpace(state, true);
    const ch = state.input.charCodeAt(state.position);
    const result = state.position === state.lineStart && (ch === 37 || ch === 45 && testDocumentSeparator(state));
    restoreState(state, snapshot);
    return result;
  }
  function skipUntilLineEnd(state) {
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0 && !isEol(ch)) ch = state.input.charCodeAt(++state.position);
  }
  function checkPrintable(state, start, end) {
    if (PATTERN_NON_PRINTABLE.test(state.input.slice(start, end))) throwError(state, "the stream contains non-printable characters");
  }
  function readTagProperty(state, props, inFlow) {
    if (state.input.charCodeAt(state.position) !== 33) return false;
    if (props.tagStart !== NO_RANGE$1) throwError(state, "duplication of a tag property");
    const start = state.position;
    let isVerbatim = false;
    let isNamed = false;
    let tagHandle = "!";
    let ch = state.input.charCodeAt(++state.position);
    if (ch === 60) {
      isVerbatim = true;
      ch = state.input.charCodeAt(++state.position);
    } else if (ch === 33) {
      isNamed = true;
      tagHandle = "!!";
      ch = state.input.charCodeAt(++state.position);
    }
    let suffixStart = state.position;
    let tagName;
    if (isVerbatim) {
      while (ch !== 0 && ch !== 62) ch = state.input.charCodeAt(++state.position);
      if (ch !== 62) throwError(state, "unexpected end of the stream within a verbatim tag");
      tagName = state.input.slice(suffixStart, state.position);
      state.position++;
    } else {
      while (ch !== 0 && !isWsOrEol(ch) && !(inFlow && isFlowIndicator(ch))) {
        if (ch === 33) if (!isNamed) {
          tagHandle = state.input.slice(suffixStart - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) throwError(state, "named tag handle cannot contain such characters");
          isNamed = true;
          suffixStart = state.position + 1;
        } else throwError(state, "tag suffix cannot contain exclamation marks");
        ch = state.input.charCodeAt(++state.position);
      }
      tagName = state.input.slice(suffixStart, state.position);
      if (PATTERN_FLOW_INDICATORS.test(tagName)) throwError(state, "tag suffix cannot contain flow indicator characters");
    }
    if (tagName && !(isVerbatim ? PATTERN_TAG_URI.test(tagName) : PATTERN_TAG_SUFFIX.test(tagName))) throwError(state, `tag name cannot contain such characters: ${tagName}`);
    if (!isVerbatim && tagHandle !== "!" && tagHandle !== "!!" && !HAS_OWN.call(state.tagHandlers, tagHandle)) throwError(state, `undeclared tag handle "${tagHandle}"`);
    props.tagStart = start;
    props.tagEnd = state.position;
    return true;
  }
  function readAnchorProperty(state, props) {
    if (state.input.charCodeAt(state.position) !== 38) return false;
    if (props.anchorStart !== NO_RANGE$1) throwError(state, "duplication of an anchor property");
    state.position++;
    const start = state.position;
    while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
    if (state.position === start) throwError(state, "name of an anchor node must contain at least one character");
    props.anchorStart = start;
    props.anchorEnd = state.position;
    return true;
  }
  function readAlias(state, props) {
    if (state.input.charCodeAt(state.position) !== 42) return false;
    if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) throwError(state, "alias node should not have any properties");
    state.position++;
    const start = state.position;
    while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position)) && !isFlowIndicator(state.input.charCodeAt(state.position))) state.position++;
    if (state.position === start) throwError(state, "name of an alias node must contain at least one character");
    addAliasEvent(state, start, state.position);
    return true;
  }
  function readFlowScalarBreak(state, nodeIndent) {
    skipSeparationSpace(state, false);
    if (state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
  }
  function readSingleQuotedScalar(state, nodeIndent, props) {
    if (state.input.charCodeAt(state.position) !== 39) return false;
    state.position++;
    const start = state.position;
    let simple = true;
    while (state.input.charCodeAt(state.position) !== 0) {
      const ch = state.input.charCodeAt(state.position);
      if (ch === 39) {
        if (state.input.charCodeAt(state.position + 1) === 39) {
          simple = false;
          state.position += 2;
          continue;
        }
        const end = state.position;
        state.position++;
        addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.SINGLE_QUOTED, CHOMPING_MODE.CLIP, -1, simple);
        return true;
      }
      if (isEol(ch)) {
        simple = false;
        readFlowScalarBreak(state, nodeIndent);
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a single quoted scalar");
      else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
      else state.position++;
    }
    throwError(state, "unexpected end of the stream within a single quoted scalar");
  }
  function readDoubleQuotedScalar(state, nodeIndent, props) {
    if (state.input.charCodeAt(state.position) !== 34) return false;
    state.position++;
    const start = state.position;
    let simple = true;
    while (state.input.charCodeAt(state.position) !== 0) {
      const ch = state.input.charCodeAt(state.position);
      if (ch === 34) {
        const end = state.position;
        state.position++;
        addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.DOUBLE_QUOTED, CHOMPING_MODE.CLIP, -1, simple);
        return true;
      }
      if (ch === 92) {
        simple = false;
        const escaped = state.input.charCodeAt(++state.position);
        if (isEol(escaped)) readFlowScalarBreak(state, nodeIndent);
        else if (isSimpleEscape(escaped)) state.position++;
        else {
          let hexLength = escapedHexLen(escaped);
          if (hexLength === 0) throwError(state, "unknown escape sequence");
          while (hexLength-- > 0) {
            state.position++;
            if (fromHexCode(state.input.charCodeAt(state.position)) < 0) throwError(state, "expected hexadecimal character");
          }
          state.position++;
        }
      } else if (isEol(ch)) {
        simple = false;
        readFlowScalarBreak(state, nodeIndent);
      } else if (state.position === state.lineStart && testDocumentSeparator(state)) throwError(state, "unexpected end of the document within a double quoted scalar");
      else if (ch !== 9 && ch < 32) throwError(state, "expected valid JSON character");
      else state.position++;
    }
    throwError(state, "unexpected end of the stream within a double quoted scalar");
  }
  function readBlockScalar(state, parentIndent, props) {
    const ch = state.input.charCodeAt(state.position);
    let chomping = CHOMPING_MODE.CLIP;
    let indent = -1;
    let detectedIndent = false;
    if (ch !== 124 && ch !== 62) return false;
    const style = ch === 124 ? SCALAR_STYLE.LITERAL_BLOCK : SCALAR_STYLE.FOLDED_BLOCK;
    state.position++;
    while (state.input.charCodeAt(state.position) !== 0) {
      const current = state.input.charCodeAt(state.position);
      const digit = fromDecimalCode(current);
      if (current === 43 || current === 45) {
        if (chomping !== CHOMPING_MODE.CLIP) throwError(state, "repeat of a chomping mode identifier");
        chomping = current === 43 ? CHOMPING_MODE.KEEP : CHOMPING_MODE.STRIP;
        state.position++;
      } else if (digit >= 0) {
        if (digit === 0) throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
        if (detectedIndent) throwError(state, "repeat of an indentation width identifier");
        indent = parentIndent + digit - 1;
        detectedIndent = true;
        state.position++;
      } else break;
    }
    let hadWhitespace = false;
    while (isWhiteSpace(state.input.charCodeAt(state.position))) {
      hadWhitespace = true;
      state.position++;
    }
    if (hadWhitespace && state.input.charCodeAt(state.position) === 35) skipUntilLineEnd(state);
    if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
    else if (state.input.charCodeAt(state.position) !== 0) throwError(state, "a line break is expected");
    let contentIndent = detectedIndent ? indent : -1;
    let maxLeadingIndent = 0;
    const valueStart = state.position;
    let valueEnd = state.position;
    while (state.input.charCodeAt(state.position) !== 0) {
      const linePosition = state.position;
      let column = 0;
      while (state.input.charCodeAt(linePosition + column) === 32) column++;
      const first = state.input.charCodeAt(linePosition + column);
      if (first === 0) {
        if (contentIndent >= 0) {
          if (column > contentIndent) valueEnd = linePosition + column;
        } else if (column > 0) valueEnd = linePosition + column;
        break;
      }
      if (testDocumentBoundary(state)) break;
      if (!detectedIndent && contentIndent === -1 && isEol(first)) maxLeadingIndent = Math.max(maxLeadingIndent, column);
      if (!detectedIndent && contentIndent === -1 && !isEol(first)) {
        if (first === 9 && column < parentIndent) {
          state.position = linePosition + column;
          throwError(state, "tab characters must not be used in indentation");
        }
        if (column >= parentIndent && column < maxLeadingIndent) {
          state.position = linePosition + column;
          throwError(state, "bad indentation of a mapping entry");
        }
      }
      if (contentIndent === -1 && first !== 0 && !isEol(first) && column < parentIndent) {
        state.lineIndent = column;
        state.position = linePosition + column;
        break;
      }
      if (!detectedIndent && first !== 0 && !isEol(first) && contentIndent === -1) contentIndent = column;
      const requiredIndent = contentIndent === -1 ? parentIndent + 1 : contentIndent;
      if (first !== 0 && !isEol(first) && column < requiredIndent) {
        state.lineIndent = column;
        state.position = linePosition + column;
        break;
      }
      skipUntilLineEnd(state);
      valueEnd = state.position;
      if (isEol(state.input.charCodeAt(state.position))) {
        consumeLineBreak(state);
        valueEnd = state.position;
      }
    }
    checkPrintable(state, valueStart, valueEnd);
    addScalarEvent(state, valueStart, valueEnd, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, style, chomping, contentIndent);
    return true;
  }
  function canStartPlainScalar(state, nodeContext) {
    const ch = state.input.charCodeAt(state.position);
    const inFlow = nodeContext === CONTEXT_FLOW_IN;
    if (ch === 0 || isWsOrEol(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96 || inFlow && isFlowIndicator(ch)) return false;
    if (ch === 63 || ch === 45) {
      const following = state.input.charCodeAt(state.position + 1);
      if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) return false;
    }
    return true;
  }
  function readPlainScalar(state, nodeIndent, nodeContext, props) {
    if (!canStartPlainScalar(state, nodeContext)) return false;
    const start = state.position;
    let end = state.position;
    let ch = state.input.charCodeAt(state.position);
    const inFlow = nodeContext === CONTEXT_FLOW_IN;
    let multiline = false;
    while (ch !== 0) {
      if (testDocumentBoundary(state)) break;
      if (ch === 58) {
        const following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEolOrEnd(following) || inFlow && isFlowIndicator(following)) break;
      } else if (ch === 35) {
        if (isWsOrEol(state.input.charCodeAt(state.position - 1))) break;
      } else if (inFlow && isFlowIndicator(ch)) break;
      else if (isEol(ch)) {
        const savedPosition = state.position;
        const savedLine = state.line;
        const savedLineStart = state.lineStart;
        const savedLineIndent = state.lineIndent;
        skipSeparationSpace(state, false);
        if (state.lineIndent >= nodeIndent) {
          multiline = true;
          ch = state.input.charCodeAt(state.position);
          continue;
        }
        state.position = savedPosition;
        state.line = savedLine;
        state.lineStart = savedLineStart;
        state.lineIndent = savedLineIndent;
        break;
      }
      if (!isWhiteSpace(ch)) end = state.position + 1;
      ch = state.input.charCodeAt(++state.position);
    }
    if (end === start) return false;
    checkPrintable(state, start, end);
    addScalarEvent(state, start, end, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.PLAIN, CHOMPING_MODE.CLIP, -1, !multiline);
    return true;
  }
  function skipFlowSeparationSpace(state, nodeIndent) {
    const startLine = state.line;
    skipSeparationSpace(state, true);
    if (state.line > startLine && state.lineIndent < nodeIndent || state.firstTabInLine !== -1 && state.lineIndent < nodeIndent) throwError(state, "deficient indentation");
  }
  function readFlowCollection(state, nodeIndent, props) {
    const ch = state.input.charCodeAt(state.position);
    const isMapping = ch === 123;
    const start = state.position;
    let readNext = true;
    if (ch !== 91 && ch !== 123) return false;
    const terminator = isMapping ? 125 : 93;
    if (isMapping) addMappingEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.FLOW);
    else addSequenceEvent(state, start, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.FLOW);
    state.position++;
    while (state.input.charCodeAt(state.position) !== 0) {
      skipFlowSeparationSpace(state, nodeIndent);
      let ch2 = state.input.charCodeAt(state.position);
      if (ch2 === terminator) {
        state.position++;
        addPopEvent(state);
        return true;
      } else if (!readNext) throwError(state, "missed comma between flow collection entries");
      else if (ch2 === 44) throwError(state, "expected the node content, but found ','");
      let isPair = false;
      let isExplicitPair = false;
      if (ch2 === 63 && isWsOrEol(state.input.charCodeAt(state.position + 1))) {
        isPair = isExplicitPair = true;
        state.position += 1;
        skipFlowSeparationSpace(state, nodeIndent);
      }
      const entryLine = state.line;
      const entryStart = snapshotState(state);
      const keyWasRead = parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      skipFlowSeparationSpace(state, nodeIndent);
      ch2 = state.input.charCodeAt(state.position);
      if ((isMapping || isExplicitPair || state.line === entryLine) && ch2 === 58) {
        isPair = true;
        state.position++;
        skipFlowSeparationSpace(state, nodeIndent);
        if (!isMapping) {
          insertFlowPairMappingEvent(state, entryStart);
          if (!keyWasRead) addEmptyScalarEvent(state);
        } else if (!keyWasRead) addEmptyScalarEvent(state);
        if (!parseNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true)) addEmptyScalarEvent(state);
        skipFlowSeparationSpace(state, nodeIndent);
        if (!isMapping) addPopEvent(state);
      } else if (isMapping && isPair) {
        if (!keyWasRead) addEmptyScalarEvent(state);
        addEmptyScalarEvent(state);
      } else if (isMapping) addEmptyScalarEvent(state);
      else if (isPair) {
        insertFlowPairMappingEvent(state, entryStart);
        if (!keyWasRead) addEmptyScalarEvent(state);
        addEmptyScalarEvent(state);
        addPopEvent(state);
      }
      ch2 = state.input.charCodeAt(state.position);
      if (ch2 === 44) {
        readNext = true;
        state.position++;
      } else readNext = false;
    }
    throwError(state, "unexpected end of the stream within a flow collection");
  }
  function readBlockSequence(state, nodeIndent, props) {
    if (state.firstTabInLine !== -1 || state.input.charCodeAt(state.position) !== 45 || !isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) return false;
    addSequenceEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
    while (state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) {
      if (state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      const entryLine = state.line;
      state.position++;
      const hadBreak = skipSeparationSpace(state, true) > 0;
      if (state.firstTabInLine !== -1 && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
      if (hadBreak && state.lineIndent <= nodeIndent) addEmptyScalarEvent(state);
      else parseNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
      skipSeparationSpace(state, true);
      if (state.lineIndent < nodeIndent || state.position >= state.length) break;
      if (state.lineIndent > nodeIndent) throwError(state, "bad indentation of a sequence entry");
      if (state.line === entryLine && state.input.charCodeAt(state.position) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 1))) throwError(state, "bad indentation of a sequence entry");
    }
    addPopEvent(state);
    return true;
  }
  function readBlockMapping(state, nodeIndent, flowIndent, props) {
    let atExplicitKey = false;
    let detected = false;
    let mappingOpened = false;
    let pendingExplicitKey = false;
    if (state.firstTabInLine !== -1) return false;
    let ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
      if (!atExplicitKey && state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }
      const following = state.input.charCodeAt(state.position + 1);
      const entryLine = state.line;
      if ((ch === 63 || ch === 58) && isWsOrEolOrEnd(following)) {
        if (!mappingOpened) {
          addMappingEvent(state, state.position, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, COLLECTION_STYLE.BLOCK);
          mappingOpened = true;
        }
        if (ch === 63) {
          if (atExplicitKey) addEmptyScalarEvent(state);
          detected = true;
          atExplicitKey = true;
        } else if (atExplicitKey) atExplicitKey = false;
        else {
          addEmptyScalarEvent(state);
          detected = true;
          atExplicitKey = false;
        }
        state.position += 1;
        pendingExplicitKey = true;
      } else {
        if (atExplicitKey) {
          addEmptyScalarEvent(state);
          atExplicitKey = false;
        }
        const beforeKey = snapshotState(state);
        if (!parseNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) break;
        if (state.line === entryLine) {
          ch = state.input.charCodeAt(state.position);
          while (isWhiteSpace(ch)) ch = state.input.charCodeAt(++state.position);
          if (ch === 58) {
            ch = state.input.charCodeAt(++state.position);
            if (!isWsOrEolOrEnd(ch)) throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
            if (!mappingOpened) {
              state.events.splice(beforeKey.eventsLength, 0, {
                type: EVENT_ID.MAPPING,
                start: beforeKey.position,
                anchorStart: props.anchorStart,
                anchorEnd: props.anchorEnd,
                tagStart: props.tagStart,
                tagEnd: props.tagEnd,
                style: COLLECTION_STYLE.BLOCK
              });
              mappingOpened = true;
            }
            detected = true;
            atExplicitKey = false;
            pendingExplicitKey = false;
          } else if (detected) throwError(state, "expected ':' after a mapping key");
          else {
            if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
              restoreState(state, beforeKey);
              return false;
            }
            return true;
          }
        } else if (detected) throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
        else {
          if (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1) {
            restoreState(state, beforeKey);
            return false;
          }
          return true;
        }
      }
      if (parseNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, pendingExplicitKey)) pendingExplicitKey = false;
      if (!atExplicitKey) {
        if (pendingExplicitKey) {
          addEmptyScalarEvent(state);
          pendingExplicitKey = false;
        }
      }
      skipSeparationSpace(state, true);
      ch = state.input.charCodeAt(state.position);
      if ((state.line === entryLine || state.lineIndent > nodeIndent) && ch !== 0) throwError(state, "bad indentation of a mapping entry");
      else if (state.lineIndent < nodeIndent) break;
    }
    if (!detected) return false;
    if (atExplicitKey) addEmptyScalarEvent(state);
    if (mappingOpened) addPopEvent(state);
    return true;
  }
  function parseNode(state, parentIndent, nodeContext, allowToSeek, allowCompact, allowPropertyMapping = true) {
    var _a, _b;
    if (state.depth >= state.maxDepth) throwError(state, `nesting exceeded maxDepth (${state.maxDepth})`);
    state.depth++;
    let indentStatus = 1;
    let atNewLine = false;
    let hasContent = false;
    let propertyStart = null;
    const props = emptyProperties();
    let allowBlockScalars = nodeContext === CONTEXT_BLOCK_OUT || nodeContext === CONTEXT_BLOCK_IN;
    let allowBlockCollections = allowBlockScalars;
    const allowBlockStyles = allowBlockScalars;
    if (allowToSeek && skipSeparationSpace(state, true)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) indentStatus = 1;
      else if (state.lineIndent === parentIndent) indentStatus = 0;
      else indentStatus = -1;
    }
    if (indentStatus === 1) while (true) {
      const ch = state.input.charCodeAt(state.position);
      const propertyState = snapshotState(state);
      if (atNewLine && indentStatus !== 1 && (ch === 33 || ch === 38)) break;
      if (atNewLine && allowBlockStyles && (props.tagStart !== NO_RANGE$1 || props.anchorStart !== NO_RANGE$1) && (ch === 33 || ch === 38)) {
        const fallbackState = snapshotState(state);
        const flowIndent = parentIndent + 1;
        if (readBlockMapping(state, state.position - state.lineStart, flowIndent, props) && ((_a = state.events[fallbackState.eventsLength]) == null ? void 0 : _a.type) === EVENT_ID.MAPPING) {
          state.depth--;
          return true;
        }
        restoreState(state, fallbackState);
      }
      if (atNewLine && (ch === 33 && props.tagStart !== NO_RANGE$1 || ch === 38 && props.anchorStart !== NO_RANGE$1)) break;
      if (!readTagProperty(state, props, nodeContext === CONTEXT_FLOW_IN) && !readAnchorProperty(state, props)) break;
      if (propertyStart === null) propertyStart = propertyState;
      if (skipSeparationSpace(state, true)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) indentStatus = 1;
        else if (state.lineIndent === parentIndent) indentStatus = 0;
        else indentStatus = -1;
      } else allowBlockCollections = false;
    }
    if (allowBlockCollections) allowBlockCollections = atNewLine || allowCompact;
    if (indentStatus === 1 || nodeContext === CONTEXT_BLOCK_OUT) {
      const flowIndent = nodeContext === CONTEXT_FLOW_IN || nodeContext === CONTEXT_FLOW_OUT ? parentIndent : parentIndent + 1;
      const blockIndent = state.position - state.lineStart;
      if (indentStatus === 1) if (allowBlockCollections && (readBlockSequence(state, blockIndent, props) || readBlockMapping(state, blockIndent, flowIndent, props)) || readFlowCollection(state, flowIndent, props)) hasContent = true;
      else {
        const ch = state.input.charCodeAt(state.position);
        if (propertyStart !== null && allowPropertyMapping && allowBlockStyles && !allowBlockCollections && ch !== 124 && ch !== 62) {
          const fallbackState = snapshotState(state);
          const propertyIndent = propertyStart.position - propertyStart.lineStart;
          restoreState(state, propertyStart);
          if (readBlockMapping(state, propertyIndent, flowIndent, emptyProperties()) && ((_b = state.events[fallbackState.eventsLength]) == null ? void 0 : _b.type) === EVENT_ID.MAPPING) hasContent = true;
          else restoreState(state, fallbackState);
        }
        if (!hasContent && (allowBlockScalars && readBlockScalar(state, flowIndent, props) || readSingleQuotedScalar(state, flowIndent, props) || readDoubleQuotedScalar(state, flowIndent, props) || readAlias(state, props) || readPlainScalar(state, flowIndent, nodeContext, props))) hasContent = true;
      }
      else if (indentStatus === 0) hasContent = allowBlockCollections && readBlockSequence(state, blockIndent, props);
    }
    allowBlockScalars = allowBlockScalars && !hasContent;
    if (!hasContent && (props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1 || allowBlockScalars)) {
      addScalarEvent(state, NO_RANGE$1, NO_RANGE$1, props.anchorStart, props.anchorEnd, props.tagStart, props.tagEnd, SCALAR_STYLE.PLAIN);
      hasContent = true;
    }
    state.depth--;
    return hasContent || props.anchorStart !== NO_RANGE$1 || props.tagStart !== NO_RANGE$1;
  }
  function readDirective(state) {
    if (state.lineIndent > 0 || state.input.charCodeAt(state.position) !== 37) return false;
    state.position++;
    const nameStart = state.position;
    while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
    const name = state.input.slice(nameStart, state.position);
    const args = [];
    if (name.length === 0) throwError(state, "directive name must not be less than one character in length");
    while (state.input.charCodeAt(state.position) !== 0 && !isEol(state.input.charCodeAt(state.position))) {
      while (isWhiteSpace(state.input.charCodeAt(state.position))) state.position++;
      if (state.input.charCodeAt(state.position) === 35 || isEol(state.input.charCodeAt(state.position)) || state.input.charCodeAt(state.position) === 0) break;
      const start = state.position;
      while (state.input.charCodeAt(state.position) !== 0 && !isWsOrEol(state.input.charCodeAt(state.position))) state.position++;
      args.push(state.input.slice(start, state.position));
    }
    if (isEol(state.input.charCodeAt(state.position))) consumeLineBreak(state);
    if (name === "YAML") {
      if (state.directives.some((directive) => directive.kind === "yaml")) throwError(state, "duplication of %YAML directive");
      if (args.length !== 1) throwError(state, "YAML directive accepts exactly one argument");
      const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
      if (match === null) throwError(state, "ill-formed argument of the YAML directive");
      if (parseInt(match[1], 10) !== 1) throwError(state, "unacceptable YAML version of the document");
      state.directives.push({
        kind: "yaml",
        version: args[0]
      });
    } else if (name === "TAG") {
      if (args.length !== 2) throwError(state, "TAG directive accepts exactly two arguments");
      const [handle, prefix] = args;
      if (!PATTERN_TAG_HANDLE.test(handle)) throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
      if (HAS_OWN.call(state.tagHandlers, handle)) throwError(state, `there is a previously declared suffix for "${handle}" tag handle`);
      if (!PATTERN_TAG_PREFIX.test(prefix)) throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
      state.tagHandlers[handle] = prefix;
      state.directives.push({
        kind: "tag",
        handle,
        prefix
      });
    }
    return true;
  }
  function readDocument(state) {
    state.directives = [];
    state.tagHandlers = /* @__PURE__ */ Object.create(null);
    let hasDirectives = false;
    skipSeparationSpace(state, true);
    while (readDirective(state)) {
      hasDirectives = true;
      skipSeparationSpace(state, true);
    }
    let explicitStart = false;
    let explicitEnd = false;
    let allowCompact = true;
    if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45 && isWsOrEolOrEnd(state.input.charCodeAt(state.position + 3))) {
      explicitStart = true;
      const markerLine = state.line;
      state.position += 3;
      skipSeparationSpace(state, true);
      allowCompact = state.line > markerLine;
    } else if (hasDirectives) throwError(state, "directives end mark is expected");
    const documentEventIndex = state.events.length;
    if (!explicitStart && state.position === state.lineStart && state.input.charCodeAt(state.position) === 46 && testDocumentSeparator(state)) {
      state.position += 3;
      skipSeparationSpace(state, true);
      return;
    }
    addDocumentEvent(state, explicitStart, false);
    if (!parseNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, allowCompact, allowCompact)) addEmptyScalarEvent(state);
    skipSeparationSpace(state, true);
    if (state.position === state.lineStart && testDocumentSeparator(state)) {
      explicitEnd = state.input.charCodeAt(state.position) === 46;
      if (explicitEnd) {
        const markerLine = state.line;
        state.position += 3;
        skipSeparationSpace(state, true);
        if (state.line === markerLine && state.position < state.length) throwError(state, "end of the stream or a document separator is expected");
      }
    }
    const documentEvent = state.events[documentEventIndex];
    if ((documentEvent == null ? void 0 : documentEvent.type) === EVENT_ID.DOCUMENT) documentEvent.explicitEnd = explicitEnd;
    addPopEvent(state);
    if (!explicitEnd && state.position < state.length && !testDocumentBoundary(state)) throwError(state, "end of the stream or a document separator is expected");
  }
  function parseEvents(input, options) {
    const length = input.length;
    const state = {
      ...DEFAULT_PARSER_OPTIONS,
      ...options,
      input: `${input}\0`,
      length,
      position: 0,
      line: 0,
      lineStart: 0,
      lineIndent: 0,
      firstTabInLine: -1,
      depth: 0,
      directives: [],
      tagHandlers: /* @__PURE__ */ Object.create(null),
      events: []
    };
    const nullpos = input.indexOf("\0");
    if (nullpos !== -1) YAMLException.throwAt(input, nullpos, "null byte is not allowed in input", state.filename);
    while (state.position < state.length) {
      skipByteOrderMark(state);
      skipSeparationSpace(state, true);
      if (state.position >= state.length) break;
      const documentStart = state.position;
      readDocument(state);
      if (state.position === documentStart)
        throwError(state, "can not read a document");
    }
    return state.events;
  }
  function loadDocuments(input, options = {}) {
    const opts = {
      ...DEFAULT_LOAD_OPTIONS,
      ...options
    };
    const source = String(input);
    const PARSER_OPT_KEYS = Object.keys(DEFAULT_PARSER_OPTIONS);
    const CONSTRUCTOR_OPT_KEYS = Object.keys(DEFAULT_CONSTRUCTOR_OPTIONS);
    return constructFromEvents(parseEvents(source, pick(opts, PARSER_OPT_KEYS)), {
      ...pick(opts, CONSTRUCTOR_OPT_KEYS),
      source
    });
  }
  function load(input, options) {
    const documents = loadDocuments(input, options);
    if (documents.length === 0) throw new YAMLException("expected a document, but the input is empty");
    if (documents.length === 1) return documents[0];
    throw new YAMLException("expected a single document in the stream, but found more");
  }
  function hasBit(mask, bit) {
    return (mask & 1 << bit) !== 0;
  }
  function _preferredQuotedStyle(layout) {
    if (layout.presenterOptions.quoteStyle === "single" && hasBit(layout.allowedStylesMask, SCALAR_STYLE.SINGLE_QUOTED)) return SCALAR_STYLE.SINGLE_QUOTED;
    return SCALAR_STYLE.DOUBLE_QUOTED;
  }
  function applyQuoteFlowKeysOption(layout) {
    if (!layout.presenterOptions.quoteFlowKeys) return;
    if (!layout.isKey || !layout.flowOnly || layout.style !== SCALAR_STYLE.PLAIN) return;
    layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
  }
  function doubleQuoteForInvisibles(layout) {
    if (layout.style === SCALAR_STYLE.PLAIN && /[\t\x7F-\xA0\u2028\u2029\uFEFF\uFFFE\uFFFF]/.test(layout.node.value)) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
  }
  function doubleQuoteWhitespaceOnly(layout) {
    if (layout.style === SCALAR_STYLE.PLAIN && /^\s+$/.test(layout.node.value)) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
  }
  function applyForceQuotesOption(layout) {
    if (!layout.presenterOptions.forceQuotes) return;
    if (layout.isKey || layout.style !== SCALAR_STYLE.PLAIN) return;
    if (layout.node.tag !== layout.presenterOptions.schema.defaultScalarTag.tagName) return;
    layout.style = layout.node.value.includes("\n") ? SCALAR_STYLE.DOUBLE_QUOTED : _preferredQuotedStyle(layout);
  }
  function tryLongOrMultilineAsBlock(layout) {
    if (layout.style !== SCALAR_STYLE.PLAIN || layout.isKey) return;
    const value = layout.node.value;
    const multiline = value.indexOf("\n") !== -1;
    if (!hasBit(layout.allowedStylesMask, SCALAR_STYLE.LITERAL_BLOCK)) {
      if (multiline) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
      return;
    }
    const w = layout.presenterOptions.lineWidth;
    if (w === -1) {
      if (multiline) layout.style = SCALAR_STYLE.LITERAL_BLOCK;
      return;
    }
    const availableWidth = Math.max(Math.min(w, 40), w - layout.shiftOfContent);
    let position = 0;
    let shouldFold = false;
    while (position <= value.length) {
      let lineEnd = value.length;
      const nextLineBreak = value.indexOf("\n", position);
      if (nextLineBreak !== -1) lineEnd = nextLineBreak;
      const line = value.slice(position, lineEnd);
      if (line.length > availableWidth && line[0] !== " " && / [^ \t]/.test(line)) shouldFold = true;
      if (nextLineBreak === -1) break;
      position = nextLineBreak + 1;
    }
    if (shouldFold) layout.style = SCALAR_STYLE.FOLDED_BLOCK;
    else if (multiline) layout.style = SCALAR_STYLE.LITERAL_BLOCK;
  }
  function quoteInvalidPlain(layout) {
    if (layout.style === SCALAR_STYLE.PLAIN && !hasBit(layout.allowedStylesMask, SCALAR_STYLE.PLAIN)) layout.style = _preferredQuotedStyle(layout);
  }
  function fallbackToDoubleQuoted(layout) {
    if (!hasBit(layout.allowedStylesMask, layout.style)) layout.style = SCALAR_STYLE.DOUBLE_QUOTED;
  }
  var NOT_RESOLVED, strTag, NULL_VALUES$1, nullCoreTag, nullJsonTag, NULL_VALUES, nullYaml11Tag, TRUE_VALUES$2, FALSE_VALUES$2, boolCoreTag, TRUE_VALUES$1, FALSE_VALUES$1, boolJsonTag, TRUE_VALUES, FALSE_VALUES, boolYaml11Tag, YAML_INTEGER_IMPLICIT_PATTERN$1, YAML_INTEGER_EXPLICIT_PATTERN$1, intCoreTag, YAML_INTEGER_IMPLICIT_PATTERN, YAML_INTEGER_EXPLICIT_PATTERN, intJsonTag, YAML_INTEGER_PATTERN, intYaml11Tag, YAML_FLOAT_PATTERN$1, YAML_FLOAT_SPECIAL_PATTERN$1, floatCoreTag, YAML_FLOAT_IMPLICIT_PATTERN, YAML_FLOAT_EXPLICIT_PATTERN, floatJsonTag, YAML_FLOAT_PATTERN, YAML_FLOAT_SPECIAL_PATTERN, floatYaml11Tag, mergeTag, BASE64_PATTERN, binaryTag, YAML_DATE_REGEXP, YAML_TIMESTAMP_REGEXP, timestampTag, seqTag, omapTag, pairsTag, mapTag, setTag, Schema, FAILSAFE_SCHEMA, JSON_SCHEMA, CORE_SCHEMA, YAML11_SCHEMA, DUMP_SCHEMA, realMapTag, legacyMapTag, DEFAULT_SNIPPET_OPTIONS, YAMLException, EVENT_ID, SCALAR_STYLE, COLLECTION_STYLE, CHOMPING_MODE, NO_RANGE$3, simpleEscapeCheck, simpleEscapeMap, DEFAULT_TAG_HANDLERS, NO_RANGE$2, MERGE_TAG_NAME, DEFAULT_CONSTRUCTOR_OPTIONS, NO_RANGE$1, HAS_OWN, CONTEXT_FLOW_IN, CONTEXT_FLOW_OUT, CONTEXT_BLOCK_IN, CONTEXT_BLOCK_OUT, PATTERN_NON_PRINTABLE, PATTERN_FLOW_INDICATORS, PATTERN_TAG_HANDLE, NS_URI_CHAR, NS_TAG_CHAR, PATTERN_TAG_URI, PATTERN_TAG_SUFFIX, PATTERN_TAG_PREFIX, DEFAULT_PARSER_OPTIONS, DEFAULT_LOAD_OPTIONS, DEFAULT_SCALAR_STYLE_RULES, SRC_C_PRINTABLE, SRC_B_CHAR, SRC_C_BYTE_ORDER_MARK, SRC_S_WHITE, SRC_NB_CHAR, SRC_NS_CHAR, SRC_NB_JSON, SRC_C_INDICATOR, SRC_C_FLOW_INDICATOR, SRC_NS_PLAIN_SAFE_FLOW_OUT, SRC_NS_PLAIN_SAFE_FLOW_IN, SRC_NS_PLAIN_FIRST_FLOW_OUT, SRC_NS_PLAIN_FIRST_FLOW_IN, SRC_NS_PLAIN_CHAR_FLOW_OUT, SRC_NS_PLAIN_CHAR_FLOW_IN, SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT, SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN, SRC_NS_PLAIN_ONE_LINE_FLOW_OUT, SRC_NS_PLAIN_ONE_LINE_FLOW_IN, SRC_NS_PLAIN_ONE_LINE_BLOCK_KEY, SRC_NS_PLAIN_ONE_LINE_FLOW_KEY, SRC_S_NS_PLAIN_NEXT_LINE_FLOW_OUT, SRC_S_NS_PLAIN_NEXT_LINE_FLOW_IN, SRC_NS_PLAIN_MULTI_LINE_FLOW_OUT, SRC_NS_PLAIN_MULTI_LINE_FLOW_IN, NS_PLAIN_FLOW_OUT, NS_PLAIN_FLOW_IN, NS_PLAIN_BLOCK_KEY, NS_PLAIN_FLOW_KEY, NB_SINGLE_ONE_LINE, NB_SINGLE_MULTI_LINE, BLOCK_SCALAR_CONTENT, DEFAULT_PRESENTER_OPTIONS, DEFAULT_DUMP_OPTIONS, EVENT_DOCUMENT, EVENT_SEQUENCE, EVENT_MAPPING, EVENT_SCALAR, EVENT_ALIAS, EVENT_POP, SCALAR_STYLE_PLAIN, SCALAR_STYLE_SINGLE_QUOTED, SCALAR_STYLE_DOUBLE_QUOTED, SCALAR_STYLE_LITERAL_BLOCK, SCALAR_STYLE_FOLDED_BLOCK, COLLECTION_STYLE_BLOCK, COLLECTION_STYLE_FLOW, CHOMPING_CLIP, CHOMPING_STRIP, CHOMPING_KEEP;
  var init_js_yaml = __esm({
    "node_modules/.pnpm/js-yaml@5.4.3/node_modules/js-yaml/dist/js-yaml.mjs"() {
      NOT_RESOLVED = /* @__PURE__ */ Symbol("NOT_RESOLVED");
      strTag = defineScalarTag("tag:yaml.org,2002:str", {
        resolve: (source) => source,
        identify: (data) => typeof data === "string"
      });
      NULL_VALUES$1 = [
        "",
        "~",
        "null",
        "Null",
        "NULL"
      ];
      nullCoreTag = defineScalarTag("tag:yaml.org,2002:null", {
        implicit: true,
        implicitFirstChars: [
          "",
          "~",
          "n",
          "N"
        ],
        resolve: (source) => {
          if (NULL_VALUES$1.indexOf(source) !== -1) return null;
          return NOT_RESOLVED;
        },
        identify: (object) => object === null,
        represent: () => "null"
      });
      nullJsonTag = defineScalarTag("tag:yaml.org,2002:null", {
        implicit: true,
        implicitFirstChars: ["n"],
        resolve: (source, isExplicit) => {
          if (source === "null" || isExplicit && source === "") return null;
          return NOT_RESOLVED;
        },
        identify: (object) => object === null,
        represent: () => "null"
      });
      NULL_VALUES = [
        "",
        "~",
        "null",
        "Null",
        "NULL"
      ];
      nullYaml11Tag = defineScalarTag("tag:yaml.org,2002:null", {
        implicit: true,
        implicitFirstChars: [
          "",
          "~",
          "n",
          "N"
        ],
        resolve: (source) => {
          if (NULL_VALUES.indexOf(source) !== -1) return null;
          return NOT_RESOLVED;
        },
        identify: (object) => object === null,
        represent: () => "null"
      });
      TRUE_VALUES$2 = [
        "true",
        "True",
        "TRUE"
      ];
      FALSE_VALUES$2 = [
        "false",
        "False",
        "FALSE"
      ];
      boolCoreTag = defineScalarTag("tag:yaml.org,2002:bool", {
        implicit: true,
        implicitFirstChars: [
          "t",
          "T",
          "f",
          "F"
        ],
        resolve: (source) => {
          if (TRUE_VALUES$2.indexOf(source) !== -1) return true;
          if (FALSE_VALUES$2.indexOf(source) !== -1) return false;
          return NOT_RESOLVED;
        },
        identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
        represent: (object) => object ? "true" : "false"
      });
      TRUE_VALUES$1 = ["true"];
      FALSE_VALUES$1 = ["false"];
      boolJsonTag = defineScalarTag("tag:yaml.org,2002:bool", {
        implicit: true,
        implicitFirstChars: ["t", "f"],
        resolve: (source) => {
          if (TRUE_VALUES$1.indexOf(source) !== -1) return true;
          if (FALSE_VALUES$1.indexOf(source) !== -1) return false;
          return NOT_RESOLVED;
        },
        identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
        represent: (object) => object ? "true" : "false"
      });
      TRUE_VALUES = [
        "true",
        "True",
        "TRUE",
        "y",
        "Y",
        "yes",
        "Yes",
        "YES",
        "on",
        "On",
        "ON"
      ];
      FALSE_VALUES = [
        "false",
        "False",
        "FALSE",
        "n",
        "N",
        "no",
        "No",
        "NO",
        "off",
        "Off",
        "OFF"
      ];
      boolYaml11Tag = defineScalarTag("tag:yaml.org,2002:bool", {
        implicit: true,
        implicitFirstChars: [
          "y",
          "Y",
          "n",
          "N",
          "t",
          "T",
          "f",
          "F",
          "o",
          "O"
        ],
        resolve: (source) => {
          if (TRUE_VALUES.indexOf(source) !== -1) return true;
          if (FALSE_VALUES.indexOf(source) !== -1) return false;
          return NOT_RESOLVED;
        },
        identify: (object) => Object.prototype.toString.call(object) === "[object Boolean]",
        represent: (object) => object ? "true" : "false"
      });
      YAML_INTEGER_IMPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:0o[0-7]+|0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
      YAML_INTEGER_EXPLICIT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
      intCoreTag = defineScalarTag("tag:yaml.org,2002:int", {
        implicit: true,
        implicitFirstChars: [
          "-",
          "+",
          ..."0123456789"
        ],
        resolve: resolveYamlInteger$2,
        identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
        represent: (object) => object.toString(10)
      });
      YAML_INTEGER_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)$");
      YAML_INTEGER_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$");
      intJsonTag = defineScalarTag("tag:yaml.org,2002:int", {
        implicit: true,
        implicitFirstChars: ["-", ..."0123456789"],
        resolve: resolveYamlInteger$1,
        identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
        represent: (object) => object.toString(10)
      });
      YAML_INTEGER_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?0x[0-9a-fA-F_]+|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+|[-+]?(?:0|[1-9][0-9_]*))$");
      intYaml11Tag = defineScalarTag("tag:yaml.org,2002:int", {
        implicit: true,
        implicitFirstChars: [
          "-",
          "+",
          ..."0123456789"
        ],
        resolve: resolveYamlInteger,
        identify: (object) => Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0,
        represent: (object) => object.toString(10)
      });
      YAML_FLOAT_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
      YAML_FLOAT_SPECIAL_PATTERN$1 = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
      floatCoreTag = defineScalarTag("tag:yaml.org,2002:float", {
        implicit: true,
        implicitFirstChars: [
          "-",
          "+",
          ".",
          ..."0123456789"
        ],
        resolve: resolveYamlFloat$2,
        identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
        represent: representYamlFloat$2
      });
      YAML_FLOAT_IMPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$");
      YAML_FLOAT_EXPLICIT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?[0-9]+(?:\\.[0-9]*)?(?:[eE][-+]?[0-9]+)?|[-+]?\\.[0-9]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
      floatJsonTag = defineScalarTag("tag:yaml.org,2002:float", {
        implicit: true,
        implicitFirstChars: ["-", ..."0123456789"],
        resolve: resolveYamlFloat$1,
        identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
        represent: representYamlFloat$1
      });
      YAML_FLOAT_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?(?:(?:[0-9][0-9_]*)?\\.[0-9_]*)(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
      YAML_FLOAT_SPECIAL_PATTERN = /* @__PURE__ */ new RegExp("^(?:[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
      floatYaml11Tag = defineScalarTag("tag:yaml.org,2002:float", {
        implicit: true,
        implicitFirstChars: [
          "-",
          "+",
          ".",
          ..."0123456789"
        ],
        resolve: resolveYamlFloat,
        identify: (object) => typeof object === "number" && (!Number.isInteger(object) || Object.is(object, -0) || object.toString(10).indexOf("e") >= 0),
        represent: representYamlFloat
      });
      mergeTag = defineScalarTag("tag:yaml.org,2002:merge", {
        implicit: true,
        implicitFirstChars: ["<"],
        resolve: (source, isExplicit) => {
          if (source === "<<" || isExplicit && source === "") return "<<";
          return NOT_RESOLVED;
        },
        identify: () => false
      });
      BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
      binaryTag = defineScalarTag("tag:yaml.org,2002:binary", {
        resolve: resolveYamlBinary,
        identify: (object) => Object.prototype.toString.call(object) === "[object Uint8Array]",
        represent: representYamlBinary
      });
      YAML_DATE_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$");
      YAML_TIMESTAMP_REGEXP = /* @__PURE__ */ new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
      timestampTag = defineScalarTag("tag:yaml.org,2002:timestamp", {
        implicit: true,
        implicitFirstChars: [..."0123456789"],
        resolve: resolveYamlTimestamp,
        identify: (object) => object instanceof Date,
        represent: (object) => object.toISOString()
      });
      seqTag = defineSequenceTag("tag:yaml.org,2002:seq", {
        create: () => [],
        addItem: (container, item) => {
          container.push(item);
        },
        identify: Array.isArray
      });
      omapTag = defineSequenceTag("tag:yaml.org,2002:omap", {
        create: () => ({
          list: [],
          seen: /* @__PURE__ */ new Set()
        }),
        addItem: (carrier, item) => {
          let key;
          if (item instanceof Map) {
            if (item.size !== 1) return "cannot resolve an ordered map item";
            key = item.keys().next().value;
          } else if (isPlainObject(item)) {
            const itemKeys = Object.keys(item);
            if (itemKeys.length !== 1) return "cannot resolve an ordered map item";
            key = itemKeys[0];
          } else return "cannot resolve an ordered map item";
          if (carrier.seen.has(key)) return "duplicate key in ordered map";
          carrier.seen.add(key);
          carrier.list.push(item);
          return "";
        },
        finalize: (carrier) => carrier.list,
        identify: () => false
      });
      pairsTag = defineSequenceTag("tag:yaml.org,2002:pairs", {
        create: () => [],
        addItem: (container, item) => {
          if (item instanceof Map) {
            if (item.size !== 1) return "cannot resolve a pairs item";
            container.push(item.entries().next().value);
            return "";
          }
          if (Object.prototype.toString.call(item) !== "[object Object]") return "cannot resolve a pairs item";
          const object = item;
          const keys = Object.keys(object);
          if (keys.length !== 1) return "cannot resolve a pairs item";
          container.push([keys[0], object[keys[0]]]);
          return "";
        },
        identify: () => false
      });
      mapTag = defineMappingTag("tag:yaml.org,2002:map", {
        create: () => ({}),
        identify: isPlainObject,
        represent: (o) => {
          const map = /* @__PURE__ */ new Map();
          for (const key of Object.keys(o)) map.set(key, o[key]);
          return map;
        },
        addPair: (container, key, value) => {
          if (key !== null && typeof key === "object") return "object-based map does not support complex keys";
          const normalizedKey = String(key);
          if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
            value,
            enumerable: true,
            configurable: true,
            writable: true
          });
          else container[normalizedKey] = value;
          return "";
        },
        has: (container, key) => {
          if (key !== null && typeof key === "object") return false;
          return Object.prototype.hasOwnProperty.call(container, String(key));
        },
        keys: (container) => Object.keys(container),
        get: (container, key) => {
          const normalizedKey = String(key);
          if (!Object.prototype.hasOwnProperty.call(container, normalizedKey)) return null;
          return container[normalizedKey];
        }
      });
      setTag = defineMappingTag("tag:yaml.org,2002:set", {
        create: () => /* @__PURE__ */ new Set(),
        identify: (data) => data instanceof Set,
        represent: (data) => {
          const map = /* @__PURE__ */ new Map();
          for (const key of data) map.set(key, null);
          return map;
        },
        addPair: (container, key, value) => {
          if (value !== null) return "cannot resolve a set item";
          container.add(key);
          return "";
        },
        has: (container, key) => container.has(key),
        keys: (container) => container.keys(),
        get: () => null
      });
      Schema = class Schema2 {
        constructor(tags) {
          __publicField(this, "tags");
          /** @internal */
          __publicField(this, "implicitScalarTags");
          /**
          * Dispatch implicit scalar resolvers by `source.charAt(0)`. Each bucket holds
          * the resolvers that may match that key, in schema order; a key absent from
          * the map uses
          * {@link Schema.implicitScalarAnyFirstChar}
          * (resolvers that declared no first-char constraint, so they apply to any
          * first character).
          */
          __publicField(this, "implicitScalarByFirstChar");
          __publicField(this, "implicitScalarAnyFirstChar");
          /**
          * The default scalar tag (`!!str`), resolved once so the composer's fallback
          * for unresolved plain scalars avoids a keyed lookup per scalar.
          *
          * @internal
          */
          __publicField(this, "defaultScalarTag");
          /**
          * The default container tags (`!!seq` / `!!map`), used by the dumper: when a
          * value is identified by its default tag, the tag is implicit and not
          * printed. Undefined if the schema does not define them (then such values
          * can't be dumped).
          *
          * @internal
          */
          __publicField(this, "defaultSequenceTag");
          /** @internal */
          __publicField(this, "defaultMappingTag");
          __publicField(this, "exact");
          __publicField(this, "prefix");
          const compiledTags = compileTags(tags);
          const implicitScalarTags = [];
          const exact = createTagDefinitionMap();
          const prefix = createTagDefinitionListMap();
          for (const tag of compiledTags) {
            if (tag.nodeKind === "scalar" && tag.implicit) {
              if (tag.matchByTagPrefix) throw new Error("Implicit scalar tags cannot match by tag prefix");
              implicitScalarTags.push(tag);
            }
            switch (tag.nodeKind) {
              case "scalar":
                if (tag.matchByTagPrefix) prefix.scalar.push(tag);
                else exact.scalar[tag.tagName] = tag;
                break;
              case "sequence":
                if (tag.matchByTagPrefix) prefix.sequence.push(tag);
                else exact.sequence[tag.tagName] = tag;
                break;
              case "mapping":
                if (tag.matchByTagPrefix) prefix.mapping.push(tag);
                else exact.mapping[tag.tagName] = tag;
                break;
            }
          }
          const implicitScalarAnyFirstChar = implicitScalarTags.filter((tag) => tag.implicitFirstChars === null);
          const keys = /* @__PURE__ */ new Set();
          for (const tag of implicitScalarTags) if (tag.implicitFirstChars !== null) for (const key of tag.implicitFirstChars) keys.add(key);
          const implicitScalarByFirstChar = /* @__PURE__ */ new Map();
          for (const key of keys) implicitScalarByFirstChar.set(key, implicitScalarTags.filter((tag) => tag.implicitFirstChars === null || tag.implicitFirstChars.indexOf(key) !== -1));
          const defaultScalarTag = exact.scalar["tag:yaml.org,2002:str"];
          if (!defaultScalarTag) throw new Error("schema does not define the default scalar tag (tag:yaml.org,2002:str)");
          this.tags = compiledTags;
          this.implicitScalarTags = implicitScalarTags;
          this.implicitScalarByFirstChar = implicitScalarByFirstChar;
          this.implicitScalarAnyFirstChar = implicitScalarAnyFirstChar;
          this.defaultScalarTag = defaultScalarTag;
          this.defaultSequenceTag = exact.sequence["tag:yaml.org,2002:seq"];
          this.defaultMappingTag = exact.mapping["tag:yaml.org,2002:map"];
          this.exact = exact;
          this.prefix = prefix;
        }
        /** @internal */
        lookupScalarTag(tagName) {
          const exactTag = this.exact.scalar[tagName];
          if (exactTag) return exactTag;
          for (const tag of this.prefix.scalar) if (tagName.startsWith(tag.tagName)) return tag;
        }
        /** @internal */
        lookupSequenceTag(tagName) {
          const exactTag = this.exact.sequence[tagName];
          if (exactTag) return exactTag;
          for (const tag of this.prefix.sequence) if (tagName.startsWith(tag.tagName)) return tag;
        }
        /** @internal */
        lookupMappingTag(tagName) {
          const exactTag = this.exact.mapping[tagName];
          if (exactTag) return exactTag;
          for (const tag of this.prefix.mapping) if (tagName.startsWith(tag.tagName)) return tag;
        }
        /** @internal */
        resolveImplicitScalarTag(source) {
          var _a;
          const candidates = (_a = this.implicitScalarByFirstChar.get(source.charAt(0))) != null ? _a : this.implicitScalarAnyFirstChar;
          for (const tag2 of candidates) {
            const value = tag2.resolve(source, false, tag2.tagName);
            if (value !== NOT_RESOLVED) return {
              value,
              tag: tag2
            };
          }
          const tag = this.defaultScalarTag;
          return {
            value: tag.resolve(source, false, tag.tagName),
            tag
          };
        }
        /**
        * Creates a new schema with the specified tags added. If a tag already
        * exists, it is replaced by the specified tag.
        *
        * @example
        *
        * ```javascript
        * import { CORE_SCHEMA, mergeTag, realMapTag } from 'js-yaml'
        *
        * const schema = CORE_SCHEMA.withTags(mergeTag, realMapTag)
        * ```
        */
        withTags(...tags) {
          let flatTags = [];
          for (const tag of tags) flatTags = flatTags.concat(tag);
          return new Schema2([...this.tags, ...flatTags]);
        }
      };
      FAILSAFE_SCHEMA = new Schema([
        strTag,
        seqTag,
        mapTag
      ]);
      JSON_SCHEMA = new Schema([
        ...FAILSAFE_SCHEMA.tags,
        nullJsonTag,
        boolJsonTag,
        intJsonTag,
        floatJsonTag
      ]);
      CORE_SCHEMA = new Schema([
        ...FAILSAFE_SCHEMA.tags,
        nullCoreTag,
        boolCoreTag,
        intCoreTag,
        floatCoreTag
      ]);
      YAML11_SCHEMA = new Schema([
        ...FAILSAFE_SCHEMA.tags,
        nullYaml11Tag,
        boolYaml11Tag,
        intYaml11Tag,
        floatYaml11Tag,
        timestampTag,
        mergeTag,
        binaryTag,
        omapTag,
        pairsTag,
        setTag
      ]);
      DUMP_SCHEMA = YAML11_SCHEMA.withTags({
        ...intYaml11Tag,
        resolve: (source, isExplicit, tagName) => {
          const result = intYaml11Tag.resolve(source, isExplicit, tagName);
          return result === NOT_RESOLVED ? intCoreTag.resolve(source, isExplicit, tagName) : result;
        }
      }, {
        ...floatYaml11Tag,
        resolve: (source, isExplicit, tagName) => {
          const result = floatYaml11Tag.resolve(source, isExplicit, tagName);
          return result === NOT_RESOLVED ? floatCoreTag.resolve(source, isExplicit, tagName) : result;
        }
      });
      realMapTag = defineMappingTag("tag:yaml.org,2002:map", {
        create: () => /* @__PURE__ */ new Map(),
        addPair: (container, key, value) => {
          container.set(key, value);
          return "";
        },
        has: (container, key) => container.has(key),
        keys: (container) => container.keys(),
        get: (container, key) => container.get(key),
        identify: (data) => data instanceof Map || isPlainObject(data),
        represent: (data) => {
          if (data instanceof Map) return data;
          const map = /* @__PURE__ */ new Map();
          const obj = data;
          for (const key of Object.keys(obj)) map.set(key, obj[key]);
          return map;
        }
      });
      legacyMapTag = defineMappingTag("tag:yaml.org,2002:map", {
        create: () => ({}),
        identify: isPlainObject,
        represent: (o) => {
          const map = /* @__PURE__ */ new Map();
          for (const key of Object.keys(o)) map.set(key, o[key]);
          return map;
        },
        addPair: (container, key, value) => {
          const normalizedKey = normalizeKey(key);
          if (normalizedKey === null) return "nested arrays are not supported inside keys";
          if (normalizedKey === "__proto__") Object.defineProperty(container, normalizedKey, {
            value,
            enumerable: true,
            configurable: true,
            writable: true
          });
          else container[normalizedKey] = value;
          return "";
        },
        has: (container, key) => {
          const normalizedKey = normalizeKey(key);
          return normalizedKey !== null && Object.prototype.hasOwnProperty.call(container, normalizedKey);
        },
        keys: (container) => Object.keys(container),
        get: (container, key) => {
          const normalizedKey = String(key);
          if (!Object.prototype.hasOwnProperty.call(container, normalizedKey)) return null;
          return container[normalizedKey];
        }
      });
      DEFAULT_SNIPPET_OPTIONS = {
        maxLength: 79,
        indent: 1,
        linesBefore: 3,
        linesAfter: 2
      };
      YAMLException = class YAMLException2 extends Error {
        /**
        * Optional `mark` contains source snippet data. Usually, use
        * {@link YAMLException.throwAt} instead of passing it directly.
        */
        constructor(reason, mark) {
          super();
          __publicField(this, "reason");
          __publicField(this, "mark");
          this.name = "YAMLException";
          this.reason = reason;
          this.mark = mark;
          this.message = formatError(this, false);
          if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
        }
        /**
        * Returns the formatted error, omitting the source snippet in compact mode.
        */
        toString(compact) {
          return `${this.name}: ${formatError(this, compact)}`;
        }
        /**
        * Builds a YAMLException with a source snippet and throws it. `source` is
        * the raw input text; `position` is an offset into it.
        */
        static throwAt(source, position, message, filename = "") {
          let line = 0;
          let lineStart = 0;
          for (let index = 0; index < position; index++) {
            const ch = source.charCodeAt(index);
            if (ch === 10) {
              line++;
              lineStart = index + 1;
            } else if (ch === 13) {
              line++;
              if (source.charCodeAt(index + 1) === 10) index++;
              lineStart = index + 1;
            }
          }
          const mark = {
            name: filename,
            buffer: source,
            position,
            line,
            column: position - lineStart
          };
          mark.snippet = makeSnippet(mark);
          throw new YAMLException2(message, mark);
        }
      };
      EVENT_ID = {
        DOCUMENT: 1,
        SEQUENCE: 2,
        MAPPING: 3,
        SCALAR: 4,
        ALIAS: 5,
        POP: 6
      };
      SCALAR_STYLE = {
        PLAIN: 1,
        SINGLE_QUOTED: 2,
        DOUBLE_QUOTED: 3,
        LITERAL_BLOCK: 4,
        FOLDED_BLOCK: 5
      };
      COLLECTION_STYLE = {
        BLOCK: 1,
        FLOW: 2
      };
      CHOMPING_MODE = {
        CLIP: 1,
        STRIP: 2,
        KEEP: 3
      };
      NO_RANGE$3 = -1;
      simpleEscapeCheck = new Array(256);
      simpleEscapeMap = new Array(256);
      for (let i = 0; i < 256; i++) {
        simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
        simpleEscapeMap[i] = simpleEscapeSequence(i);
      }
      DEFAULT_TAG_HANDLERS = Object.assign(/* @__PURE__ */ Object.create(null), {
        "!": "!",
        "!!": "tag:yaml.org,2002:"
      });
      NO_RANGE$2 = -1;
      MERGE_TAG_NAME = "tag:yaml.org,2002:merge";
      DEFAULT_CONSTRUCTOR_OPTIONS = {
        filename: "",
        schema: CORE_SCHEMA,
        json: false,
        maxTotalMergeKeys: 1e4,
        maxAliases: -1
      };
      NO_RANGE$1 = -1;
      HAS_OWN = Object.prototype.hasOwnProperty;
      CONTEXT_FLOW_IN = 1;
      CONTEXT_FLOW_OUT = 2;
      CONTEXT_BLOCK_IN = 3;
      CONTEXT_BLOCK_OUT = 4;
      PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
      PATTERN_FLOW_INDICATORS = /[,\[\]{}]/;
      PATTERN_TAG_HANDLE = /^(?:!|!!|![0-9A-Za-z-]+!)$/;
      NS_URI_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$,_.!~*'()\[\]])`;
      NS_TAG_CHAR = String.raw`(?:%[0-9A-Fa-f]{2}|[0-9A-Za-z\-#;/?:@&=+$.~*'()_])`;
      PATTERN_TAG_URI = new RegExp(`^(?:${NS_URI_CHAR})*$`);
      PATTERN_TAG_SUFFIX = new RegExp(`^(?:${NS_TAG_CHAR})+$`);
      PATTERN_TAG_PREFIX = new RegExp(`^(?:!(?:${NS_URI_CHAR})*|${NS_TAG_CHAR}(?:${NS_URI_CHAR})*)$`);
      DEFAULT_PARSER_OPTIONS = {
        filename: "",
        maxDepth: 100
      };
      DEFAULT_LOAD_OPTIONS = {
        ...DEFAULT_PARSER_OPTIONS,
        ...DEFAULT_CONSTRUCTOR_OPTIONS
      };
      DEFAULT_SCALAR_STYLE_RULES = {
        applyQuoteFlowKeysOption,
        doubleQuoteForInvisibles,
        doubleQuoteWhitespaceOnly,
        applyForceQuotesOption,
        tryLongOrMultilineAsBlock,
        quoteInvalidPlain,
        fallbackToDoubleQuoted
      };
      SRC_C_PRINTABLE = "[\\x09\\x0A\\x0D\\x20-\\x7E\\x85\\xA0-\\uD7FF\\uE000-\\uFFFD\\u{10000}-\\u{10FFFF}]";
      SRC_B_CHAR = "[\\n\\r]";
      SRC_C_BYTE_ORDER_MARK = "\\uFEFF";
      SRC_S_WHITE = "[ \\t]";
      SRC_NB_CHAR = `(?:(?!(?:${SRC_B_CHAR}|${SRC_C_BYTE_ORDER_MARK}))${SRC_C_PRINTABLE})`;
      SRC_NS_CHAR = `(?:(?!${SRC_S_WHITE})${SRC_NB_CHAR})`;
      SRC_NB_JSON = "[\\x09\\x20-\\uD7FF\\uE000-\\uFFFF\\u{10000}-\\u{10FFFF}]";
      SRC_C_INDICATOR = "[-?:,\\[\\]{}#&*!|>'\"%@`]";
      SRC_C_FLOW_INDICATOR = "[,\\[\\]{}]";
      SRC_NS_PLAIN_SAFE_FLOW_OUT = SRC_NS_CHAR;
      SRC_NS_PLAIN_SAFE_FLOW_IN = `(?:(?!${SRC_C_FLOW_INDICATOR})${SRC_NS_CHAR})`;
      SRC_NS_PLAIN_FIRST_FLOW_OUT = `(?:(?:(?!${SRC_C_INDICATOR})${SRC_NS_CHAR})|[?:-](?=${SRC_NS_PLAIN_SAFE_FLOW_OUT}))`;
      SRC_NS_PLAIN_FIRST_FLOW_IN = `(?:(?:(?!${SRC_C_INDICATOR})${SRC_NS_CHAR})|[?:-](?=${SRC_NS_PLAIN_SAFE_FLOW_IN}))`;
      SRC_NS_PLAIN_CHAR_FLOW_OUT = `(?:(?:(?![:#])${SRC_NS_PLAIN_SAFE_FLOW_OUT})|:(?=${SRC_NS_PLAIN_SAFE_FLOW_OUT}))#*`;
      SRC_NS_PLAIN_CHAR_FLOW_IN = `(?:(?:(?![:#])${SRC_NS_PLAIN_SAFE_FLOW_IN})|:(?=${SRC_NS_PLAIN_SAFE_FLOW_IN}))#*`;
      SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT = `(?:${SRC_S_WHITE}*${SRC_NS_PLAIN_CHAR_FLOW_OUT})*`;
      SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN = `(?:${SRC_S_WHITE}*${SRC_NS_PLAIN_CHAR_FLOW_IN})*`;
      SRC_NS_PLAIN_ONE_LINE_FLOW_OUT = `${SRC_NS_PLAIN_FIRST_FLOW_OUT}#*${SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT}`;
      SRC_NS_PLAIN_ONE_LINE_FLOW_IN = `${SRC_NS_PLAIN_FIRST_FLOW_IN}#*${SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN}`;
      SRC_NS_PLAIN_ONE_LINE_BLOCK_KEY = SRC_NS_PLAIN_ONE_LINE_FLOW_OUT;
      SRC_NS_PLAIN_ONE_LINE_FLOW_KEY = SRC_NS_PLAIN_ONE_LINE_FLOW_IN;
      SRC_S_NS_PLAIN_NEXT_LINE_FLOW_OUT = `\\n+${SRC_NS_PLAIN_CHAR_FLOW_OUT}${SRC_NB_NS_PLAIN_IN_LINE_FLOW_OUT}`;
      SRC_S_NS_PLAIN_NEXT_LINE_FLOW_IN = `\\n+${SRC_NS_PLAIN_CHAR_FLOW_IN}${SRC_NB_NS_PLAIN_IN_LINE_FLOW_IN}`;
      SRC_NS_PLAIN_MULTI_LINE_FLOW_OUT = `${SRC_NS_PLAIN_ONE_LINE_FLOW_OUT}(?:${SRC_S_NS_PLAIN_NEXT_LINE_FLOW_OUT})*`;
      SRC_NS_PLAIN_MULTI_LINE_FLOW_IN = `${SRC_NS_PLAIN_ONE_LINE_FLOW_IN}(?:${SRC_S_NS_PLAIN_NEXT_LINE_FLOW_IN})*`;
      NS_PLAIN_FLOW_OUT = new RegExp(`^(?:${SRC_NS_PLAIN_MULTI_LINE_FLOW_OUT})$`, "u");
      NS_PLAIN_FLOW_IN = new RegExp(`^(?:${SRC_NS_PLAIN_MULTI_LINE_FLOW_IN})$`, "u");
      NS_PLAIN_BLOCK_KEY = new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE_BLOCK_KEY})$`, "u");
      NS_PLAIN_FLOW_KEY = new RegExp(`^(?:${SRC_NS_PLAIN_ONE_LINE_FLOW_KEY})$`, "u");
      NB_SINGLE_ONE_LINE = new RegExp(`^(?:${SRC_NB_JSON})*$`, "u");
      NB_SINGLE_MULTI_LINE = new RegExp(`^(?:${SRC_NB_JSON}|\\n)*$`, "u");
      BLOCK_SCALAR_CONTENT = new RegExp(`^(?:${SRC_NB_CHAR}|\\n)*$`, "u");
      DEFAULT_PRESENTER_OPTIONS = {
        indent: 2,
        seqNoIndent: false,
        seqInlineFirst: true,
        lineWidth: 80,
        flowBracketPadding: false,
        flowSkipCommaSpace: false,
        flowSkipColonSpace: false,
        quoteFlowKeys: false,
        quoteStyle: "single",
        forceQuotes: false,
        scalarStyleRules: Object.keys(DEFAULT_SCALAR_STYLE_RULES).map((name) => Reflect.get(DEFAULT_SCALAR_STYLE_RULES, name)),
        tagBeforeAnchor: false
      };
      DEFAULT_DUMP_OPTIONS = {
        ...DEFAULT_PRESENTER_OPTIONS,
        schema: DUMP_SCHEMA,
        skipInvalid: false,
        noRefs: false,
        flowLevel: -1,
        sortKeys: false,
        transform: () => {
        }
      };
      EVENT_DOCUMENT = EVENT_ID.DOCUMENT;
      EVENT_SEQUENCE = EVENT_ID.SEQUENCE;
      EVENT_MAPPING = EVENT_ID.MAPPING;
      EVENT_SCALAR = EVENT_ID.SCALAR;
      EVENT_ALIAS = EVENT_ID.ALIAS;
      EVENT_POP = EVENT_ID.POP;
      SCALAR_STYLE_PLAIN = SCALAR_STYLE.PLAIN;
      SCALAR_STYLE_SINGLE_QUOTED = SCALAR_STYLE.SINGLE_QUOTED;
      SCALAR_STYLE_DOUBLE_QUOTED = SCALAR_STYLE.DOUBLE_QUOTED;
      SCALAR_STYLE_LITERAL_BLOCK = SCALAR_STYLE.LITERAL_BLOCK;
      SCALAR_STYLE_FOLDED_BLOCK = SCALAR_STYLE.FOLDED_BLOCK;
      COLLECTION_STYLE_BLOCK = COLLECTION_STYLE.BLOCK;
      COLLECTION_STYLE_FLOW = COLLECTION_STYLE.FLOW;
      CHOMPING_CLIP = CHOMPING_MODE.CLIP;
      CHOMPING_STRIP = CHOMPING_MODE.STRIP;
      CHOMPING_KEEP = CHOMPING_MODE.KEEP;
    }
  });

  // src/service/espanso-import.ts
  var espanso_import_exports = {};
  __export(espanso_import_exports, {
    espansoLogicalId: () => espansoLogicalId,
    mapDateFormat: () => mapDateFormat,
    parseEspansoYaml: () => parseEspansoYaml,
    rewriteBody: () => rewriteBody
  });
  function asRecord(v) {
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  }
  function mapDateFormat(format) {
    const f = format.trim();
    if (f === "%Y-%m-%d" || f === "%Y/%m/%d") return "{{xlc:date}}";
    if (f === "%H:%M" || f === "%H:%M:%S") return "{{xlc:time}}";
    return null;
  }
  function rewriteBody(replace, dateVars, issues) {
    let out = replace.replace(/\[\[([^\][{}=]+)=\{([^\]}]+)\}\]\]/g, (_m, name, opts) => {
      return `{{xlc:ask:${name.trim()}|${opts.split(",").map((o) => o.trim()).join(",")}}}`;
    }).replace(/\[\[([^\][{}=]+)\]\]/g, (_m, name) => `{{xlc:ask:${name.trim()}}}`).replace(/\{\{random:([^}]+)\}\}/g, (_m, opts) => `{{xlc:random|${opts.trim()}}}`);
    out = out.replace(/\{\{([^{}:]+)\}\}/g, (match, nameRaw) => {
      const name = nameRaw.trim();
      if (name === "clipboard") return "{{xlc:clipboard}}";
      const mapped = dateVars.get(name);
      if (mapped) return mapped;
      issues.push(`\u53D8\u91CF {{${name}}} \u65E0\u7B49\u4EF7\u6620\u5C04\uFF08script/shell \u7B49\uFF09\uFF0C\u5DF2\u539F\u6837\u4FDD\u7559`);
      return match;
    });
    return out;
  }
  function espansoLogicalId(trigger) {
    const fnv = (text, seed) => {
      let h = seed >>> 0;
      for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h >>> 0;
    };
    const b36 = (n) => n.toString(36).padStart(7, "0");
    const hash = (b36(fnv(trigger, 2166136261)) + b36(fnv(`${trigger}\0espanso`, 461845907))).slice(0, 14);
    return `xlc-e${hash}`;
  }
  function parseEspansoYaml(text, now = Date.now()) {
    var _a;
    const issues = [];
    const items = [];
    let doc;
    try {
      doc = load(text);
    } catch (err) {
      return { items: [], issues: [`YAML \u89E3\u6790\u5931\u8D25\uFF1A${err.message.slice(0, 120)}`] };
    }
    const root = asRecord(doc);
    const matches = root ? root.matches : null;
    if (!Array.isArray(matches)) {
      return { items: [], issues: ["\u672A\u627E\u5230 matches \u5217\u8868\u2014\u2014\u8BF7\u7C98\u8D34 Espanso \u7684 match \u914D\u7F6E\u6587\u4EF6\u5185\u5BB9\uFF08\u5982 base.yml\uFF09"] };
    }
    for (const [index, raw] of matches.entries()) {
      const m = asRecord(raw);
      const trigger = typeof (m == null ? void 0 : m.trigger) === "string" ? m.trigger : "";
      const replace = typeof (m == null ? void 0 : m.replace) === "string" ? m.replace.replace(/\n+$/, "") : "";
      if (!trigger || !replace) {
        issues.push(`\u7B2C ${index + 1} \u9879\u7F3A\u5C11 trigger/replace\uFF0C\u5DF2\u8DF3\u8FC7`);
        continue;
      }
      const dateVars = /* @__PURE__ */ new Map();
      if (Array.isArray(m == null ? void 0 : m.vars)) {
        for (const v of m.vars) {
          const rec = asRecord(v);
          const name = typeof (rec == null ? void 0 : rec.name) === "string" ? rec.name : "";
          const type = typeof (rec == null ? void 0 : rec.type) === "string" ? rec.type : "";
          if (!name) continue;
          if (type === "date") {
            const format = typeof ((_a = rec == null ? void 0 : rec.params) == null ? void 0 : _a.format) === "string" ? rec.params.format : "%Y-%m-%d";
            const mapped = mapDateFormat(format);
            if (mapped) {
              dateVars.set(name, mapped);
            } else {
              dateVars.set(name, "{{xlc:date}}");
              issues.push(`\u65E5\u671F\u683C\u5F0F ${format}\uFF08\u53D8\u91CF ${name}\uFF09\u65E0\u7CBE\u786E\u6620\u5C04\uFF0C\u6309 {{xlc:date}} \u5BFC\u5165`);
            }
          }
        }
      }
      items.push({
        id: espansoLogicalId(trigger),
        itemType: "text",
        title: trigger.replace(/^:+/, "").trim() || trigger,
        alias: trigger,
        tags: ["espanso"],
        category: "",
        kramdown: rewriteBody(replace, dateVars, issues),
        source: { sourceDocId: "", sourceBlockId: "", sourceType: "external" },
        url: "",
        targetBlockId: "",
        createdAt: now,
        updatedAt: now
      });
    }
    if (items.length === 0 && issues.length === 0) issues.push("matches \u5217\u8868\u4E3A\u7A7A");
    return { items, issues };
  }
  var init_espanso_import = __esm({
    "src/service/espanso-import.ts"() {
      "use strict";
      init_js_yaml();
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
  var PROTOCOL_VERSION = 1;
  var ATTR_PREFIX = "custom-xlc-";
  var ATTR = {
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
    updated: "custom-xlc-updated"
  };
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
    maxSavedDiscoveryViews: 20,
    savedViewNameChars: 32,
    savedViewPathChars: 256,
    customNameChars: 20,
    customPromptChars: 500
  };
  var EXPORT_SCHEMA_VERSION = 1;
  var EVENTS = {
    itemCreated: "xiaolv:common:item-created",
    itemUpdated: "xiaolv:common:item-updated",
    itemDeleted: "xiaolv:common:item-deleted",
    itemInserted: "xiaolv:common:item-inserted"
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
  var BLOCK_ID_RE = /^\d{14}-[0-9a-z]{7}$/;
  function isLogicalId(v) {
    return typeof v === "string" && LOGICAL_ID_RE.test(v);
  }
  function isBlockId(v) {
    return typeof v === "string" && BLOCK_ID_RE.test(v);
  }
  function resolveBlockRefTarget(item) {
    if (item.itemType !== "blockref") return "";
    if (isBlockId(item.targetBlockId)) return item.targetBlockId;
    if (isBlockId(item.source.sourceBlockId)) return item.source.sourceBlockId;
    return "";
  }
  function newLogicalId(now = Date.now(), random = Math.random) {
    const time = now.toString(36);
    const rand = Math.floor(random() * 18446744073709552e3).toString(36).slice(0, 10).padStart(10, "0");
    return `xlc-${time}${rand}`.slice(0, 30);
  }
  function cleanString(v, max) {
    if (typeof v !== "string") return "";
    if (v.length <= max) return v;
    const sliced = v.slice(0, max);
    const last = sliced.charCodeAt(sliced.length - 1);
    return last >= 55296 && last <= 57343 ? sliced.slice(0, -1) : sliced;
  }
  function cleanTagList(v) {
    const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,,、]/) : [];
    const out = [];
    for (const item of raw) {
      if (typeof item !== "string") continue;
      const tag = item.trim().slice(0, LIMITS.tag);
      if (!tag) continue;
      if (!out.includes(tag)) out.push(tag);
      if (out.length >= LIMITS.tags) break;
    }
    return out;
  }
  function inferItemType(blockType, subtype, kramdown) {
    if (blockType === "c" || blockType === "code_block" || subtype === "code") return "code";
    if (blockType === "s" || blockType === "super") return "structure";
    if (blockType === "h") return "markdown";
    if (blockType === "i" || blockType === "html" || blockType === "m" || blockType === "query_embed" || blockType === "t") return "markdown";
    if (/^!\[.*\]\(assets\//.test(kramdown.trimStart())) return "image";
    if (/\]\(assets\/[^)]+\)/.test(kramdown)) return "asset";
    return "text";
  }
  function normalizeCommonItem(input) {
    var _a;
    const blockId = typeof input.blockId === "string" && isBlockId(input.blockId) ? input.blockId : "";
    const libraryDocId = typeof input.libraryDocId === "string" && isBlockId(input.libraryDocId) ? input.libraryDocId : "";
    if (!blockId || !libraryDocId) return null;
    const attrs = (_a = input.attrs) != null ? _a : {};
    const droppedFields = [];
    for (const key of Object.keys(attrs)) {
      if (!key.startsWith(ATTR_PREFIX)) continue;
      if (!Object.values(ATTR).includes(key)) droppedFields.push(key);
    }
    const logicalIdRaw = typeof attrs[ATTR.id] === "string" ? attrs[ATTR.id] : "";
    if (!isLogicalId(logicalIdRaw)) return null;
    const kramdown = typeof input.kramdown === "string" ? input.kramdown.slice(0, LIMITS.contentChars) : "";
    const blockType = typeof input.blockType === "string" ? input.blockType : "";
    const subtype = typeof input.subtype === "string" ? input.subtype : "";
    const declaredType = isItemType(attrs[ATTR.type]) ? attrs[ATTR.type] : null;
    const itemType = declaredType != null ? declaredType : inferItemType(blockType, subtype, kramdown);
    const tags = cleanTagList(attrs[ATTR.tags]);
    const title = cleanString(attrs[ATTR.title], LIMITS.title) || deriveTitle(kramdown, itemType, attrs);
    const created = Number(attrs[ATTR.created]);
    const updated = Number(attrs[ATTR.updated]);
    const srcDoc = typeof attrs[ATTR.srcDoc] === "string" ? attrs[ATTR.srcDoc] : "";
    const srcBlock = typeof attrs[ATTR.srcBlock] === "string" ? attrs[ATTR.srcBlock] : "";
    const varCountRaw = Number(attrs[ATTR.vars]);
    const varCount = Number.isInteger(varCountRaw) && varCountRaw > 0 ? Math.min(varCountRaw, LIMITS.maxAskFields) : 0;
    const declaredSourceType = isSourceType(attrs[ATTR.srcType]) ? attrs[ATTR.srcType] : "";
    const source = {
      sourceDocId: isBlockId(srcDoc) ? srcDoc : "",
      sourceBlockId: isBlockId(srcBlock) ? srcBlock : "",
      sourceType: declaredSourceType || (srcDoc || srcBlock ? "block" : "manual")
    };
    return {
      id: logicalIdRaw,
      blockId,
      libraryDocId,
      itemType,
      title,
      alias: cleanString(attrs[ATTR.alias], LIMITS.alias),
      tags,
      category: cleanString(attrs[ATTR.category], LIMITS.category),
      summary: deriveSummary(kramdown),
      varCount,
      source,
      url: cleanString(attrs[ATTR.url], 2048),
      targetBlockId: isBlockId(attrs[ATTR.target]) ? attrs[ATTR.target] : "",
      createdAt: Number.isFinite(created) && created > 0 ? created : 0,
      updatedAt: Number.isFinite(updated) && updated > 0 ? updated : 0,
      droppedFields
    };
  }
  function deriveTitle(kramdown, itemType, attrs) {
    var _a;
    const alias = cleanString(attrs[ATTR.alias], LIMITS.alias);
    if (alias) return alias;
    const text = kramdownToPlainText(kramdown);
    const firstLine = (_a = text.split("\n").map((l) => l.trim()).find((l) => l.length > 0)) != null ? _a : "";
    if (firstLine) return firstLine.slice(0, LIMITS.title);
    if (itemType === "url") return cleanString(attrs[ATTR.url], LIMITS.title) || "URL";
    if (itemType === "code") return "Code";
    return itemType;
  }
  function kramdownToPlainText(kramdown) {
    return kramdown.replace(/^```.*$/gm, "").replace(/\{\{.*?\}\}/g, "").replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, "$1 $2").replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, "$1 $2").replace(/^#{1,6}\s+/gm, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\{\:(\s[^}]*)?\}/g, "").replace(/^%%[\s\S]*?%%$/gm, "").trim();
  }
  function deriveSummary(kramdown) {
    const text = kramdownToPlainText(kramdown).replace(/\s+/g, " ").trim();
    return text.slice(0, LIMITS.summary);
  }
  function getCategoryColorVariant(category) {
    var _a;
    const trimmed = (category != null ? category : "").trim();
    if (!trimmed) return "business";
    if (/商务|财务|发票|银行|采购|合同/i.test(trimmed)) return "business";
    if (/客服|支持|售后|退换|接待|咨询/i.test(trimmed)) return "support";
    if (/开发|代码|研发|SQL|技术|架构|编程/i.test(trimmed)) return "dev";
    if (/写作|周报|会议|计划|日常|笔记/i.test(trimmed)) return "writing";
    if (/提示词|AI|模型|Prompt/i.test(trimmed)) return "ai";
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) {
      hash = hash * 31 + trimmed.charCodeAt(i) >>> 0;
    }
    const variants = [
      "business",
      "support",
      "dev",
      "writing",
      "ai"
    ];
    return (_a = variants[hash % variants.length]) != null ? _a : "business";
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
  function countAskFields(text) {
    return listAskFields(text).length;
  }
  function cleanFillValue(v) {
    return (v != null ? v : "").trim().slice(0, LIMITS.askValueChars);
  }
  function expandAsks(text, fills) {
    if (!text) return text;
    return text.replace(ASK_PATTERN, (_match, rawName, rawOptions) => {
      var _a;
      const field = parseAskField(rawName, rawOptions);
      if (!field) return _match;
      const filled = Object.prototype.hasOwnProperty.call(fills, field.name) ? cleanFillValue((_a = fills[field.name]) != null ? _a : "") : "";
      if (filled) return filled;
      return `__${field.name}__`;
    });
  }
  function applyAskDefaults(text) {
    return expandAsks(text, {});
  }
  var CURSOR_TOKEN = "{{xlc:cursor}}";
  var SNIPPET_PATTERN = /\{\{xlc:snippet:([^}]+)\}\}/g;
  function stripCursorToken(text) {
    return text.split(CURSOR_TOKEN).join("");
  }
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
      width: "min(440px, 92vw)",
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
    cancelBtn.dataset.xlcControl = "variable.cancel";
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
      { id: "ask", text: "{{xlc:ask:\u5B57\u6BB5}}" },
      { id: "ask.options", text: "{{xlc:ask:\u5B57\u6BB5|\u9009\u9879A,\u9009\u9879B}}" },
      { id: "ask.textarea", text: "{{xlc:ask:\u5B57\u6BB5|textarea}}" },
      { id: "snippet", text: "{{xlc:snippet:\u6807\u9898}}" },
      { id: "cursor", text: "{{xlc:cursor}}" },
      { id: "date", text: "{{xlc:date}}" },
      { id: "date.offset", text: "{{xlc:date|+3d}}" },
      { id: "random", text: "{{xlc:random|\u9009\u9879A,\u9009\u9879B}}" },
      { id: "doc", text: "{{xlc:doc}}" },
      { id: "clipboard", text: "{{xlc:clipboard}}" }
    ];
    for (const snippet of snippets) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "xlc-varbtn";
      btn.dataset.xlcControl = `capture.variable.${snippet.id}`;
      btn.textContent = snippet.text;
      btn.addEventListener("click", () => {
        var _a, _b;
        const el = getTarget();
        const start = (_a = el.selectionStart) != null ? _a : el.value.length;
        const end = (_b = el.selectionEnd) != null ? _b : start;
        el.value = el.value.slice(0, start) + snippet.text + el.value.slice(end);
        const caret = start + snippet.text.length;
        el.focus();
        el.setSelectionRange(caret, caret);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      bar.appendChild(btn);
    }
    return bar;
  }

  // src/ui/empty-state.ts
  function shouldShowScopeFallback(query, scope) {
    return Boolean(query.trim()) && scope !== "all";
  }
  function formatScopeFallbackQuery(query, maxCharacters = 20) {
    const limit = Math.max(0, Math.floor(maxCharacters));
    const characters = [];
    for (const character of query.trim()) {
      if (characters.length === limit) return `${characters.join("")}\u2026`;
      characters.push(character);
    }
    return characters.join("");
  }

  // src/model/pinyin-tiny.ts
  var import_tiny_pinyin = __toESM(require_dist());

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
  function getPinyinAdapter() {
    return active;
  }

  // src/model/pinyin-tiny.ts
  var POLYPHONE_PHRASES = {
    "\u5F00\u6237\u884C": ["kai", "hu", "hang"],
    "\u5F00\u6237\u94F6\u884C": ["kai", "hu", "yin", "hang"],
    "\u94F6\u884C": ["yin", "hang"],
    "\u884C\u4E1A": ["hang", "ye"],
    "\u884C\u957F": ["hang", "zhang"],
    "\u91CD\u65B0": ["chong", "xin"],
    "\u91CD\u8BD5": ["chong", "shi"],
    "\u91CD\u6784": ["chong", "gou"],
    "\u91CD\u8981": ["zhong", "yao"],
    "\u91CD\u70B9": ["zhong", "dian"],
    "\u4F1A\u8BA1": ["kuai", "ji"],
    "\u8C03\u6574": ["tiao", "zheng"],
    "\u8C03\u8BD5": ["tiao", "shi"],
    "\u8C03\u67E5": ["diao", "cha"],
    "\u957F\u6309": ["chang", "an"],
    "\u957F\u5EA6": ["chang", "du"],
    "\u6210\u957F": ["cheng", "zhang"],
    "\u5DEE\u9519": ["cha", "cuo"],
    "\u5DEE\u522B": ["cha", "bie"],
    "\u51FA\u5DEE": ["chu", "chai"],
    "\u5904\u7406": ["chu", "li"],
    "\u76F8\u5904": ["xiang", "chu"],
    "\u66F4\u540D": ["geng", "ming"],
    "\u66F4\u6539": ["geng", "gai"]
  };
  function isCjk(char) {
    var _a;
    const code = (_a = char.codePointAt(0)) != null ? _a : 0;
    return code >= 19968 && code <= 40959;
  }
  function extractCharPinyins(text, maxChars, options) {
    var _a, _b, _c, _d;
    if (!text) return [];
    const len = Math.min(text.length, maxChars);
    const chars = [];
    const cjkOnly = (_a = options == null ? void 0 : options.cjkOnly) != null ? _a : false;
    let cursor = 0;
    while (cursor < len) {
      let matchedPhrase = null;
      let matchedPys = null;
      for (const [phrase, pys] of Object.entries(POLYPHONE_PHRASES)) {
        if (text.startsWith(phrase, cursor)) {
          if (!matchedPhrase || phrase.length > matchedPhrase.length) {
            matchedPhrase = phrase;
            matchedPys = pys;
          }
        }
      }
      if (matchedPhrase && matchedPys) {
        for (let k = 0; k < matchedPhrase.length; k++) {
          const c = (_b = matchedPhrase[k]) != null ? _b : "";
          const py = (_c = matchedPys[k]) != null ? _c : "";
          chars.push({
            char: c,
            py,
            initial: py[0] || "",
            index: cursor + k
          });
        }
        cursor += matchedPhrase.length;
        continue;
      }
      const char = (_d = text[cursor]) != null ? _d : "";
      if (isCjk(char)) {
        const py = import_tiny_pinyin.default.convertToPinyin(char, "", true).toLowerCase();
        chars.push({ char, py, initial: py[0] || "", index: cursor });
      } else if (!cjkOnly) {
        const lower = char.toLowerCase();
        chars.push({ char, py: lower, initial: lower, index: cursor });
      }
      cursor++;
    }
    return chars;
  }
  function findPinyinMatches(text, rawToken) {
    if (!text || !rawToken) return [];
    const token = rawToken.trim().toLowerCase();
    if (!/^[a-z]{1,40}$/.test(token)) return [];
    if (!import_tiny_pinyin.default.isSupported()) return [];
    const chars = extractCharPinyins(text, 120);
    if (chars.length === 0) return [];
    const intervals = [];
    const initialsStr = chars.map((c) => c.initial).join("");
    let initCursor = 0;
    while (initCursor <= initialsStr.length - token.length) {
      const at = initialsStr.indexOf(token, initCursor);
      if (at < 0) break;
      const startItem = chars[at];
      const endItem = chars[at + token.length - 1];
      if (startItem && endItem) {
        intervals.push([startItem.index, endItem.index + 1]);
      }
      initCursor = at + 1;
    }
    for (let i = 0; i < chars.length; i++) {
      let concatPy = "";
      for (let j = i; j < chars.length; j++) {
        const item = chars[j];
        if (!item || !item.py) break;
        concatPy += item.py;
        if (concatPy === token) {
          const startItem = chars[i];
          if (startItem) {
            intervals.push([startItem.index, item.index + 1]);
          }
          break;
        }
        if (concatPy.length >= token.length) {
          break;
        }
      }
    }
    return intervals;
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
  var _CommonSearchDialog = class _CommonSearchDialog {
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
      this.filterOptionsSeq = 0;
      this.primaryBusy = false;
      this.varFormOpen = false;
      /** 大结果集只保留视口附近的行；窗口回调由 renderList 安装并在销毁/重绘时清理。 */
      this.virtualListCleanup = null;
      this.virtualEnsureIndex = null;
      /** 宿主拒绝请求时覆盖旧列表，避免用户继续对过期结果执行写操作。 */
      this.accessIssueMessage = null;
      /** 普通点击 = 主动作（insert；blockref = 插入引用）。含变量时先弹填充卡片（F1）。
       *  执行期防重入（R138）：双击行/按住 Enter 不得重复插入同一块。 */
      /** AI 变换代次：连点两个变换时丢弃慢的旧结果（R138） */
      this.transformSeq = 0;
      /** 排序菜单关闭时刻：chip 的 click 在 pointerdown 关闭之后到达，不得立刻重开（R138 toggle） */
      this.sortMenuClosedAt = 0;
      this.historyCursor = -1;
      this.tempQueryBeforeHistory = "";
      this.navigatingHistory = false;
      this.dragOverlay = null;
      this.dropCleanup = null;
    }
    open() {
      const isMobile = this.deps.isMobile();
      const dialog = new import_siyuan2.Dialog({
        title: this.deps.t("pluginName"),
        content: "",
        // 桌面采用宽松密度，减少截断并让双栏预览一次展示更多内容；移动端仍由 sheet 占满视口。
        width: isMobile ? "100vw" : "min(960px, 94vw)",
        height: isMobile ? "100vh" : "min(820px, 92vh)",
        destroyCallback: () => {
          this.dialog = null;
          this.deps.close();
        }
      });
      this.dialog = dialog;
      const content = this.buildDom(isMobile);
      this.setupDragAndPaste(content);
      const body = getDialogBody(dialog.element);
      if (body) {
        body.innerHTML = "";
        body.appendChild(content);
        void this.refreshFilterOptions().then((changed) => {
          if (changed) void this.refresh();
        });
      }
      const container = this.dialog.element.querySelector(".b3-dialog__container");
      if (container) container.classList.add(isMobile ? "xlc-sheet" : "xlc-dialog-host");
      const input = this.dialog.element.querySelector(".xlc-search-input");
      if (input) {
        const last = this.deps.getLastQuery();
        if (last) {
          input.value = last;
          this.currentScope = "all";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        input.focus();
      }
      void this.refresh();
    }
    buildDom(isMobile) {
      var _a, _b, _c, _d, _e, _f;
      const root = document.createElement("div");
      root.className = "xlc-dialog" + (isMobile ? " xlc-dialog--mobile" : "");
      const top = document.createElement("div");
      top.className = "xlc-top";
      const topMain = document.createElement("div");
      topMain.className = "xlc-top-main";
      const searchBlock = document.createElement("div");
      searchBlock.className = "xlc-search-block";
      const search = document.createElement("div");
      search.className = "xlc-search";
      const qMark = document.createElement("span");
      qMark.className = "xlc-search-icon";
      qMark.setAttribute("aria-hidden", "true");
      const input = document.createElement("input");
      input.className = "b3-text-field xlc-search-input";
      input.dataset.xlcControl = "search.input";
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
        clearBtn.classList.toggle("xlc-search-clear--on", input.value.length > 0);
      };
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "xlc-search-clear";
      clearBtn.dataset.xlcControl = "search.clear";
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
        if (!this.navigatingHistory) {
          this.historyCursor = -1;
        }
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
      searchBlock.appendChild(search);
      const searchHint = document.createElement("div");
      searchHint.className = "xlc-search-hint";
      searchHint.textContent = this.deps.t("searchHint");
      searchBlock.appendChild(searchHint);
      topMain.appendChild(searchBlock);
      let kbdRow = null;
      if (!isMobile) {
        const isApple = /Mac|iPhone|iPad/i.test(navigator.platform || "");
        kbdRow = document.createElement("div");
        kbdRow.className = "xlc-kbdrow";
        kbdRow.setAttribute("aria-label", this.deps.t("keyboardHelp"));
        const kbdLabel = document.createElement("span");
        kbdLabel.className = "xlc-kbdrow-label";
        kbdLabel.textContent = this.deps.t("shortcutLabel");
        kbdRow.appendChild(kbdLabel);
        for (const hint of [
          { key: "\u2191 \u2193", action: this.deps.t("kbdNav") },
          { key: "Enter", action: this.deps.t("kbdEnter") },
          { key: `${isApple ? "\u2318" : "Ctrl"} + Enter`, action: this.deps.t("kbdCopy") },
          { key: `${isApple ? "\u2325" : "Alt"} + 1-9`, action: this.deps.t("kbdQuickInsert") },
          { key: `${isApple ? "\u2325 + \u21E7" : "Alt + Shift"} + 1-9`, action: this.deps.t("kbdQuickCopy") },
          { key: `${isApple ? "\u2325" : "Alt"} + F`, action: this.deps.t("kbdFavorite") },
          { key: "Tab", action: this.deps.t("kbdTabActions") },
          { key: "Esc", action: this.deps.t("kbdClose") }
        ]) {
          const kbd = document.createElement("span");
          kbd.className = "xlc-kbd xlc-kbd-hint";
          kbd.title = `${hint.key}\uFF1A${hint.action}`;
          const key = document.createElement("span");
          key.className = "xlc-kbd-key";
          key.textContent = hint.key;
          const action = document.createElement("span");
          action.className = "xlc-kbd-label";
          action.textContent = hint.action;
          kbd.append(key, action);
          kbdRow.appendChild(kbd);
        }
        const topActions = document.createElement("div");
        topActions.className = "xlc-top-actions";
        const topNew = document.createElement("button");
        topNew.type = "button";
        topNew.className = "b3-button xlc-btn-primary xlc-top-new";
        topNew.dataset.xlcControl = "search.new";
        topNew.textContent = this.deps.t("quickNew");
        topNew.setAttribute("aria-label", this.deps.t("newItem"));
        topNew.addEventListener("click", () => this.deps.newItem());
        topActions.appendChild(topNew);
        topMain.appendChild(topActions);
      }
      top.appendChild(topMain);
      if (kbdRow) top.appendChild(kbdRow);
      root.appendChild(top);
      const filters = document.createElement("div");
      filters.className = "xlc-filters";
      const typeSelect = document.createElement("select");
      typeSelect.className = "b3-select xlc-type-select";
      typeSelect.dataset.xlcControl = "filter.type";
      typeSelect.setAttribute("aria-label", this.deps.t("type"));
      const allOpt = document.createElement("option");
      allOpt.value = "";
      allOpt.textContent = this.deps.t("filterAllType");
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
        var _a2, _b2;
        this.deps.setFilters({
          type: typeSelect.value,
          tag: (_a2 = tagSelect == null ? void 0 : tagSelect.value) != null ? _a2 : "",
          category: (_b2 = categorySelect == null ? void 0 : categorySelect.value) != null ? _b2 : ""
        });
        void this.refresh();
      });
      filters.appendChild(typeSelect);
      const tagSelect = document.createElement("select");
      tagSelect.className = "b3-select xlc-tag-select";
      tagSelect.dataset.xlcControl = "filter.tag";
      tagSelect.setAttribute("aria-label", this.deps.t("tags"));
      tagSelect.disabled = true;
      tagSelect.addEventListener("change", () => {
        var _a2;
        this.deps.setFilters({
          type: typeSelect.value,
          tag: tagSelect.value,
          category: (_a2 = categorySelect == null ? void 0 : categorySelect.value) != null ? _a2 : ""
        });
        void this.refresh();
      });
      filters.appendChild(tagSelect);
      const categorySelect = document.createElement("select");
      categorySelect.className = "b3-select xlc-category-select";
      categorySelect.dataset.xlcControl = "filter.category";
      categorySelect.setAttribute("aria-label", this.deps.t("category"));
      categorySelect.disabled = true;
      categorySelect.addEventListener("change", () => {
        this.deps.setFilters({ type: typeSelect.value, tag: tagSelect.value, category: categorySelect.value });
        void this.refresh();
      });
      filters.appendChild(categorySelect);
      for (const scope of ["favorites", "recent"]) {
        const chip = document.createElement("button");
        chip.className = "xlc-chip xlc-scope-chip";
        chip.dataset.scope = scope;
        chip.dataset.xlcControl = `filter.scope.${scope}`;
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
      sortChip.dataset.xlcControl = "sort.open";
      const paintSort = () => {
        const sort = this.deps.getSort();
        sortChip.textContent = "\u21C5 " + this.deps.t("sort") + "\uFF1A" + this.deps.t(`sort.${sort}`);
        sortChip.title = this.deps.t(`sortHint.${sort}`);
        sortChip.setAttribute("aria-label", `${this.deps.t("sort")}\uFF1A${this.deps.t(`sort.${sort}`)}\u3002${this.deps.t(`sortHint.${sort}`)}`);
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
      } else {
        const targetBanner = document.createElement("span");
        targetBanner.className = "xlc-chip xlc-target-banner";
        const hasEditor = (_c = (_b = (_a = this.deps).hasActiveEditor) == null ? void 0 : _b.call(_a)) != null ? _c : true;
        const hasTarget = (_f = (_e = (_d = this.deps).hasInsertTarget) == null ? void 0 : _e.call(_d)) != null ? _f : hasEditor;
        const fallbackKey = this.deps.isMobile() ? "insertMobileActionHint" : hasTarget ? "insertCurrentEditorBanner" : hasEditor ? "insertTargetUnavailableBanner" : "insertNoEditorBanner";
        targetBanner.textContent = "\u2913 " + this.deps.t(fallbackKey);
        targetBanner.setAttribute("role", "note");
        targetBanner.setAttribute("aria-label", this.deps.t(fallbackKey));
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
        const index = Number(row.dataset.xlcIndex);
        const entry = this.results[index];
        if (!entry) return;
        if (isMobile) {
          this.activeIndex = index;
          this.activeProvider = -1;
          this.paintActive();
          this.schedulePreview(entry);
          return;
        }
        void this.runPrimary(entry);
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
        const mediaHint = document.createElement("p");
        mediaHint.className = "xlc-page-intro";
        mediaHint.dataset.xlcControl = "preview.media-hint";
        mediaHint.setAttribute("role", "note");
        mediaHint.textContent = this.deps.t("mediaContentHint");
        mediaHint.style.padding = "var(--xlc-space-2) var(--xlc-space-4)";
        mediaHint.style.flexShrink = "0";
        mediaHint.hidden = true;
        pane.appendChild(mediaHint);
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
      count.setAttribute("aria-live", "polite");
      if (isMobile) {
        const footBtns = document.createElement("div");
        footBtns.className = "xlc-mobile-foot";
        const newBtn = document.createElement("button");
        newBtn.className = "b3-button";
        newBtn.dataset.xlcControl = "search.new";
        newBtn.textContent = this.deps.t("quickNew");
        newBtn.addEventListener("click", () => this.deps.newItem());
        footBtns.appendChild(newBtn);
        const insertBtn = document.createElement("button");
        insertBtn.className = "b3-button xlc-btn-primary xlc-mobile-insert";
        insertBtn.dataset.xlcControl = "preview.mobile-primary";
        insertBtn.textContent = this.deps.t(this.mobilePrimaryIsCopy() ? "copy" : "quickInsertSelected");
        insertBtn.disabled = true;
        if (this.mobilePrimaryIsCopy()) {
          insertBtn.title = this.deps.t("insertMobileActionHint");
          insertBtn.setAttribute("aria-label", this.deps.t("insertMobileActionHint"));
        }
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
        claim.className = "xlc-footer-claim xlc-footer-claim--static";
        claim.textContent = this.deps.t("dataTruth");
        claim.title = this.deps.t("dataTruthHint");
        claim.setAttribute("role", "note");
        claim.setAttribute("aria-label", this.deps.t("dataTruthHint"));
        footer.appendChild(claim);
      }
      const guide = document.createElement("button");
      guide.type = "button";
      guide.className = "b3-button b3-button--text xlc-btn-ghost xlc-footer-guide";
      guide.dataset.xlcControl = "footer.help";
      guide.textContent = "\u24D8 " + this.deps.t("usageGuideBtn");
      guide.addEventListener("click", () => this.openUsageGuide());
      footer.appendChild(guide);
      const gear = document.createElement("button");
      gear.className = "b3-button b3-button--text xlc-btn-ghost xlc-footer-gear";
      gear.dataset.xlcControl = "footer.settings";
      gear.textContent = "\u2699 " + this.deps.t("openSettings");
      gear.addEventListener("click", () => {
        this.destroy();
        this.deps.openSetup();
      });
      footer.appendChild(gear);
      root.appendChild(footer);
      return root;
    }
    /** 打开一页内置使用说明（不离开搜索弹窗，适合首次使用与移动端）。 */
    openUsageGuide() {
      var _a;
      const guideDialog = new import_siyuan2.Dialog({
        title: this.deps.t("usageGuideTitle"),
        content: "",
        width: "min(600px, 92vw)",
        height: "min(680px, 88vh)"
      });
      (_a = guideDialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _a.classList.add("xlc-form-host");
      const body = getDialogBody(guideDialog.element);
      if (!body) return;
      body.innerHTML = "";
      const root = document.createElement("div");
      root.className = "xlc-form xlc-guide";
      const intro = document.createElement("p");
      intro.className = "xlc-form-hint xlc-guide-intro";
      intro.textContent = this.deps.t("usageGuideIntro");
      root.appendChild(intro);
      const steps = document.createElement("ol");
      steps.className = "xlc-guide-list";
      const guideKeys = ["usageGuideAdd", "usageGuideSearch", this.deps.isMobile() ? "usageGuideInsertMobile" : "usageGuideInsert", "usageGuideOrganize"];
      for (const key of guideKeys) {
        const item = document.createElement("li");
        item.textContent = this.deps.t(key);
        steps.appendChild(item);
      }
      root.appendChild(steps);
      const variables = document.createElement("p");
      variables.className = "xlc-form-hint xlc-guide-vars";
      variables.textContent = this.deps.t("usageGuideVariables");
      root.appendChild(variables);
      const media = document.createElement("p");
      media.className = "xlc-form-hint xlc-guide-vars";
      media.textContent = this.deps.t("usageGuideMedia");
      root.appendChild(media);
      const actions = document.createElement("div");
      actions.className = "xlc-form-actions";
      const close = document.createElement("button");
      close.type = "button";
      close.className = "b3-button xlc-btn-primary";
      close.dataset.xlcControl = "guide.close";
      close.textContent = this.deps.t("close");
      close.addEventListener("click", () => guideDialog.destroy());
      actions.appendChild(close);
      root.appendChild(actions);
      body.appendChild(root);
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
      insert.dataset.xlcControl = "preview.insert";
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
      copy.dataset.xlcControl = "preview.copy";
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
      aiBtn.dataset.xlcControl = "preview.ai";
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
      source.dataset.xlcControl = "preview.source";
      source.addEventListener("click", () => {
        const entry = this.results[this.activeIndex];
        if (entry) void this.deps.openSource(entry.id);
      });
      const edit = document.createElement("button");
      edit.className = "b3-button b3-button--text xlc-btn-ghost";
      edit.textContent = this.deps.t("edit");
      edit.dataset.xlcPaneAct = "edit";
      edit.dataset.xlcControl = "preview.edit";
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
    /** 重新加载标签/分类选项；成功时清理已经不存在的持久化筛选，失败时保留当前筛选并给出提示。 */
    async refreshFilterOptions() {
      var _a, _b;
      const tagSelect = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-tag-select");
      const categorySelect = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-category-select");
      if (!tagSelect || !categorySelect) return false;
      const seq = ++this.filterOptionsSeq;
      const current = this.deps.getFilters();
      tagSelect.disabled = true;
      categorySelect.disabled = true;
      tagSelect.title = "";
      categorySelect.title = "";
      tagSelect.replaceChildren();
      categorySelect.replaceChildren();
      const tagAll = document.createElement("option");
      tagAll.value = "";
      tagAll.textContent = this.deps.t("filterAllTags");
      tagSelect.appendChild(tagAll);
      const categoryAll = document.createElement("option");
      categoryAll.value = "";
      categoryAll.textContent = this.deps.t("filterAllCategories");
      categorySelect.appendChild(categoryAll);
      const [tagsResult, categoriesResult] = await Promise.allSettled([this.deps.getTags(), this.deps.getCategories()]);
      if (seq !== this.filterOptionsSeq || !this.dialog) return false;
      const tags = tagsResult.status === "fulfilled" ? Array.from(new Set(tagsResult.value.filter(Boolean))) : [];
      const categories = categoriesResult.status === "fulfilled" ? Array.from(new Set(categoriesResult.value.filter(Boolean))) : [];
      for (const tag of tags) {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        tagSelect.appendChild(option);
      }
      for (const category of categories) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      }
      if (tagsResult.status === "rejected") {
        tagSelect.title = this.deps.t("kernelError", this.deps.t("tags"));
        if (current.tag) {
          const option = document.createElement("option");
          option.value = current.tag;
          option.textContent = current.tag;
          tagSelect.appendChild(option);
        }
      }
      if (categoriesResult.status === "rejected") {
        categorySelect.title = this.deps.t("kernelError", this.deps.t("category"));
        if (current.category) {
          const option = document.createElement("option");
          option.value = current.category;
          option.textContent = current.category;
          categorySelect.appendChild(option);
        }
      }
      const nextTag = tagsResult.status === "fulfilled" ? current.tag && tags.includes(current.tag) ? current.tag : "" : current.tag;
      const nextCategory = categoriesResult.status === "fulfilled" ? current.category && categories.includes(current.category) ? current.category : "" : current.category;
      tagSelect.value = nextTag;
      categorySelect.value = nextCategory;
      tagSelect.disabled = false;
      categorySelect.disabled = false;
      const changed = tagsResult.status === "fulfilled" && nextTag !== current.tag || categoriesResult.status === "fulfilled" && nextCategory !== current.category;
      if (changed) {
        this.deps.setFilters({ type: current.type, tag: nextTag, category: nextCategory });
      }
      return changed;
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
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      const seq = ++this.searchSeq;
      this.accessIssueMessage = null;
      const query = this.buildQuery();
      this.lastQueryText = query.text.trim();
      this.usageCounts = new Map(Object.entries(this.deps.getUsage()).map(([id, u]) => [id, u.count]));
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      const status = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-status");
      const footer = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-footer");
      const aiBanner = (_d = this.dialog) == null ? void 0 : _d.element.querySelector(".xlc-ai-banner");
      if (!list) return;
      (_e = this.dialog) == null ? void 0 : _e.element.removeAttribute("data-xlc-access-issue");
      if (status) {
        status.textContent = "";
        status.classList.remove("xlc-status--error");
        status.setAttribute("role", "status");
      }
      const mobileInsert = (_f = this.dialog) == null ? void 0 : _f.element.querySelector(".xlc-mobile-insert");
      if (mobileInsert) mobileInsert.disabled = true;
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
          const aiResult = await this.deps.aiSemantic(text.slice(1), { itemType: (_g = query.itemType) != null ? _g : "", tag: (_h = query.tag) != null ? _h : "", category: (_i = query.category) != null ? _i : "", scope: this.currentScope });
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
          if (aiBanner && this.aiResults) {
            aiBanner.textContent = `\u2726 ${this.deps.t("aiResultCount", String(this.results.length))}`;
          }
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
        } else if (loadError) {
          status.textContent = this.deps.t("kernelError", loadError);
        } else if (this.results.length) {
          status.textContent = "";
        } else if (loading) {
          status.textContent = this.deps.t("indexing");
        } else {
          status.textContent = "";
          if (!query.text.trim() && this.currentScope === "favorites") {
            this.emptyMessage = this.deps.t("emptyFavorites");
          } else if (!query.text.trim() && this.currentScope === "recent") {
            this.emptyMessage = this.deps.t("emptyRecent");
          } else if (!query.text.trim() && this.currentScope === "all" && Boolean(query.itemType || query.tag || query.category)) {
            this.emptyMessage = this.deps.t("emptyFiltered");
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
          if (directError) {
            count.textContent = "";
            count.title = "";
          } else {
            const countLabel = this.aiResults ? this.deps.t("aiResultCount", String(total)) : this.deps.t("totalItems", String(total));
            count.textContent = countLabel + (!this.aiResults ? sortSuffix : "") + (truncated ? " \u26A0" : "");
            count.title = truncated ? this.deps.t("truncatedHint") : "";
          }
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
    /**
     * 命中高亮：支持多关键词按空格分词高亮，收集匹配区间并合并重叠区域，注入 mark span。
     * 文本一律 textContent / createTextNode，绝不使用 innerHTML（ADR 0036 / T-0063）。
     */
    appendHighlighted(parent, text, query) {
      const tokens = query.toLowerCase().split(/\s+/).map((t) => t.trim()).filter((t) => t.length > 0);
      if (tokens.length === 0) {
        parent.appendChild(document.createTextNode(text));
        return;
      }
      const lowerText = text.toLowerCase();
      const intervals = [];
      for (const token of tokens) {
        let cursor2 = 0;
        while (cursor2 <= lowerText.length - token.length) {
          const at = lowerText.indexOf(token, cursor2);
          if (at < 0) break;
          intervals.push([at, at + token.length]);
          cursor2 = at + Math.max(1, token.length);
        }
        const pyMatches = findPinyinMatches(text, token);
        for (const pm of pyMatches) {
          intervals.push(pm);
        }
      }
      if (intervals.length === 0) {
        parent.appendChild(document.createTextNode(text));
        return;
      }
      intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const merged = [];
      for (const [start, end] of intervals) {
        const prev = merged[merged.length - 1];
        if (prev && start <= prev[1]) {
          prev[1] = Math.max(prev[1], end);
        } else {
          merged.push([start, end]);
        }
      }
      let cursor = 0;
      for (const [start, end] of merged) {
        if (start > cursor) {
          parent.appendChild(document.createTextNode(text.slice(cursor, start)));
        }
        const mark = document.createElement("mark");
        mark.className = "xlc-hit";
        mark.textContent = text.slice(start, end);
        parent.appendChild(mark);
        cursor = end;
      }
      if (cursor < text.length) {
        parent.appendChild(document.createTextNode(text.slice(cursor)));
      }
    }
    /** 创建一行真实库条目。抽出后虚拟列表可以复用同一套交互与无障碍属性。 */
    createEntryRow(entry, index) {
      var _a, _b, _c;
      const fav = this.deps.isFavorite(entry.id);
      const row = document.createElement("div");
      row.className = "xlc-row" + (index === this.activeIndex ? " xlc-row--active" : "") + (fav ? " xlc-row--fav" : "");
      row.dataset.xlcControl = "item.row";
      row.dataset.xlcIndex = String(index);
      row.id = `xlc-result-${index}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", index === this.activeIndex ? "true" : "false");
      row.setAttribute("aria-posinset", String(index + 1));
      row.setAttribute("aria-setsize", String(this.results.length));
      const main = document.createElement("div");
      main.className = "xlc-row-main";
      const title = document.createElement("div");
      title.className = "xlc-row-title";
      if (index < 9) {
        const ordinal = document.createElement("span");
        ordinal.className = "xlc-row-ordinal";
        const numStr = String(index + 1);
        ordinal.textContent = numStr;
        const hint = this.deps.t("ordinalShortcutHint", numStr, numStr);
        ordinal.title = hint;
        ordinal.setAttribute("aria-label", hint);
        title.appendChild(ordinal);
      }
      const badge = document.createElement("span");
      badge.className = `xlc-badge xlc-badge--${entry.itemType}`;
      badge.textContent = (_a = TYPE_BADGES2[entry.itemType]) != null ? _a : "TXT";
      badge.title = this.deps.t(`type.${entry.itemType}`);
      badge.setAttribute("aria-label", this.deps.t(`type.${entry.itemType}`));
      title.appendChild(badge);
      if (entry.category && entry.category.trim()) {
        const catBadge = document.createElement("span");
        const variant = getCategoryColorVariant(entry.category);
        catBadge.className = `xlc-badge xlc-badge--cat xlc-cat--${variant}`;
        catBadge.textContent = entry.category.trim();
        catBadge.title = `${this.deps.t("category")}\uFF1A${entry.category.trim()}`;
        catBadge.setAttribute("aria-label", `${this.deps.t("category")}\uFF1A${entry.category.trim()}`);
        title.appendChild(catBadge);
      }
      const titleText = document.createElement("span");
      titleText.className = "xlc-row-titletext";
      const highlight = this.lastQueryText.length > 0 && !this.lastQueryText.startsWith("?") && !this.aiResults;
      if (highlight) this.appendHighlighted(titleText, entry.title || this.deps.t("unknownType"), this.lastQueryText);
      else titleText.textContent = entry.title || this.deps.t("unknownType");
      title.appendChild(titleText);
      if (((_b = entry.varCount) != null ? _b : 0) > 0) {
        const varBadge = document.createElement("span");
        varBadge.className = "xlc-badge xlc-badge--var";
        varBadge.textContent = this.deps.t("varCountBadge", String(entry.varCount));
        title.appendChild(varBadge);
      }
      if (this.deps.isSourceMissing(entry)) {
        const warn = document.createElement("span");
        warn.className = "xlc-row-warn";
        warn.textContent = "\u26A0";
        warn.title = this.deps.t("sourceMissing") + " \xB7 " + this.deps.t("sourceGone");
        warn.setAttribute("aria-label", this.deps.t("sourceMissing"));
        title.appendChild(warn);
      }
      main.appendChild(title);
      const meta = document.createElement("div");
      meta.className = "xlc-row-meta";
      const currentFilters = this.deps.getFilters();
      const cleanTags = entry.tags.filter(Boolean);
      const shownTags = cleanTags.slice(0, 3);
      if (shownTags.length > 0) {
        const tagsWrapper = document.createElement("span");
        tagsWrapper.className = "xlc-row-tags";
        for (const tag of shownTags) {
          const isSelected = currentFilters.tag === tag;
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "xlc-tag-pill" + (isSelected ? " xlc-tag-pill--on" : "");
          pill.dataset.xlcControl = "row.filter.tag";
          pill.textContent = `#${tag}`;
          const tip = this.deps.t(isSelected ? "clearThisTagFilter" : "filterByThisTag", tag);
          pill.title = tip;
          pill.setAttribute("aria-label", tip);
          pill.setAttribute("aria-pressed", String(isSelected));
          pill.addEventListener("click", (e) => {
            e.stopPropagation();
            this.filterByTag(tag);
          });
          tagsWrapper.appendChild(pill);
        }
        if (cleanTags.length > shownTags.length) {
          const more = document.createElement("span");
          more.className = "xlc-tag-pill xlc-tag-pill--more";
          more.textContent = `+${cleanTags.length - shownTags.length}`;
          tagsWrapper.appendChild(more);
        }
        meta.appendChild(tagsWrapper);
      }
      const useCount = (_c = this.usageCounts.get(entry.id)) != null ? _c : 0;
      if (entry.summary) {
        const summarySpan = document.createElement("span");
        summarySpan.className = "xlc-row-summary";
        const summaryText = entry.summary.length > 100 ? entry.summary.slice(0, 100) + "\u2026" : entry.summary;
        summarySpan.textContent = (shownTags.length > 0 ? " \xB7 " : "") + summaryText;
        meta.appendChild(summarySpan);
      }
      if (useCount > 0) {
        const useSpan = document.createElement("span");
        useSpan.className = "xlc-row-usecount";
        useSpan.textContent = (shownTags.length > 0 || entry.summary ? " \xB7 " : "") + this.deps.t("useCount", String(useCount));
        meta.appendChild(useSpan);
      }
      main.appendChild(meta);
      row.appendChild(main);
      const star = document.createElement("button");
      star.className = "b3-button b3-button--small xlc-row-action";
      star.dataset.xlcControl = "item.favorite";
      star.textContent = fav ? "\u2605" : "\u2606";
      star.setAttribute("aria-label", fav ? this.deps.t("unfavorite") : this.deps.t("favorite"));
      star.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deps.toggleFavorite(entry.id);
        star.textContent = this.deps.isFavorite(entry.id) ? "\u2605" : "\u2606";
        void this.refreshPreservingPosition().then(() => this.restoreFocusToSearch());
      });
      row.appendChild(star);
      return row;
    }
    renderList(list) {
      var _a, _b, _c, _d;
      (_a = this.virtualListCleanup) == null ? void 0 : _a.call(this);
      this.virtualListCleanup = null;
      this.virtualEnsureIndex = null;
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
        if (this.accessIssueMessage) {
          const retry = document.createElement("button");
          retry.type = "button";
          retry.className = "b3-button xlc-btn-primary xlc-empty-action";
          retry.dataset.xlcControl = "access.retry";
          retry.textContent = this.deps.t("retry");
          retry.addEventListener("click", () => {
            var _a2;
            this.accessIssueMessage = null;
            this.emptyMessage = "";
            const status = (_a2 = this.dialog) == null ? void 0 : _a2.element.querySelector(".xlc-status");
            if (status) {
              status.textContent = "";
              status.classList.remove("xlc-status--error");
              status.setAttribute("role", "status");
            }
            void this.refresh();
          });
          empty.appendChild(retry);
          list.appendChild(empty);
          return;
        }
        const queryText = this.lastQueryText.trim();
        if (queryText && !queryText.startsWith("?")) {
          const titleHint = document.createElement("div");
          titleHint.className = "xlc-empty-hint";
          titleHint.textContent = this.deps.t("emptyQueryHint");
          empty.appendChild(titleHint);
          if (this.deps.aiEnabled()) {
            const hint = document.createElement("div");
            hint.className = "xlc-empty-hint";
            hint.textContent = this.deps.t("aiSemanticHint");
            empty.appendChild(hint);
          }
        } else if (queryText.startsWith("?")) {
          const hint = document.createElement("div");
          hint.className = "xlc-empty-hint";
          hint.textContent = this.deps.t("semanticEmptyHint");
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
          const guide = document.createElement("button");
          guide.type = "button";
          guide.className = "b3-button xlc-btn-ghost xlc-empty-action";
          guide.dataset.xlcAction = "help";
          guide.dataset.xlcControl = "empty.help";
          guide.textContent = "\u24D8 " + this.deps.t("usageGuideBtn");
          guide.addEventListener("click", () => this.openUsageGuide());
          empty.appendChild(guide);
        }
        if (this.emptyMessage === this.deps.t("emptyFiltered")) {
          const clear = document.createElement("button");
          clear.type = "button";
          clear.className = "b3-button xlc-btn-ghost xlc-empty-action";
          clear.dataset.xlcAction = "clear-filters";
          clear.dataset.xlcControl = "empty.clear-filters";
          clear.textContent = this.deps.t("clearFilters");
          clear.addEventListener("click", () => {
            var _a2;
            this.deps.setFilters({ type: "", tag: "", category: "" });
            (_a2 = this.dialog) == null ? void 0 : _a2.element.querySelectorAll(".xlc-type-select, .xlc-tag-select, .xlc-category-select").forEach((select) => {
              select.value = "";
            });
            void this.refresh();
          });
          empty.appendChild(clear);
        }
        const query = this.lastQueryText.trim();
        const hasScopeLimitation = shouldShowScopeFallback(query, this.currentScope);
        if (hasScopeLimitation) {
          const scopeFallback = document.createElement("button");
          scopeFallback.type = "button";
          scopeFallback.className = "b3-button xlc-btn-primary xlc-empty-action";
          scopeFallback.dataset.xlcControl = "empty.scope-fallback";
          scopeFallback.dataset.xlcAction = "scope-all";
          const shortQ = formatScopeFallbackQuery(query);
          const label = this.deps.t("searchAllScopeAction", shortQ);
          scopeFallback.textContent = "\u2922 " + label;
          scopeFallback.setAttribute("aria-label", label);
          scopeFallback.title = label;
          scopeFallback.addEventListener("click", () => {
            this.currentScope = "all";
            this.syncScopeChips();
            void this.refresh().then(() => this.restoreFocusToSearch());
          });
          empty.appendChild(scopeFallback);
        }
        if (this.emptyMessage === this.deps.t("emptyLibrary") || this.emptyMessage === this.deps.t("emptyFiltered") || query) {
          const create = document.createElement("button");
          create.type = "button";
          create.className = "b3-button " + (hasScopeLimitation ? "xlc-btn-ghost" : "xlc-btn-primary") + " xlc-empty-action";
          create.dataset.xlcAction = "new-item";
          create.dataset.xlcControl = "empty.new-item";
          const fullTitleCandidate = query && !query.startsWith("?") ? query.slice(0, 120) : "";
          const buttonTitle = fullTitleCandidate.length > 24 ? `${fullTitleCandidate.slice(0, 24)}\u2026` : fullTitleCandidate;
          create.textContent = buttonTitle ? this.deps.t("newItemActionWithQuery", buttonTitle) : this.deps.t("newItemAction");
          const accessibleLabel = fullTitleCandidate ? this.deps.t("newItemWithTitle", fullTitleCandidate) : this.deps.t("newItemAction");
          create.setAttribute("aria-label", accessibleLabel);
          create.title = accessibleLabel;
          create.addEventListener("click", () => {
            this.deps.newItem(fullTitleCandidate || void 0);
          });
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
          const cat = (_b = e == null ? void 0 : e.category) != null ? _b : "";
          if (!cat) {
            uncategorized.push(e);
            continue;
          }
          const bucket = (_c = byCat.get(cat)) != null ? _c : [];
          bucket.push(e);
          byCat.set(cat, bucket);
        }
        const catKeys = Array.from(byCat.keys()).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
        const ordered = [];
        if (isManual && favs.length > 0) {
          groupLabels.push({ label: "\u2605 " + this.deps.t("groupFavorites"), count: favs.length });
          ordered.push(...favs);
        }
        for (const key of catKeys) {
          const bucket = (_d = byCat.get(key)) != null ? _d : [];
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
      const canVirtualize = this.results.length > _CommonSearchDialog.VIRTUAL_THRESHOLD && groupLabels.length === 0 && this.providerRows.length === 0;
      if (canVirtualize) {
        const rowHeight = this.deps.isMobile() ? 64 : _CommonSearchDialog.VIRTUAL_ROW_HEIGHT;
        const overscan = _CommonSearchDialog.VIRTUAL_OVERSCAN;
        const topSpacer = document.createElement("div");
        topSpacer.dataset.xlcSpacer = "top";
        const bottomSpacer = document.createElement("div");
        bottomSpacer.dataset.xlcSpacer = "bottom";
        const renderWindow = (requestedIndex) => {
          const viewport = Math.max(list.clientHeight || 480, rowHeight * 6);
          const rawStart = requestedIndex === void 0 ? Math.floor(list.scrollTop / rowHeight) : Math.max(0, requestedIndex - overscan);
          const visible = Math.ceil(viewport / rowHeight);
          const start = Math.max(0, Math.min(rawStart, this.results.length - 1));
          const end = Math.min(this.results.length, start + visible + overscan * 2);
          topSpacer.style.height = `${start * rowHeight}px`;
          bottomSpacer.style.height = `${Math.max(0, (this.results.length - end) * rowHeight)}px`;
          list.replaceChildren(topSpacer);
          for (let i = start; i < end; i++) {
            const entry = this.results[i];
            if (entry) list.appendChild(this.createEntryRow(entry, i));
          }
          list.appendChild(bottomSpacer);
          this.paintActive();
        };
        const onScroll = () => renderWindow();
        list.classList.add("xlc-list--virtual");
        list.addEventListener("scroll", onScroll, { passive: true });
        this.virtualListCleanup = () => {
          list.removeEventListener("scroll", onScroll);
          list.classList.remove("xlc-list--virtual");
        };
        this.virtualEnsureIndex = (index) => renderWindow(index);
        renderWindow();
      } else {
        for (let i = 0; i < this.results.length; i++) {
          while (headCursor + 1 < groupLabels.length && i === headStarts[headCursor + 1]) {
            headCursor++;
            const head = groupLabels[headCursor];
            if (head) placeGroupHead(head.label, head.count);
          }
          const entry = this.results[i];
          if (entry) list.appendChild(this.createEntryRow(entry, i));
        }
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
      this.syncPaneActions();
    }
    /** 预览区动作随当前选中行同步；键盘切换/来源预检也必须更新按钮状态。 */
    syncPaneActions() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C;
      const actionable = this.results.length > 0;
      const scope = (_b = (_a = this.dialog) == null ? void 0 : _a.element) != null ? _b : document;
      const targetBanner = scope.querySelector(".xlc-target-banner");
      if (targetBanner && !this.insertTarget) {
        const hasEditor = (_e = (_d = (_c = this.deps).hasActiveEditor) == null ? void 0 : _d.call(_c)) != null ? _e : true;
        const hasTarget = (_h = (_g = (_f = this.deps).hasInsertTarget) == null ? void 0 : _g.call(_f)) != null ? _h : hasEditor;
        const fallbackKey = this.deps.isMobile() ? "insertMobileActionHint" : hasTarget ? "insertCurrentEditorBanner" : hasEditor ? "insertTargetUnavailableBanner" : "insertNoEditorBanner";
        targetBanner.textContent = "\u2913 " + this.deps.t(fallbackKey);
        targetBanner.setAttribute("aria-label", this.deps.t(fallbackKey));
      }
      scope.querySelectorAll(".xlc-pane-foot .b3-button").forEach((btn) => {
        var _a2, _b2;
        if (this.activeProvider >= 0) {
          const act2 = (_a2 = btn.dataset.xlcPaneAct) != null ? _a2 : "";
          btn.disabled = this.primaryBusy || !(act2 === "insert" || act2 === "copy");
          return;
        }
        const entry = this.results[this.activeIndex];
        const act = (_b2 = btn.dataset.xlcPaneAct) != null ? _b2 : "";
        const unavailable = !entry || act === "ai" && !this.deps.aiEnabled() || act === "source" && this.deps.isSourceMissing(entry);
        btn.disabled = !actionable || unavailable || this.primaryBusy || this.varFormOpen;
        btn.removeAttribute("title");
        if (act === "ai" && !this.deps.aiEnabled()) btn.title = this.deps.t("aiDisabled");
        if (act === "source" && entry && this.deps.isSourceMissing(entry)) btn.title = this.deps.t("sourceGone");
      });
      const insertBtn = scope.querySelector('[data-xlc-pane-act="insert"]');
      if (insertBtn) {
        const copyFallback = this.activeProvider >= 0 ? !this.insertTarget && (this.deps.isMobile() || !((_n = (_m = (_j = (_i = this.deps).hasInsertTarget) == null ? void 0 : _j.call(_i)) != null ? _m : (_l = (_k = this.deps).hasActiveEditor) == null ? void 0 : _l.call(_k)) != null ? _n : true)) : this.mobilePrimaryIsCopy() || !this.insertTarget && !((_t = (_s = (_p = (_o = this.deps).hasInsertTarget) == null ? void 0 : _p.call(_o)) != null ? _s : (_r = (_q = this.deps).hasActiveEditor) == null ? void 0 : _r.call(_q)) != null ? _t : true);
        insertBtn.textContent = copyFallback ? this.deps.t("copy") : this.deps.t("insert");
        const hint = this.deps.isMobile() && !this.insertTarget ? this.deps.t("insertMobileActionHint") : !this.insertTarget && !((_z = (_y = (_v = (_u = this.deps).hasInsertTarget) == null ? void 0 : _v.call(_u)) != null ? _y : (_x = (_w = this.deps).hasActiveEditor) == null ? void 0 : _x.call(_w)) != null ? _z : true) ? this.deps.t(((_C = (_B = (_A = this.deps).hasActiveEditor) == null ? void 0 : _B.call(_A)) != null ? _C : true) ? "insertTargetUnavailableBanner" : "insertNoEditorBanner") : "";
        insertBtn.title = hint;
        if (hint) insertBtn.setAttribute("aria-label", hint);
        else insertBtn.removeAttribute("aria-label");
        insertBtn.setAttribute("aria-busy", this.primaryBusy ? "true" : "false");
      }
      const mobileInsert = scope.querySelector(".xlc-mobile-foot .xlc-btn-primary");
      if (mobileInsert) {
        mobileInsert.disabled = !actionable || this.primaryBusy || this.varFormOpen;
        mobileInsert.textContent = this.deps.t(this.mobilePrimaryIsCopy() ? "copy" : "quickInsertSelected");
        const hint = this.mobilePrimaryIsCopy() ? this.deps.t("insertMobileActionHint") : "";
        mobileInsert.title = hint;
        if (hint) mobileInsert.setAttribute("aria-label", hint);
        else mobileInsert.removeAttribute("aria-label");
        mobileInsert.setAttribute("aria-busy", this.primaryBusy ? "true" : "false");
      }
    }
    mobilePrimaryIsCopy() {
      return this.deps.isMobile() && !this.insertTarget;
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
        const execution = this.deps.insertProviderPayload(row.payload, (_a2 = this.insertTarget) != null ? _a2 : void 0);
        this.destroy();
        await execution;
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
    /** 鉴权/权限错误由统一内核处理器调用；旧列表失效后保留查询条件并提供显式重试。 */
    showKernelAccessIssue(kind, message) {
      var _a, _b, _c, _d;
      ++this.searchSeq;
      ++this.previewSeq;
      if (this.inputDebounce) clearTimeout(this.inputDebounce);
      this.inputDebounce = null;
      this.accessIssueMessage = message;
      this.emptyMessage = message;
      this.results = [];
      this.providerRows = [];
      this.activeIndex = 0;
      this.activeProvider = -1;
      this.lastPreviewId = null;
      const status = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-status");
      if (status) {
        status.textContent = this.deps.t(kind === "auth" ? "kernelAuthStatus" : "kernelPermissionStatus");
        status.classList.add("xlc-status--error");
        status.setAttribute("role", "alert");
      }
      const list = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-list");
      if (list) {
        list.classList.remove("xlc-list--loading");
        list.setAttribute("aria-busy", "false");
        this.renderList(list);
      }
      const count = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-footer-count");
      if (count) count.textContent = "";
      this.updatePreview();
      (_d = this.dialog) == null ? void 0 : _d.element.setAttribute("data-xlc-access-issue", kind);
    }
    async refreshPreservingPosition() {
      var _a, _b, _c;
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      const scrollTop = (_b = list == null ? void 0 : list.scrollTop) != null ? _b : 0;
      const selectedId = (_c = this.results[this.activeIndex]) == null ? void 0 : _c.id;
      await this.refreshFilterOptions();
      await this.refresh();
      if (selectedId) {
        const next = this.results.findIndex((entry) => entry.id === selectedId);
        if (next >= 0) this.activeIndex = next;
      }
      if (list) {
        this.renderList(list);
        list.scrollTop = scrollTop;
      }
      this.updatePreview();
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
      var _a, _b, _c;
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      if (!list) return;
      const rows = Array.from(list.children).filter((el) => {
        const node = el;
        return !node.dataset.xlcHead && !node.dataset.xlcSpacer;
      });
      if (this.activeProvider < 0 && !rows.some((row) => row.dataset.xlcIndex === String(this.activeIndex))) {
        (_b = this.virtualEnsureIndex) == null ? void 0 : _b.call(this, this.activeIndex);
        return;
      }
      rows.forEach((child) => {
        const resultIndex = child.dataset.xlcIndex;
        const active3 = resultIndex !== void 0 ? this.activeProvider < 0 && Number(resultIndex) === this.activeIndex : this.activeProvider >= 0 && child.id === `xlc-provider-${this.activeProvider}`;
        child.classList.toggle("xlc-row--active", active3);
        child.setAttribute("aria-selected", active3 ? "true" : "false");
      });
      const active2 = this.activeProvider >= 0 ? rows.find((row) => row.id === `xlc-provider-${this.activeProvider}`) : rows.find((row) => row.dataset.xlcIndex === String(this.activeIndex));
      const input = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-search-input");
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
        const option = this.menuButton(mode === current ? "\u2713" : " ", this.deps.t(`sort.${mode}`), "xlc-menu-item" + (mode === current ? " xlc-menu-item--on" : ""), async () => {
          var _a2;
          this.sortMenuClosedAt = Date.now();
          (_a2 = this.menuDismiss) == null ? void 0 : _a2.call(this);
          this.menuDismiss = null;
          this.deps.setSort(mode);
          paintSort();
          this.restoreFocusToSearch();
          void this.refresh();
        });
        option.title = this.deps.t(`sortHint.${mode}`);
        sec.appendChild(option);
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
    /** 直选或反选标签筛选（ADR 0044 / T-0071） */
    filterByTag(tag) {
      var _a;
      const current = this.deps.getFilters();
      const nextTag = current.tag === tag ? "" : tag;
      this.deps.setFilters({
        type: current.type,
        tag: nextTag,
        category: current.category
      });
      const tagSelect = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-tag-select");
      if (tagSelect) tagSelect.value = nextTag;
      void this.refresh().then(() => this.restoreFocusToSearch());
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
        cat.dataset.xlcControl = "preview.filter.category";
        cat.textContent = entry.category;
        cat.title = this.deps.t("category");
        cat.setAttribute("aria-pressed", String(currentFilters.category === entry.category));
        cat.addEventListener("click", () => setFilter({ category: toggleChip(entry.category, this.deps.getFilters().category) }));
        meta.appendChild(cat);
      }
      const cleanTags = entry.tags.filter(Boolean);
      const shownTags = cleanTags.slice(0, 3);
      for (const tag of shownTags) {
        const isSelected = currentFilters.tag === tag;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "xlc-meta-chip xlc-meta-chip--clickable" + (isSelected ? " xlc-meta-chip--on" : "");
        chip.dataset.xlcControl = "preview.filter.tag";
        chip.textContent = `#${tag}`;
        const tip = this.deps.t(isSelected ? "clearThisTagFilter" : "filterByThisTag", tag);
        chip.title = tip;
        chip.setAttribute("aria-label", tip);
        chip.setAttribute("aria-pressed", String(isSelected));
        chip.addEventListener("click", () => this.filterByTag(tag));
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
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const paneBody = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-pane-body");
      const paneTitle = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-pane-title");
      const paneWarn = (_c = this.dialog) == null ? void 0 : _c.element.querySelector(".xlc-pane-warn");
      const paneAi = (_d = this.dialog) == null ? void 0 : _d.element.querySelector(".xlc-pane-ai");
      const paneUsage = (_e = this.dialog) == null ? void 0 : _e.element.querySelector(".xlc-pane-usage");
      if (!paneBody || !paneTitle || !paneWarn || !paneAi || !paneUsage) return;
      const mediaHint = (_f = this.dialog) == null ? void 0 : _f.element.querySelector('[data-xlc-control="preview.media-hint"]');
      const activeEntry = this.activeProvider < 0 ? this.results[this.activeIndex] : void 0;
      if (mediaHint) mediaHint.hidden = (activeEntry == null ? void 0 : activeEntry.itemType) !== "image" && (activeEntry == null ? void 0 : activeEntry.itemType) !== "asset";
      this.syncPaneActions();
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
        if (row) {
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
        this.activeProvider = -1;
      }
      const entry = this.results[this.activeIndex];
      const id = (_g = forceId != null ? forceId : entry == null ? void 0 : entry.id) != null ? _g : null;
      this.paintPaneMeta(entry);
      if (!id) {
        ++this.previewSeq;
        this.lastPreviewId = "";
        paneTitle.textContent = "";
        paneAi.style.display = "none";
        paneWarn.style.display = "none";
        paneUsage.style.display = "none";
        paneBody.classList.add("xlc-pane-body--muted");
        paneBody.classList.remove("xlc-pane-body--code");
        paneBody.textContent = this.deps.t("previewNoResult");
        paneBody.scrollTop = 0;
        this.paintPaneVars(null, void 0);
        return;
      }
      if (!id || id === this.lastPreviewId) return;
      const seq = ++this.previewSeq;
      this.lastPreviewId = id;
      if (paneTitle) paneTitle.textContent = (_h = entry == null ? void 0 : entry.title) != null ? _h : "";
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
      var _a, _b;
      const cleanQuery = this.lastQueryText.replace(/^\?+/, "").trim();
      if (cleanQuery) (_b = (_a = this.deps).addRecentQuery) == null ? void 0 : _b.call(_a, cleanQuery);
      if (this.primaryBusy || this.varFormOpen) return;
      await this.insertEntryWithVars(entry, (fills) => this.runActionFor(entry, fills));
    }
    runActionFor(entry, fills) {
      if (this.insertTarget) {
        const target = this.insertTarget;
        return this.deps.insertToDoc(entry.id, target.docId, target.hPath, fills);
      }
      const mode = entry.itemType === "blockref" ? "insert-ref" : "insert";
      return fills ? this.deps.runActionWithFills(entry.id, mode, fills) : this.deps.runAction(entry.id, mode);
    }
    /** F1：插入前询问变量（设置可关；无 ask 字段零打扰；code 条目不询问）。
     *  perform 收到 fills（undefined=未触发询问，走原路径）。 */
    async insertEntryWithVars(entry, perform, options) {
      var _a, _b, _c;
      if (this.varFormOpen || this.primaryBusy) return;
      this.primaryBusy = true;
      this.syncPaneActions();
      const releaseBusy = () => {
        this.primaryBusy = false;
        this.syncPaneActions();
      };
      if (!this.deps.promptVariables()) {
        try {
          await perform();
        } finally {
          releaseBusy();
        }
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
        try {
          const execution = perform();
          (_c = options == null ? void 0 : options.beforePerform) == null ? void 0 : _c.call(options);
          await execution;
        } finally {
          releaseBusy();
        }
        return;
      }
      if (this.varFormOpen) {
        releaseBusy();
        return;
      }
      this.varFormOpen = true;
      this.syncPaneActions();
      openVariableFillCard({
        t: this.deps.t,
        itemType: entry.itemType,
        title: entry.title,
        fields,
        onConfirm: (fills) => {
          this.varFormOpen = false;
          this.syncPaneActions();
          const execution = perform(fills);
          if (options == null ? void 0 : options.beforePerform) options.beforePerform();
          else this.destroy();
          void execution.finally(() => {
            releaseBusy();
          });
        },
        // 取消/关闭（Esc/scrim/取消钮）后焦点回搜索框，与浮层菜单一致（R128）
        onCancel: () => {
          this.varFormOpen = false;
          releaseBusy();
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
      const appendMediaHint = () => {
        if (entry.itemType !== "image" && entry.itemType !== "asset") return;
        const hint = document.createElement("p");
        hint.className = "xlc-pickdoc-empty";
        hint.dataset.xlcControl = "dialog.media-hint";
        hint.setAttribute("role", "note");
        hint.textContent = this.deps.t("mediaContentHint");
        menu.appendChild(hint);
      };
      const buildDefault = () => {
        var _a2;
        const lbl = document.createElement("div");
        lbl.className = "xlc-menu-lbl";
        lbl.textContent = (entry.title || this.deps.t("unknownType")) + " \xB7 " + this.deps.t("actionsNoun");
        menu.appendChild(lbl);
        appendMediaHint();
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
        const addAction = (icon, label, run, cls = "xlc-menu-item", destroyBeforeRun = true) => {
          sec1.appendChild(this.menuButton(icon, label, cls, async () => {
            var _a3;
            const execution = run();
            if (destroyBeforeRun) this.destroy();
            else {
              (_a3 = this.menuDismiss) == null ? void 0 : _a3.call(this);
              this.menuDismiss = null;
            }
            await execution;
          }));
        };
        if (entry.itemType === "blockref") {
          addAction("\uFF0B", this.deps.t("insertRef"), () => this.insertTarget ? this.deps.insertToDoc(entry.id, this.insertTarget.docId, this.insertTarget.hPath, void 0, "insert-ref") : this.deps.runAction(entry.id, "insert-ref"));
          addAction("\u21B3", this.deps.t("insertSourceContent"), () => this.insertEntryWithVars(entry, (fills) => this.insertTarget ? this.deps.insertToDoc(entry.id, this.insertTarget.docId, this.insertTarget.hPath, fills, "insert-content") : fills ? this.deps.runActionWithFills(entry.id, "insert-content", fills) : this.deps.runAction(entry.id, "insert-content"), { beforePerform: () => this.destroy() }), "xlc-menu-item", false);
          addAction("\u229E", this.deps.t("insertEmbed"), () => this.insertTarget ? this.deps.insertToDoc(entry.id, this.insertTarget.docId, this.insertTarget.hPath, void 0, "insert-embed") : this.deps.runAction(entry.id, "insert-embed"));
          addAction("\u29C9", this.deps.t("insertCopy"), () => this.deps.runAction(entry.id, "copy-content"));
        } else {
          addAction("\uFF0B", this.deps.t("insert"), () => this.insertEntryWithVars(entry, (fills) => this.runActionFor(entry, fills), { beforePerform: () => this.destroy() }), "xlc-menu-item", false);
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
        const addSilent = (icon, label, run, cls = "xlc-menu-item", title) => {
          const btn = this.menuButton(icon, label, cls, async () => {
            var _a3;
            (_a3 = this.menuDismiss) == null ? void 0 : _a3.call(this);
            this.menuDismiss = null;
            await run();
          });
          if (title) btn.title = title;
          sec2.appendChild(btn);
          return btn;
        };
        addSilent("\u2197", this.deps.t("openSource"), () => this.deps.openSource(entry.id));
        addSilent("\u270E", this.deps.t("edit"), () => this.deps.editItem(entry.id));
        addSilent("\u29C9", this.deps.t("duplicateItem"), () => this.deps.duplicateItem(entry.id));
        const useCount = (_a2 = this.usageCounts.get(entry.id)) != null ? _a2 : 0;
        if (useCount > 0 && this.deps.resetItemUsage) {
          addSilent("\u21BA", this.deps.t("resetItemUsage", String(useCount)), async () => {
            var _a3, _b2;
            const ok2 = (_b2 = (_a3 = this.deps).resetItemUsage) == null ? void 0 : _b2.call(_a3, entry.id);
            if (ok2) {
              this.usageCounts.delete(entry.id);
              void this.refreshPreservingPosition();
            }
          }, "xlc-menu-item", this.deps.t("resetItemUsage", String(useCount)));
        }
        addSilent("\u{1F5D1}", this.deps.t("delete"), () => this.deps.deleteItem(entry.id), "xlc-menu-item xlc-menu-item--danger", `${this.deps.t("delete")} (Alt+Delete)`);
        const toDocBtn = this.menuButton("\u2913", this.deps.t("insertToDoc"), "xlc-menu-item", () => {
          var _a3;
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
          input.dataset.xlcControl = "dialog.pickdoc.input";
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
          const searchStatus = document.createElement("div");
          searchStatus.className = "xlc-pickdoc-empty";
          searchStatus.setAttribute("role", "status");
          searchStatus.setAttribute("aria-live", "polite");
          sec.appendChild(searchStatus);
          const runDocSearch = (keyword) => {
            const mySeq = ++seq;
            const k = keyword.trim();
            sec.querySelectorAll(".xlc-pickdoc-hit").forEach((el) => el.remove());
            sec.querySelectorAll(".xlc-pickdoc-empty").forEach((el) => el.remove());
            if (!k) {
              searchStatus.remove();
              return;
            }
            if (!searchStatus.isConnected) sec.appendChild(searchStatus);
            searchStatus.className = "xlc-pickdoc-empty";
            searchStatus.textContent = this.deps.t("docPickerLoading");
            searchStatus.setAttribute("aria-busy", "true");
            void this.deps.searchDocs(k).then((hits) => {
              if (mySeq !== seq) return;
              searchStatus.setAttribute("aria-busy", "false");
              if (hits.length === 0) {
                searchStatus.className = "xlc-pickdoc-empty";
                searchStatus.textContent = this.deps.t("docPickerEmpty");
                return;
              }
              searchStatus.remove();
              for (const hit of hits.slice(0, 5)) {
                sec.appendChild(this.menuButton("\u2913", hit.hPath || hit.name || hit.id, "xlc-menu-item xlc-pickdoc-hit", async () => {
                  var _a4;
                  (_a4 = this.menuDismiss) == null ? void 0 : _a4.call(this);
                  this.menuDismiss = null;
                  await this.insertEntryWithVars(entry, (fills) => this.deps.insertToDoc(entry.id, hit.id, hit.hPath, fills));
                }));
              }
            }).catch((err) => {
              if (mySeq !== seq) return;
              searchStatus.className = "xlc-pickdoc-empty xlc-status--error";
              searchStatus.setAttribute("aria-busy", "false");
              searchStatus.textContent = this.deps.t("kernelError", err instanceof Error ? err.message : String(err));
              const retry = document.createElement("button");
              retry.type = "button";
              retry.className = "b3-button xlc-btn-ghost xlc-pickdoc-retry";
              retry.dataset.xlcControl = "dialog.pickdoc.retry";
              retry.textContent = this.deps.t("retry");
              retry.addEventListener("click", () => runDocSearch(input.value));
              searchStatus.appendChild(document.createTextNode(" "));
              searchStatus.appendChild(retry);
            });
          };
          input.addEventListener("input", () => {
            runDocSearch(input.value);
          });
          const actions2 = menu.querySelectorAll(".xlc-menu-sec");
          (_a3 = actions2[actions2.length - 1]) == null ? void 0 : _a3.before(sec);
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
        appendMediaHint();
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
          var _a2, _b2;
          const transformed = (_a2 = box.dataset.transformed) != null ? _a2 : "";
          if (!transformed) return;
          const execution = this.deps.insertRaw(transformed, (_b2 = this.insertTarget) != null ? _b2 : void 0);
          this.destroy();
          await execution;
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
          const execution = this.runActionFor(entry);
          this.destroy();
          await execution;
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
        let result;
        try {
          result = await run();
        } catch (err) {
          result = { ok: false, message: this.deps.t("kernelError", err instanceof Error ? err.message : String(err)) };
        }
        if (gen !== this.transformSeq) return;
        const apply = menu.applyTransform;
        if (result.ok) {
          apply == null ? void 0 : apply(result.text);
        } else {
          const box = menu.querySelector(".xlc-menu-preview");
          if (box) {
            box.textContent = result.message;
            box.classList.add("xlc-status--error");
            const retry = document.createElement("button");
            retry.type = "button";
            retry.className = "b3-button xlc-btn-ghost xlc-transform-retry";
            retry.dataset.xlcControl = "dialog.transform.retry";
            retry.textContent = this.deps.t("retry");
            retry.addEventListener("click", () => {
              const retryGen = ++this.transformSeq;
              box.textContent = this.deps.t("aiWorking");
              box.classList.remove("xlc-status--error");
              retry.remove();
              void runTransformView(run, retryGen);
            });
            box.appendChild(document.createTextNode(" "));
            box.appendChild(retry);
          }
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
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
      if (e.isComposing || e.keyCode === 229) return;
      const list = (_a = this.dialog) == null ? void 0 : _a.element.querySelector(".xlc-list");
      if (!list) return;
      const input = (_b = this.dialog) == null ? void 0 : _b.element.querySelector(".xlc-search-input");
      const isInputFocused = e.target === input || document.activeElement === input;
      const isHistoryDown = e.altKey && e.key === "ArrowDown" || e.key === "ArrowDown" && isInputFocused && this.historyCursor >= 0;
      if (isHistoryDown && input) {
        e.preventDefault();
        this.historyCursor--;
        const history = (_e = (_d = (_c = this.deps).getRecentQueries) == null ? void 0 : _d.call(_c)) != null ? _e : [];
        this.navigatingHistory = true;
        if (this.historyCursor >= 0) {
          input.value = (_f = history[this.historyCursor]) != null ? _f : "";
        } else {
          input.value = this.tempQueryBeforeHistory;
        }
        input.dispatchEvent(new Event("input", { bubbles: true }));
        this.navigatingHistory = false;
        input.select();
        return;
      }
      const isHistoryUp = e.altKey && e.key === "ArrowUp" || e.key === "ArrowUp" && isInputFocused && input && (this.historyCursor >= 0 || !input.value.trim() && this.navPosition() === 0);
      if (isHistoryUp && input) {
        const history = (_i = (_h = (_g = this.deps).getRecentQueries) == null ? void 0 : _h.call(_g)) != null ? _i : [];
        if (history.length > 0) {
          if (this.historyCursor < 0) {
            this.tempQueryBeforeHistory = input.value;
            this.historyCursor = 0;
          } else if (this.historyCursor + 1 < history.length) {
            this.historyCursor++;
          }
          e.preventDefault();
          this.navigatingHistory = true;
          input.value = (_j = history[this.historyCursor]) != null ? _j : "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          this.navigatingHistory = false;
          input.select();
          return;
        }
      }
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
        if ((_l = (_k = e.target).closest) == null ? void 0 : _l.call(_k, ".xlc-row-action")) return;
        if (e.repeat) return;
        e.preventDefault();
        if (this.activeProvider >= 0) {
          const row = this.providerRows[this.activeProvider];
          if (row) {
            const execution = this.deps.insertProviderPayload(row.payload, (_m = this.insertTarget) != null ? _m : void 0);
            this.destroy();
            await execution;
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
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && (/^[1-9]$/.test(e.key) || /^Digit[1-9]$/.test(e.code))) {
        let num = null;
        if (/^[1-9]$/.test(e.key)) {
          num = Number(e.key);
        } else if (/^Digit[1-9]$/.test(e.code)) {
          num = Number(e.code.replace("Digit", ""));
        }
        if (num !== null) {
          if (e.repeat) return;
          e.preventDefault();
          const idx = num - 1;
          const entry = this.results[idx];
          if (entry) {
            if (e.shiftKey) {
              await this.deps.runAction(entry.id, "copy");
            } else {
              await this.runPrimary(entry);
            }
          }
        }
      } else if (e.key === "Tab") {
        const root = (_n = this.dialog) == null ? void 0 : _n.element;
        if (!root) return;
        const focusables = Array.from(root.querySelectorAll(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), button:not([disabled]), [tabindex="0"]:not([disabled])'
        )).filter((el) => {
          return (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) && window.getComputedStyle(el).visibility !== "hidden";
        });
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active2 = document.activeElement;
        const input2 = root.querySelector(".xlc-search-input");
        if (active2 === input2 && !e.shiftKey) {
          const previewAction = root.querySelector(".xlc-pane-foot button:not([disabled])");
          if (previewAction && focusables.includes(previewAction)) {
            e.preventDefault();
            previewAction.focus();
            return;
          }
        }
        if (e.shiftKey && (active2 === first || active2 === root)) {
          e.preventDefault();
          last == null ? void 0 : last.focus();
        } else if (!e.shiftKey && active2 === last) {
          e.preventDefault();
          first == null ? void 0 : first.focus();
        }
      } else if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === "e" || e.key === "E")) {
        if (e.repeat) return;
        if (this.activeProvider >= 0) return;
        const entry = this.results[this.activeIndex];
        if (entry) {
          e.preventDefault();
          this.destroy();
          await this.deps.editItem(entry.id);
        }
      } else if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === "d" || e.key === "D")) {
        if (e.repeat) return;
        if (this.activeProvider >= 0) return;
        const entry = this.results[this.activeIndex];
        if (entry) {
          e.preventDefault();
          await this.deps.duplicateItem(entry.id);
          await this.refresh();
        }
      } else if (e.altKey && (e.key === "Delete" || e.key === "Backspace") || !e.ctrlKey && !e.metaKey && !e.altKey && e.key === "Delete" && !((_o = document.activeElement) == null ? void 0 : _o.matches("input, textarea"))) {
        if (e.repeat) return;
        if (this.activeProvider >= 0) return;
        const entry = this.results[this.activeIndex];
        if (entry) {
          e.preventDefault();
          await this.deps.deleteItem(entry.id);
        }
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "f" || e.key === "F" || e.key === "s" || e.key === "S")) {
        if (e.repeat) return;
        if (this.activeProvider >= 0) return;
        const entry = this.results[this.activeIndex];
        if (entry) {
          e.preventDefault();
          this.deps.toggleFavorite(entry.id);
          void this.refreshPreservingPosition().then(() => this.restoreFocusToSearch());
        }
      }
    }
    destroy() {
      var _a, _b, _c, _d;
      if (this.inputDebounce) clearTimeout(this.inputDebounce);
      (_a = this.virtualListCleanup) == null ? void 0 : _a.call(this);
      this.virtualListCleanup = null;
      this.virtualEnsureIndex = null;
      (_b = this.longPressCancel) == null ? void 0 : _b.call(this);
      this.longPressCancel = null;
      (_c = this.dropCleanup) == null ? void 0 : _c.call(this);
      this.dropCleanup = null;
      if (this.dragOverlay) {
        this.dragOverlay.remove();
        this.dragOverlay = null;
      }
      if (this.menuDismiss) {
        this.menuDismiss();
        this.menuDismiss = null;
      }
      (_d = this.dialog) == null ? void 0 : _d.destroy();
      this.dialog = null;
    }
    /** 拖拽放置与面板快捷粘贴治理（ADR 0034 / T-0061） */
    setupDragAndPaste(root) {
      let dragDepth = 0;
      const showOverlay = () => {
        if (this.dragOverlay) return;
        const overlay = document.createElement("div");
        overlay.className = "xlc-drop-overlay";
        overlay.dataset.xlcControl = "search.drop";
        const text = document.createElement("span");
        text.className = "xlc-drop-text";
        text.textContent = "\u{1F4E5} " + this.deps.t("dropToAdd");
        overlay.appendChild(text);
        root.appendChild(overlay);
        this.dragOverlay = overlay;
      };
      const hideOverlay = () => {
        if (this.dragOverlay) {
          this.dragOverlay.remove();
          this.dragOverlay = null;
        }
      };
      const onDragEnter = (e) => {
        var _a;
        const types = (_a = e.dataTransfer) == null ? void 0 : _a.types;
        if (types && (types.includes("text/plain") || types.includes("text/uri-list") || types.includes("Files"))) {
          e.preventDefault();
          dragDepth++;
          showOverlay();
        }
      };
      const onDragOver = (e) => {
        var _a;
        const types = (_a = e.dataTransfer) == null ? void 0 : _a.types;
        if (types && (types.includes("text/plain") || types.includes("text/uri-list") || types.includes("Files"))) {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        }
      };
      const onDragLeave = (e) => {
        e.preventDefault();
        dragDepth--;
        if (dragDepth <= 0) {
          dragDepth = 0;
          hideOverlay();
        }
      };
      const onDrop = (e) => {
        var _a, _b;
        e.preventDefault();
        dragDepth = 0;
        hideOverlay();
        const text = ((_a = e.dataTransfer) == null ? void 0 : _a.getData("text/plain")) || ((_b = e.dataTransfer) == null ? void 0 : _b.getData("text/uri-list"));
        if (text && text.trim() && this.deps.newWithContent) {
          this.destroy();
          this.deps.newWithContent(text.trim());
        }
      };
      const onPaste = (e) => {
        var _a;
        const active2 = document.activeElement;
        if (active2 && (active2.tagName === "INPUT" || active2.tagName === "TEXTAREA" || active2.isContentEditable)) {
          return;
        }
        const text = (_a = e.clipboardData) == null ? void 0 : _a.getData("text/plain");
        if (text && text.trim() && this.deps.newWithContent) {
          e.preventDefault();
          this.destroy();
          this.deps.newWithContent(text.trim());
        }
      };
      root.addEventListener("dragenter", onDragEnter);
      root.addEventListener("dragover", onDragOver);
      root.addEventListener("dragleave", onDragLeave);
      root.addEventListener("drop", onDrop);
      root.addEventListener("paste", onPaste);
      this.dropCleanup = () => {
        hideOverlay();
        root.removeEventListener("dragenter", onDragEnter);
        root.removeEventListener("dragover", onDragOver);
        root.removeEventListener("dragleave", onDragLeave);
        root.removeEventListener("drop", onDrop);
        root.removeEventListener("paste", onPaste);
      };
    }
  };
  // 搜索服务最多返回 100 条；80 以上即可明显减少首屏 DOM，同时保留小结果集的简单路径。
  _CommonSearchDialog.VIRTUAL_THRESHOLD = 80;
  _CommonSearchDialog.VIRTUAL_ROW_HEIGHT = 72;
  _CommonSearchDialog.VIRTUAL_OVERSCAN = 8;
  var CommonSearchDialog = _CommonSearchDialog;

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
  function extractCodeFence(kramdown) {
    var _a, _b;
    const m = kramdown.match(/^```([\w+#.-]*)\s*\n([\s\S]*?)\n?```\s*$/);
    if (!m) return null;
    return { language: (_a = m[1]) != null ? _a : "", code: (_b = m[2]) != null ? _b : "" };
  }
  function refAnchorText(item) {
    const base = item.alias || item.title || "ref";
    return base.replace(/[[\]()']/g, "").slice(0, 96) || "ref";
  }
  function asInlineText(text) {
    return text.slice(0, LIMITS.contentChars);
  }
  function buildBlockRef(blockId, anchor) {
    if (!BLOCK_ID_RE.test(blockId)) throw new Error("invalid block id");
    return `((${blockId} '${anchor.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'))`;
  }
  function buildEmbedBlock(blockId) {
    if (!BLOCK_ID_RE.test(blockId)) throw new Error("invalid block id");
    return `{{select * from blocks where id='${blockId}'}}`;
  }
  function planAction(item, mode, ctx) {
    const base = {
      mode,
      clipboardKind: "text",
      downgraded: false,
      pendingVerification: [],
      warnings: []
    };
    if (ctx.content.sourceMissing && mode !== "insert-ref" && mode !== "insert-embed" && mode !== "copy-content") {
      if (mode === "open") {
        return { ...base, open: void 0, downgraded: true, downgradeReason: "source-missing", warnings: ["source-missing"] };
      }
    }
    if (ctx.content.assetMissing) {
      base.pendingVerification.push("asset-missing");
    }
    switch (item.itemType) {
      case "text": {
        const text = asInlineText(ctx.content.kramdown);
        if (mode === "copy" || mode === "copy-content") return { ...base, clipboardText: text, clipboardKind: "text" };
        return { ...base, markdown: text };
      }
      case "markdown":
      case "structure": {
        const md = ctx.content.kramdown.slice(0, LIMITS.contentChars);
        if (mode === "copy" || mode === "copy-content") return { ...base, clipboardText: md, clipboardKind: "markdown" };
        return { ...base, markdown: md };
      }
      case "url": {
        const url = item.url || extractFirstUrl(ctx.content.kramdown);
        if (!url || !isSafeHttpUrl(url)) {
          return { ...base, downgraded: true, downgradeReason: "type-unsupported", warnings: ["url-empty"] };
        }
        if (mode === "open") return { ...base, open: { kind: "url", url } };
        if (mode === "copy" || mode === "copy-content") return { ...base, clipboardText: url, clipboardKind: "url" };
        const title = item.title && item.title !== url ? item.title : url;
        return { ...base, markdown: `[${title.replace(/[[\]]/g, "")}](${url})` };
      }
      case "code": {
        const fence = extractCodeFence(ctx.content.kramdown);
        const code = fence ? fence.code : ctx.content.kramdown;
        const language = fence ? fence.language : "";
        if (mode === "copy" || mode === "copy-content") return { ...base, clipboardText: code, clipboardKind: "code" };
        return { ...base, markdown: "```" + language + "\n" + code.slice(0, LIMITS.contentChars) + "\n```" };
      }
      case "image":
      case "asset": {
        const assetPath = extractAssetPath(ctx.content.kramdown);
        if (!assetPath) {
          return { ...base, downgraded: true, downgradeReason: "asset-missing", warnings: ["asset-path-unresolvable"] };
        }
        if (ctx.content.assetMissing) {
          if (mode === "copy" || mode === "copy-content") {
            return {
              ...base,
              clipboardText: `[${item.title}](${assetPath})`,
              clipboardKind: "markdown-link",
              pendingVerification: ["asset-missing"]
            };
          }
          return { ...base, downgraded: true, downgradeReason: "asset-missing", warnings: ["asset-missing"] };
        }
        if (mode === "open") {
          return { ...base, open: { kind: "asset", assetPath } };
        }
        if (mode === "copy" || mode === "copy-content") {
          return {
            ...base,
            clipboardText: `[${item.title}](${assetPath})`,
            clipboardKind: "markdown-link",
            pendingVerification: item.itemType === "image" ? ["bitmap-clipboard-unverified"] : []
          };
        }
        return {
          ...base,
          markdown: item.itemType === "image" ? `![](${assetPath})` : `[${item.title}](${assetPath})`,
          pendingVerification: item.itemType === "image" ? ["bitmap-clipboard-unverified"] : []
        };
      }
      case "blockref": {
        const target = resolveBlockRefTarget(item);
        if (!BLOCK_ID_RE.test(target)) {
          return { ...base, downgraded: true, downgradeReason: "source-missing", warnings: ["target-block-invalid"] };
        }
        if (mode === "copy" || mode === "copy-content") {
          return { ...base, clipboardText: ctx.content.kramdown, clipboardKind: "markdown", mode: "copy-content" };
        }
        if (mode === "insert-ref") {
          return { ...base, markdown: buildBlockRef(target, refAnchorText(item)) };
        }
        if (mode === "insert-embed") {
          return { ...base, markdown: buildEmbedBlock(target) };
        }
        if (mode === "insert-content") {
          return { ...base, markdown: ctx.content.kramdown.slice(0, LIMITS.contentChars) };
        }
        return { ...base, markdown: buildBlockRef(target, refAnchorText(item)) };
      }
      default: {
        return { ...base, downgraded: true, downgradeReason: "type-unsupported", warnings: ["unknown-type"] };
      }
    }
  }
  function extractFirstUrl(text) {
    const m = text.match(/https?:\/\/[^\s)）\]]+/);
    return m ? m[0].slice(0, 2048) : "";
  }
  function planOpenSource(item, resolved) {
    if (item.itemType === "url") {
      const url = item.url || extractFirstUrl(resolved.kramdown);
      return url && isSafeHttpUrl(url) ? { target: { kind: "url", url } } : { failure: "source-missing" };
    }
    if (item.itemType === "image" || item.itemType === "asset") {
      const assetPath = extractAssetPath(resolved.kramdown);
      if (!assetPath || resolved.assetMissing) return { failure: "asset-missing" };
      return { target: { kind: "asset", assetPath } };
    }
    const sourceBlockId = item.itemType === "blockref" ? resolveBlockRefTarget(item) : item.source.sourceBlockId;
    if (sourceBlockId) {
      if (resolved.sourceMissing) return { failure: "source-missing" };
      return { target: { kind: "block", docId: item.source.sourceDocId, blockId: sourceBlockId } };
    }
    if (item.source.sourceDocId) {
      if (resolved.sourceMissing) return { failure: "source-missing" };
      return { target: { kind: "doc", docId: item.source.sourceDocId } };
    }
    return { target: { kind: "doc", docId: item.libraryDocId } };
  }

  // src/service/export-markdown.ts
  var ExportIntegrityError = class extends Error {
    constructor(reason, itemLabel = "", detail = "") {
      super(`export-${reason}${itemLabel ? `: ${itemLabel}` : ""}${detail ? `: ${detail}` : ""}`);
      this.reason = reason;
      this.itemLabel = itemLabel;
      this.detail = detail;
      this.name = "ExportIntegrityError";
    }
  };
  async function buildMarkdownExport(items, kramdownById, fetchAssetBytes, pack) {
    var _a, _b;
    const oneLine = (value) => value.replace(/[\r\n]+/g, " ").trim();
    for (const item of items) {
      if (!kramdownById.has(item.id)) {
        throw new ExportIntegrityError("body-missing", item.title || item.id);
      }
    }
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
    }
    const markdown = mdParts.join("\n");
    if (markdown.length > LIMITS.contentChars) {
      throw new ExportIntegrityError("too-large", "", String(LIMITS.contentChars));
    }
    entries.push({ name: "items.md", data: new TextEncoder().encode(markdown) });
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
      const nextCommentStart = commentStarts[i + 1];
      const nextTitleStart = nextCommentStart === void 0 ? -1 : md.lastIndexOf("\n## ", nextCommentStart) + 1;
      const chunkEnd = nextTitleStart > itemStart ? nextTitleStart : nextCommentStart != null ? nextCommentStart : md.length;
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
    "items: 20",
    "vars: \u5BA2\u6237\u540D\u79F0,\u8865\u507F\u6BD4\u4F8B,\u5DE5\u5355\u53F7,\u8DDF\u8FDB\u65E5\u671F,\u5BA2\u6237\u6635\u79F0,\u76EE\u6807\u8BFB\u8005,\u7F16\u7A0B\u8BED\u8A00,\u672C\u5468\u4E3B\u9898,\u4F1A\u8BAE\u4E3B\u9898,\u59D3\u540D,\u804C\u4F4D,\u516C\u53F8\u540D\u79F0,\u90AE\u7BB1,\u624B\u673A\u53F7,\u6536\u4EF6\u4EBA,\u4E3B\u9898,\u7701\u5E02\u533A,\u8BE6\u7EC6\u5730\u5740,\u90AE\u7F16,\u5907\u6CE8,\u53D1\u7968\u7C7B\u578B,\u4F01\u4E1A\u540D\u79F0,\u7EB3\u7A0E\u4EBA\u8BC6\u522B\u53F7,\u5F00\u6237\u94F6\u884C,\u94F6\u884C\u8D26\u53F7,\u9000\u6362\u7C7B\u578B,\u8BA2\u5355\u7F16\u53F7,\u5BC4\u56DE\u5730\u5740,\u50AC\u529E\u4E8B\u9879,\u539F\u5B9A\u622A\u6B62,\u54A8\u8BE2\u95EE\u9898",
    "-->",
    "# \u63D0\u793A\u8BCD\u573A\u666F\u5305",
    "",
    "> \u5C0F\u9A74\u5E38\u7528\uFF08\u5185\u6D4B\u7248\uFF09\u5185\u7F6E\u6A21\u677F\u96C6\uFF1A\u4F7F\u7528\u8BF4\u660E / \u5730\u5740 / \u90AE\u7BB1 / \u8054\u7CFB\u65B9\u5F0F / \u5BA2\u670D\u56DE\u590D / AI \u63D0\u793A\u8BCD / \u7814\u53D1\u5199\u4F5C / \u5546\u52A1\u8D44\u6599\u3002\u5BFC\u5165\u540E\u5373\u4E3A\u771F\u5B9E\u601D\u6E90\u5757\uFF0C\u53EF\u81EA\u7531\u4FEE\u6539\u3002",
    "",
    // ---- 入门与个人信息 ----
    "## \u4F7F\u7528\u8BF4\u660E\uFF1A\u4E09\u6B65\u5F00\u59CB",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000011",
    "type: markdown",
    "tags: \u5165\u95E8,\u89C4\u5219",
    "category: \u4F7F\u7528\u8BF4\u660E",
    "source-type: external",
    "-->",
    "# \u5C0F\u9A74\u5E38\u7528\u600E\u4E48\u7528",
    "",
    "1. **\u5148\u4FDD\u5B58**\uFF1A\u5728\u7F16\u8F91\u5668\u9009\u4E2D\u6587\u672C\uFF0C\u4F7F\u7528\u53F3\u952E\u300C\u4FDD\u5B58\u4E3A\u5E38\u7528\u6761\u76EE\u300D\uFF1B\u4E5F\u53EF\u4EE5\u4ECE\u526A\u8D34\u677F\u5FEB\u901F\u6355\u83B7\uFF0C\u6216\u5728\u9762\u677F\u4E2D\u70B9\u300C\u65B0\u5EFA\u300D\u3002",
    "2. **\u518D\u8C03\u7528**\uFF1A\u6253\u5F00\u9762\u677F\u641C\u7D22\u6807\u9898\u3001\u6B63\u6587\u3001\u6807\u7B7E\u6216\u5206\u7C7B\uFF0C\u6309 Enter \u63D2\u5165\uFF0C\u6309 Ctrl/\u2318+Enter \u590D\u5236\uFF1B\u6709 `\uFF5B\uFF5Bxlc:ask:\u5B57\u6BB5\uFF5D\uFF5D` \u7684\u6A21\u677F\u4F1A\u5728\u63D2\u5165\u524D\u8BE2\u95EE\u4E00\u6B21\u3002",
    "3. **\u6301\u7EED\u6574\u7406**\uFF1A\u7528\u6807\u7B7E\u548C\u5206\u7C7B\u533A\u5206\u573A\u666F\uFF0C\u6536\u85CF\u9AD8\u9891\u6761\u76EE\uFF1B\u6761\u76EE\u6B63\u6587\u4ECD\u662F\u5E93\u6587\u6863\u4E2D\u7684\u771F\u5B9E\u5757\uFF0C\u53EF\u5728\u601D\u6E90\u4E2D\u76F4\u63A5\u7F16\u8F91\u3002",
    "",
    "**\u6A21\u677F\u89C4\u5219\u4E0E\u6CE8\u91CA\u89C4\u8303**",
    "- `\uFF5B\uFF5Bxlc:ask:\u5B57\u6BB5\uFF5D\uFF5D` = \u63D2\u5165\u65F6\u586B\u5199\uFF1B`\uFF5B\uFF5Bxlc:ask:\u5B57\u6BB5|\u9009\u9879A,\u9009\u9879B\uFF5D\uFF5D` = \u4E0B\u62C9\u9009\u62E9\uFF08\u672C\u8BF4\u660E\u7528\u5168\u89D2\u62EC\u53F7\u5C55\u793A\u8BED\u6CD5\uFF0C\u5B9E\u9645\u6A21\u677F\u8BF7\u6539\u4E3A\u534A\u89D2\uFF09\u3002\u586B\u5199\u5185\u5BB9\u53EA\u7528\u4E8E\u672C\u6B21\u63D2\u5165\uFF0C\u4E0D\u4F1A\u56DE\u5199\u6A21\u677F\u3002",
    "- `\uFF5B\uFF5Bxlc:date\uFF5D\uFF5D`\u3001`\uFF5B\uFF5Bxlc:clipboard\uFF5D\uFF5D` \u7B49\u52A8\u6001\u5360\u4F4D\u7B26\u53EA\u5728\u63D2\u5165/\u590D\u5236\u65F6\u5C55\u5F00\uFF0C\u6A21\u677F\u539F\u6587\u59CB\u7EC8\u4FDD\u7559\u3002",
    "- **\u4EE3\u7801\u7C7B\u578B**\u59CB\u7EC8\u6309\u539F\u6587\u5B57\u9762\u63D2\u5165/\u590D\u5236\uFF0C\u4E0D\u5C55\u5F00\u53D8\u91CF\uFF1BSQL \u793A\u4F8B\u4E2D\u7684 `example_posts` \u9700\u624B\u52A8\u6539\u4E3A\u81EA\u5DF1\u7684\u8868\u540D\u3002",
    "- **\u6CE8\u91CA\u4E0E\u8BF4\u660E**\uFF1A\u6761\u76EE\u522B\u540D\uFF08alias\uFF09\u4E0E\u5206\u7C7B\u5373\u4E3A\u573A\u666F\u6CE8\u91CA\uFF1B\u6A21\u677F\u6B63\u6587\u5185\u53EF\u7528\u5F15\u7528\u5757 `> \u{1F4A1} \u63D0\u793A\uFF1A...` \u8BB0\u5F55\u6CE8\u610F\u4E8B\u9879\uFF0C\u4E5F\u53EF\u4EE5\u7528 Markdown \u6CE8\u91CA\u8BED\u6CD5 `<!-- \u6CE8\u91CA -->` \u9690\u85CF\u5185\u90E8\u8BF4\u660E\u3002",
    "- **\u952E\u76D8\u9AD8\u6548\u8C03\u7528**\uFF1A`Alt + 1-9` \u5FEB\u901F\u63D2\u5165\u524D 9 \u9879\uFF0C`Alt + Shift + 1-9` \u5FEB\u901F\u590D\u5236\u524D 9 \u9879\uFF1B\u641C\u7D22\u6846\u6309 `Tab` \u952E\u76F4\u8FBE\u53F3\u4FA7\u64CD\u4F5C\u533A\uFF1B\u914D\u5408\u300C\u5E38\u7528\u300D\u6392\u5E8F\u5B9E\u73B0\u9AD8\u9891\u6761\u76EE\u79D2\u53D1\u3002",
    "- \u63A8\u8350\u5206\u7C7B\uFF1A\u5546\u52A1\u3001\u5BA2\u670D\u3001\u90AE\u7BB1\u3001\u5730\u5740\u3001\u8054\u7CFB\u65B9\u5F0F\u3001\u63D0\u793A\u8BCD\u3001\u5199\u4F5C\u3001\u5F00\u53D1\uFF1B\u5206\u7C7B\u540D\u79F0\u53EF\u4EE5\u6309\u81EA\u5DF1\u7684\u5DE5\u4F5C\u6D41\u4FEE\u6539\u3002",
    "",
    "**\u4ECE\u54EA\u91CC\u5F00\u59CB**\uFF1A\u5148\u5BFC\u5165\u672C\u5305\u4E2D\u7684\u300C\u90AE\u7BB1\u7B7E\u540D\u300D\u300C\u5F00\u7968\u8D44\u6599\u300D\u6216\u300C\u552E\u540E\u9000\u6362\u6307\u5F15\u300D\uFF0C\u628A\u793A\u4F8B\u5B57\u6BB5\u66FF\u6362\u4E3A\u81EA\u5DF1\u7684\u5B57\u6BB5\uFF0C\u518D\u590D\u5236\u6210\u4E2A\u4EBA\u6761\u76EE\u3002",
    "## \u90AE\u7BB1\u7B7E\u540D",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000012",
    "type: text",
    "tags: \u90AE\u7BB1,\u7B7E\u540D",
    "category: \u90AE\u7BB1",
    "source-type: external",
    "-->",
    "{{xlc:ask:\u59D3\u540D}}\uFF5C{{xlc:ask:\u804C\u4F4D}}",
    "{{xlc:ask:\u516C\u53F8\u540D\u79F0}}",
    "\u90AE\u7BB1\uFF1A{{xlc:ask:\u90AE\u7BB1}}",
    "\u7535\u8BDD\uFF1A{{xlc:ask:\u624B\u673A\u53F7}}{{xlc:cursor}}",
    "## \u90AE\u4EF6\u56DE\u590D\u5F00\u5934",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000013",
    "type: markdown",
    "tags: \u90AE\u7BB1,\u56DE\u590D",
    "category: \u90AE\u7BB1",
    "source-type: external",
    "-->",
    "\u4E3B\u9898\uFF1A{{xlc:ask:\u4E3B\u9898}}",
    "",
    "{{xlc:ask:\u6536\u4EF6\u4EBA}} \u60A8\u597D\uFF1A",
    "",
    "\u611F\u8C22\u6765\u4FE1\u3002\u5173\u4E8E\u60A8\u63D0\u5230\u7684\u4E8B\u9879\uFF0C\u6211\u4EEC\u4F1A\u5728 __\u65F6\u95F4__ \u524D\u56DE\u590D\uFF1B\u5982\u6709\u8865\u5145\u4FE1\u606F\uFF0C\u6B22\u8FCE\u76F4\u63A5\u56DE\u590D\u672C\u90AE\u4EF6\u3002",
    "",
    "\u795D\u597D\uFF01{{xlc:cursor}}",
    "## \u6536\u4EF6\u5730\u5740",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000014",
    "type: text",
    "tags: \u5730\u5740,\u5FEB\u9012",
    "category: \u5730\u5740",
    "source-type: external",
    "-->",
    "\u6536\u4EF6\u4EBA\uFF1A{{xlc:ask:\u6536\u4EF6\u4EBA}}",
    "\u5730\u5740\uFF1A{{xlc:ask:\u7701\u5E02\u533A}} {{xlc:ask:\u8BE6\u7EC6\u5730\u5740}}",
    "\u90AE\u7F16\uFF1A{{xlc:ask:\u90AE\u7F16}}",
    "\u7535\u8BDD\uFF1A{{xlc:ask:\u624B\u673A\u53F7}}{{xlc:cursor}}",
    "## \u8054\u7CFB\u4EBA\u5361\u7247",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000015",
    "type: markdown",
    "tags: \u8054\u7CFB\u65B9\u5F0F,\u8054\u7CFB\u4EBA",
    "category: \u8054\u7CFB\u65B9\u5F0F",
    "source-type: external",
    "-->",
    "**{{xlc:ask:\u59D3\u540D}}**",
    "- \u624B\u673A\uFF1A{{xlc:ask:\u624B\u673A\u53F7}}",
    "- \u90AE\u7BB1\uFF1A{{xlc:ask:\u90AE\u7BB1}}",
    "- \u5907\u6CE8\uFF1A{{xlc:ask:\u5907\u6CE8|textarea}}{{xlc:cursor}}",
    "## \u5730\u5740\u6807\u7B7E",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000016",
    "type: text",
    "tags: \u5730\u5740,\u6807\u7B7E",
    "category: \u5730\u5740",
    "source-type: external",
    "-->",
    "{{xlc:ask:\u6536\u4EF6\u4EBA}} / {{xlc:ask:\u7701\u5E02\u533A}} / {{xlc:ask:\u8BE6\u7EC6\u5730\u5740}} / {{xlc:ask:\u624B\u673A\u53F7}}",
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
    "SELECT * FROM example_posts",
    "WHERE status = 'published'",
    "ORDER BY updated_at DESC",
    "LIMIT 20 OFFSET 40;",
    "```",
    "",
    // ---- 场景④ 商务财务与售后协同 ----
    "## \u5F00\u7968\u8D44\u6599",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000017",
    "type: markdown",
    "tags: \u8D22\u52A1,\u53D1\u7968,\u5546\u52A1",
    "category: \u5546\u52A1",
    "source-type: external",
    "-->",
    "> \u{1F4A1} \u63D0\u793A\uFF1A\u4E13\u7968\u9700\u5B8C\u6574\u586B\u5199\u5F00\u6237\u884C\u4E0E\u94F6\u884C\u8D26\u53F7\uFF1B\u666E\u7968\u4EC5\u9700\u62AC\u5934\u4E0E\u7A0E\u53F7\u3002",
    "",
    "- \u53D1\u7968\u7C7B\u578B\uFF1A{{xlc:ask:\u53D1\u7968\u7C7B\u578B|\u589E\u503C\u7A0E\u4E13\u7528\u53D1\u7968,\u589E\u503C\u7A0E\u666E\u901A\u53D1\u7968}}",
    "- \u4F01\u4E1A\u540D\u79F0\uFF1A{{xlc:ask:\u4F01\u4E1A\u540D\u79F0}}",
    "- \u7EB3\u7A0E\u4EBA\u8BC6\u522B\u53F7\uFF1A{{xlc:ask:\u7EB3\u7A0E\u4EBA\u8BC6\u522B\u53F7}}",
    "- \u5F00\u6237\u94F6\u884C\uFF1A{{xlc:ask:\u5F00\u6237\u94F6\u884C}}",
    "- \u94F6\u884C\u8D26\u53F7\uFF1A{{xlc:ask:\u94F6\u884C\u8D26\u53F7}}",
    "- \u6CE8\u518C\u5730\u5740\u4E0E\u7535\u8BDD\uFF1A{{xlc:ask:\u7701\u5E02\u533A}} {{xlc:ask:\u8BE6\u7EC6\u5730\u5740}} / {{xlc:ask:\u624B\u673A\u53F7}}{{xlc:cursor}}",
    "",
    "## \u552E\u540E\u9000\u6362\u6307\u5F15",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000018",
    "type: markdown",
    "tags: \u5BA2\u670D,\u552E\u540E,\u9000\u6362",
    "category: \u5BA2\u670D",
    "source-type: external",
    "-->",
    "{{xlc:ask:\u5BA2\u6237\u540D\u79F0}} \u60A8\u597D\uFF1A",
    "",
    "\u60A8\u7684\u552E\u540E\u7533\u8BF7\u5DF2\u53D7\u7406\uFF08\u5DE5\u5355/\u8BA2\u5355\uFF1A{{xlc:ask:\u8BA2\u5355\u7F16\u53F7}}\uFF0C\u7C7B\u578B\uFF1A{{xlc:ask:\u9000\u6362\u7C7B\u578B|\u6362\u8D27,\u9000\u6B3E,\u8FD4\u5382\u7EF4\u4FEE}}\uFF09\u3002",
    "",
    "\u8BF7\u5C06\u5546\u54C1\u5BC4\u56DE\u4EE5\u4E0B\u5730\u5740\uFF1A",
    "- \u6536\u4EF6\u4EBA\uFF1A{{xlc:ask:\u6536\u4EF6\u4EBA}}\uFF08\u7535\u8BDD\uFF1A{{xlc:ask:\u624B\u673A\u53F7}}\uFF09",
    "- \u5BC4\u56DE\u5730\u5740\uFF1A{{xlc:ask:\u5BC4\u56DE\u5730\u5740}}",
    "",
    "> \u{1F4A1} \u6CE8\u610F\uFF1A\u5BC4\u56DE\u65F6\u8BF7\u4FDD\u7559\u539F\u5305\u88C5\u53CA\u914D\u4EF6\uFF0C\u5305\u88F9\u5185\u9644\u5B57\u6761\u6CE8\u660E\u60A8\u7684\u8BA2\u5355\u53F7\u4E0E\u9000\u6362\u539F\u56E0\uFF1B\u8BF7\u52FF\u5BC4\u9001\u8FD0\u8D39\u5230\u4ED8\u3002\u5BC4\u51FA\u540E\u8BF7\u5C06\u5FEB\u9012\u5355\u53F7\u56DE\u590D\u672C\u5904\uFF0C\u6211\u4EEC\u5C06\u4F18\u5148\u4E3A\u60A8\u8DDF\u8FDB\u3002{{xlc:cursor}}",
    "",
    "## \u4E8B\u9879\u50AC\u529E\u63D0\u9192",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000019",
    "type: markdown",
    "tags: \u5199\u4F5C,\u534F\u540C,\u50AC\u529E",
    "category: \u5199\u4F5C",
    "source-type: external",
    "-->",
    "{{xlc:ask:\u6536\u4EF6\u4EBA}} \u60A8\u597D\uFF1A",
    "",
    "\u5173\u4E8E\u4E8B\u9879\u300C{{xlc:ask:\u50AC\u529E\u4E8B\u9879}}\u300D\uFF0C\u539F\u5B9A\u622A\u6B62\u65F6\u95F4\u4E3A {{xlc:ask:\u539F\u5B9A\u622A\u6B62|date}}\u3002",
    "\u76EE\u524D\u6211\u4EEC\u5DF2\u63A8\u8FDB\u81F3\u9636\u6BB5\uFF1A__\u9636\u6BB5\u8FDB\u5EA6__\uFF1B\u4E3A\u786E\u4FDD\u540E\u7EED\u4EA4\u4ED8\u4E0D\u53D7\u5F71\u54CD\uFF0C\u9700\u8981\u8D35\u65B9\u5728 __\u4ECA\u65E5/\u672C\u5468\u4E94__ \u524D\u534F\u52A9\u786E\u8BA4\uFF1A",
    "1. __\u5F85\u786E\u8BA4\u70B9 1__",
    "2. __\u5F85\u786E\u8BA4\u70B9 2__",
    "",
    "\u5982\u6709\u4EFB\u4F55\u5361\u70B9\u6216\u9700\u6211\u4EEC\u914D\u5408\u8C03\u6574\u4E4B\u5904\uFF0C\u968F\u65F6\u6C9F\u901A\uFF0C\u611F\u8C22\uFF01{{xlc:cursor}}",
    "",
    "## \u5E38\u89C1\u95EE\u9898\u89E3\u7B54 FAQ",
    "",
    "<!-- xlc-item",
    "id: xlc-pack00000020",
    "type: markdown",
    "tags: \u5BA2\u670D,\u652F\u6301,FAQ",
    "category: \u5BA2\u670D",
    "source-type: external",
    "-->",
    "### Q: {{xlc:ask:\u54A8\u8BE2\u95EE\u9898}}",
    "",
    "**A:** \u9488\u5BF9\u60A8\u54A8\u8BE2\u7684\u95EE\u9898\uFF0C\u5EFA\u8BAE\u6309\u4EE5\u4E0B\u6B65\u9AA4\u6392\u67E5\u4E0E\u5904\u7406\uFF1A",
    "1. \u786E\u8BA4\u7CFB\u7EDF\u73AF\u5883\u4E0E\u7248\u672C\u662F\u5426\u7B26\u5408\u8981\u6C42\uFF1B",
    "2. __\u5904\u7406\u6B65\u9AA4\u6216\u6838\u5FC3\u89E3\u7B54__\uFF1B",
    "3. \u5982\u4ECD\u672A\u89E3\u51B3\uFF0C\u53EF\u53C2\u8003\u6587\u6863\uFF1A__\u94FE\u63A5__\uFF0C\u6216\u5C06\u9519\u8BEF\u622A\u56FE\u56DE\u590D\u6211\u4EEC\u3002",
    "",
    "> \u{1F4A1} \u63D0\u793A\uFF1A\u672C\u7B54\u590D\u9002\u7528\u4E8E\u5E38\u89C1\u6807\u51C6\u6D41\u7A0B\uFF1B\u590D\u6742\u7279\u6B8A\u60C5\u51B5\u8BF7\u8F6C\u4EBA\u5DE5\u4E13\u9879\u5DE5\u5355\u8DDF\u8FDB\u3002{{xlc:cursor}}"
  ].join("\n");

  // src/ui/settings-dialog.ts
  var activeSetupDialog = null;
  var activeSettingsDialog = null;
  var espansoParserPromise = null;
  function loadEspansoParser() {
    espansoParserPromise != null ? espansoParserPromise : espansoParserPromise = Promise.resolve().then(() => (init_espanso_import(), espanso_import_exports));
    return espansoParserPromise;
  }
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
    box.dataset.xlcControl = `settings.switch.${text}`;
    box.checked = checked;
    box.addEventListener("change", () => onChange(box.checked));
    row.appendChild(cap);
    row.appendChild(box);
    return row;
  }
  function openSetupDialog(ctx, opts) {
    var _a, _b, _c;
    if ((_a = activeSetupDialog == null ? void 0 : activeSetupDialog.element) == null ? void 0 : _a.isConnected) {
      (_b = activeSetupDialog.element.querySelector("input, select, button")) == null ? void 0 : _b.focus();
      return;
    }
    activeSetupDialog = null;
    const t = ctx.t;
    const dialog = new import_siyuan3.Dialog({
      title: t("setupTitle"),
      content: "",
      width: "min(680px, 92vw)",
      height: "min(820px, 92vh)"
      // 首次快速开始卡需要留出阅读空间，长屏仍保持视口内滚动（R175）
    });
    activeSetupDialog = dialog;
    (_c = dialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _c.classList.add("xlc-form-host", "xlc-settings-host", "xlc-setup-root-host");
    const body = getDialogBody(dialog.element);
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form xlc-setup";
    buildLibraryPickerSection(ctx, root, () => {
      var _a2;
      dialog.destroy();
      (_a2 = opts == null ? void 0 : opts.onConfigured) == null ? void 0 : _a2.call(opts);
    }, { onDismiss: () => dialog.destroy() });
    body.appendChild(root);
  }
  function openSettingsDialog(ctx) {
    var _a, _b, _c, _d;
    if ((_a = activeSettingsDialog == null ? void 0 : activeSettingsDialog.element) == null ? void 0 : _a.isConnected) {
      (_b = activeSettingsDialog.element.querySelector("input, select, button")) == null ? void 0 : _b.focus();
      return;
    }
    activeSettingsDialog = null;
    const t = ctx.t;
    const dialog = new import_siyuan3.Dialog({
      title: t("openSettings"),
      content: "",
      width: "min(720px, 92vw)",
      height: "min(860px, 92vh)"
      // 固定高：展开/收起/提示行显隐不再顶跳弹窗（R146）
    });
    activeSettingsDialog = dialog;
    (_c = dialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _c.classList.add("xlc-form-host", "xlc-settings-host", "xlc-settings-root-host");
    const body = getDialogBody(dialog.element);
    if (!body) return;
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form xlc-settings";
    const intro = document.createElement("p");
    intro.className = "xlc-page-intro";
    intro.textContent = t("settingsIntro");
    root.appendChild(intro);
    const libSec = document.createElement("div");
    libSec.className = "xlc-form-field xlc-card";
    const libLabel = document.createElement("span");
    libLabel.className = "xlc-form-label";
    libLabel.textContent = t("librarySection");
    libSec.appendChild(libLabel);
    const libStatus = document.createElement("div");
    libStatus.className = "xlc-form-hint";
    const cfg = ctx.getConfig();
    libStatus.textContent = cfg ? cfg.mode === "notebook" ? t("libModeNotebook", String(cfg.notebookIds.length)) : cfg.mode === "tree" ? t("libModeTree", String(cfg.containerDocIds.length)) : t("libModeDoc", String(cfg.containerDocIds.length)) : t("libraryNone");
    const changeBtn = document.createElement("button");
    changeBtn.className = "b3-button";
    changeBtn.dataset.xlcControl = "settings.library.change";
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
        var _a2;
        try {
          (_a2 = pickerHost.querySelector(".b3-text-field")) == null ? void 0 : _a2.focus();
        } catch {
        }
      });
    });
    libSec.appendChild(pickerHost);
    root.appendChild(libSec);
    if (cfg) {
      const modeLabel = (_d = libStatus.textContent) != null ? _d : "";
      const setLocation = (location) => {
        statusText.textContent = `${modeLabel} \xB7 ${location}`;
      };
      if (cfg.mode === "notebook") {
        void ctx.library.listNotebooks().then((result) => {
          if (!result.ok) return;
          const names = cfg.notebookIds.map((id) => {
            var _a2, _b2;
            return (_b2 = (_a2 = result.data.find((nb) => nb.id === id)) == null ? void 0 : _a2.name) != null ? _b2 : id;
          });
          if (names.length) setLocation(names.join(", "));
        });
      } else {
        const docId = cfg.containerDocIds[0];
        if (docId) void ctx.library.getDocPath(docId).then((hPath) => {
          if (hPath) setLocation(hPath);
        });
      }
    }
    buildAiSection(ctx, root);
    buildInsertSection(ctx, root);
    buildSearchSection(ctx, root);
    buildSavedViewsSection(ctx, root, () => dialog.destroy());
    buildProviderSection(ctx, root);
    buildDataSection(ctx, root);
    body.appendChild(root);
  }
  async function openPackExportDialog(ctx) {
    var _a;
    const t = ctx.t;
    const idx = await ctx.library.ensureIndex();
    if (idx.truncated || idx.stopped || idx.errors.length > 0) {
      throw new ExportIntegrityError("index-incomplete");
    }
    const all = Array.from(idx.items.values());
    const categories = Array.from(new Set(all.map((i) => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
    const dialog = new import_siyuan3.Dialog({
      title: t("packExportTitle"),
      content: "",
      width: "min(580px, 92vw)",
      height: "min(680px, 90vh)"
      // 固定高：分类切换不顶跳（R146）
    });
    (_a = dialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _a.classList.add("xlc-form-host", "xlc-settings-host");
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
    cancelBtn.dataset.xlcControl = "settings.pack-export.cancel";
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
        ctx.notify("error", formatExportError(ctx, err));
      });
    });
    actions.appendChild(exportBtn);
    wrap.appendChild(actions);
    body.appendChild(wrap);
    const repaint = () => {
      const category = catSelect.value;
      const items = category ? all.filter((i) => i.category === category) : all;
      const withVars = items.filter((i) => {
        var _a2;
        return ((_a2 = i.varCount) != null ? _a2 : 0) > 0;
      }).length;
      paintMeta(items.length, withVars);
    };
    catSelect.addEventListener("change", repaint);
    repaint();
  }
  async function collectKramdown(ctx, items) {
    const kramdownById = /* @__PURE__ */ new Map();
    for (const item of items) {
      const kd = await ctx.library.getStoredItemKramdown(item);
      if (!kd.ok) throw new ExportIntegrityError("item-unreadable", item.title || item.id, kd.message);
      kramdownById.set(item.id, kd.data);
    }
    return kramdownById;
  }
  function formatExportError(ctx, err) {
    if (err instanceof ExportIntegrityError) {
      switch (err.reason) {
        case "index-incomplete":
          return ctx.t("exportIncompleteIndex");
        case "item-unreadable":
          return ctx.t("exportItemReadFailed", err.itemLabel, err.detail);
        case "body-missing":
          return ctx.t("exportBodyMissing", err.itemLabel);
        case "too-large":
          return ctx.t("exportTooLarge", err.detail);
      }
    }
    return ctx.t("kernelError", err instanceof Error ? err.message : String(err));
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
    const hasUsage = () => Object.values(ctx.state.usage).some((item) => item.count > 0);
    const syncClearUsage = () => {
      clearBtn.disabled = !hasUsage();
      clearBtn.textContent = hasUsage() ? t("clearUsageBtn") : t("clearUsageEmpty");
    };
    syncClearUsage();
    clearBtn.addEventListener("click", () => {
      if (!hasUsage()) return;
      (0, import_siyuan3.confirm)("\u26A0\uFE0F " + t("clearUsageBtn"), t("clearUsageConfirm"), () => {
        var _a;
        ctx.state.usage = {};
        ctx.persistSoon();
        (_a = ctx.refreshSearch) == null ? void 0 : _a.call(ctx);
        syncClearUsage();
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
    let setupRevision = 0;
    let pickedDoc = null;
    const stepsEl = buildStepsEl(1, t("setupStep1"));
    root.appendChild(stepsEl);
    const hint = document.createElement("p");
    hint.className = "xlc-form-hint";
    hint.style.marginBottom = "12px";
    hint.textContent = t("setupHint");
    root.appendChild(hint);
    const usageGuide = document.createElement("p");
    usageGuide.className = "xlc-form-hint";
    usageGuide.style.whiteSpace = "pre-line";
    usageGuide.textContent = t("setupUsageGuide");
    root.appendChild(usageGuide);
    const recommendation = document.createElement("p");
    recommendation.className = "xlc-form-hint xlc-setup-recommendation";
    recommendation.textContent = t("setupRecommendation");
    root.appendChild(recommendation);
    const existingConfig = ctx.getConfig();
    const showQuickStart = !existingConfig;
    if (showQuickStart) usageGuide.style.display = "none";
    const quickStart = document.createElement("section");
    quickStart.className = "xlc-setup-quickstart";
    quickStart.setAttribute("aria-labelledby", "xlc-setup-quickstart-title");
    const quickStartTitle = document.createElement("h3");
    quickStartTitle.className = "xlc-setup-quickstart-title";
    quickStartTitle.id = "xlc-setup-quickstart-title";
    quickStartTitle.textContent = t("setupQuickStartTitle");
    quickStart.appendChild(quickStartTitle);
    const quickStartItems = [
      ["1", t("setupQuickStart1Title"), t("setupQuickStart1Desc")],
      ["2", t("setupQuickStart2Title"), t("setupQuickStart2Desc")],
      ["3", t("setupQuickStart3Title"), t("setupQuickStart3Desc")]
    ];
    for (const [number, title, desc] of quickStartItems) {
      const item = document.createElement("div");
      item.className = "xlc-setup-quickstart-item";
      const dot = document.createElement("span");
      dot.className = "xlc-setup-quickstart-dot";
      dot.textContent = number;
      dot.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span");
      copy.className = "xlc-setup-quickstart-copy";
      const itemTitle = document.createElement("strong");
      itemTitle.className = "xlc-setup-quickstart-item-title";
      itemTitle.textContent = title;
      const itemDesc = document.createElement("span");
      itemDesc.className = "xlc-setup-quickstart-item-desc";
      itemDesc.textContent = desc;
      copy.append(itemTitle, itemDesc);
      item.append(dot, copy);
      quickStart.appendChild(item);
    }
    root.appendChild(quickStart);
    if (!showQuickStart) quickStart.style.display = "none";
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
    modeSelect.dataset.xlcControl = "setup.mode";
    modeLabel.htmlFor = modeSelect.id;
    const modes = [
      { v: "new-doc", label: t("setupCreateNewDoc") },
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
    if (existingConfig) modeSelect.value = existingConfig.mode;
    modeWrap.appendChild(modeSelect);
    step1.appendChild(modeWrap);
    const pickerWrap = document.createElement("div");
    pickerWrap.className = "xlc-form-field";
    const pickerInput = document.createElement("input");
    pickerInput.className = "b3-text-field";
    pickerInput.placeholder = t("docPicker");
    pickerInput.setAttribute("aria-label", t("docPicker"));
    pickerInput.dataset.xlcControl = "setup.docs.query";
    pickerWrap.appendChild(pickerInput);
    const pickerList = document.createElement("div");
    pickerList.className = "xlc-doclist";
    pickerWrap.appendChild(pickerList);
    step1.appendChild(pickerWrap);
    let pickerSeq = 0;
    const currentDocId = (existingConfig == null ? void 0 : existingConfig.mode) !== "notebook" ? existingConfig == null ? void 0 : existingConfig.containerDocIds[0] : void 0;
    const showDocPickerMessage = (message, retry) => {
      pickerList.textContent = "";
      const status = document.createElement("div");
      status.className = "xlc-doclist-empty";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.textContent = message;
      pickerList.appendChild(status);
      if (retry) {
        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.className = "b3-button xlc-btn-ghost xlc-doclist-retry";
        retryBtn.dataset.xlcControl = "setup.docs.retry";
        retryBtn.textContent = t("retry");
        retryBtn.addEventListener("click", retry);
        pickerList.appendChild(retryBtn);
      }
    };
    const searchPickerDocs = (keyword) => {
      const seq = ++pickerSeq;
      pickerList.innerHTML = "";
      pickerList.removeAttribute("aria-busy");
      pickedDoc = null;
      syncNextState();
      if (!keyword) return;
      pickerList.setAttribute("aria-busy", "true");
      showDocPickerMessage(t("loading"));
      void ctx.library.searchDocs(keyword).then((result) => {
        if (seq !== pickerSeq) return;
        pickerList.removeAttribute("aria-busy");
        if (!result.ok || result.data.length === 0) {
          const message = result.ok ? t("docPickerEmpty") : t("kernelError", result.message);
          showDocPickerMessage(message, result.ok ? void 0 : () => {
            if (pickerInput.value.trim() === keyword) searchPickerDocs(keyword);
          });
          return;
        }
        pickerList.textContent = "";
        for (const hit of result.data.slice(0, 8)) {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "xlc-doclist-item";
          item.dataset.xlcControl = "setup.doc.result";
          item.textContent = hit.hPath || hit.name || hit.id;
          if (hit.id === currentDocId) {
            pickedDoc = { id: hit.id, hPath: hit.hPath };
            item.classList.add("xlc-doclist-item--on");
          }
          item.addEventListener("click", () => {
            pickedDoc = { id: hit.id, hPath: hit.hPath };
            pickerList.querySelectorAll(".xlc-doclist-item").forEach((el) => el.classList.remove("xlc-doclist-item--on"));
            item.classList.add("xlc-doclist-item--on");
            syncNextState();
          });
          pickerList.appendChild(item);
        }
        syncNextState();
      }).catch((err) => {
        if (seq !== pickerSeq) return;
        pickerList.removeAttribute("aria-busy");
        showDocPickerMessage(t("kernelError", err instanceof Error ? err.message : String(err)), () => {
          if (pickerInput.value.trim() === keyword) searchPickerDocs(keyword);
        });
      });
    };
    pickerInput.addEventListener("input", () => searchPickerDocs(pickerInput.value.trim()));
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
    nbSelect.dataset.xlcControl = "setup.notebook";
    nbSelect.disabled = true;
    if ((existingConfig == null ? void 0 : existingConfig.mode) === "notebook" && existingConfig.notebookIds[0]) {
      nbSelect.dataset.currentNotebook = existingConfig.notebookIds[0];
    }
    nbLabel.htmlFor = nbSelect.id;
    nbWrap.appendChild(nbSelect);
    const nbStatus = document.createElement("p");
    nbStatus.className = "xlc-form-hint xlc-setup-notebook-status";
    nbStatus.textContent = t("setupNotebookLoading");
    nbWrap.appendChild(nbStatus);
    const retryNotebooksBtn = document.createElement("button");
    retryNotebooksBtn.type = "button";
    retryNotebooksBtn.className = "b3-button xlc-btn-ghost xlc-setup-notebook-retry";
    retryNotebooksBtn.dataset.xlcControl = "setup.notebook.retry";
    retryNotebooksBtn.textContent = t("retry");
    retryNotebooksBtn.style.display = "none";
    nbWrap.appendChild(retryNotebooksBtn);
    step1.appendChild(nbWrap);
    let notebooksLoaded = false;
    let notebooksLoading = false;
    let notebookDocsChecking = false;
    let checkedNotebookId = "";
    let notebookDocsState = "unchecked";
    const loadNotebooks = (force = false) => {
      if (!force && notebooksLoaded || notebooksLoading) return;
      notebooksLoading = true;
      notebooksLoaded = false;
      nbSelect.disabled = true;
      nbStatus.textContent = t("setupNotebookLoading");
      retryNotebooksBtn.style.display = "none";
      retryNotebookAction = () => {
        void loadNotebooks(true);
      };
      void ctx.library.listNotebooks().then((result) => {
        nbSelect.textContent = "";
        if (!result.ok) {
          return;
        }
        if (result.data.length === 0) {
          notebooksLoaded = true;
          return;
        }
        const choose = document.createElement("option");
        choose.value = "";
        choose.textContent = t("setupChooseNotebook");
        choose.disabled = true;
        nbSelect.appendChild(choose);
        for (const nb of result.data) {
          const opt = document.createElement("option");
          opt.value = nb.id;
          opt.textContent = nb.name;
          nbSelect.appendChild(opt);
        }
        nbSelect.value = nbSelect.dataset.currentNotebook && result.data.some((nb) => nb.id === nbSelect.dataset.currentNotebook) ? nbSelect.dataset.currentNotebook : "";
        notebooksLoaded = true;
        nbSelect.disabled = false;
      }).catch(() => {
      }).finally(() => {
        notebooksLoading = false;
        renderNotebookStatus();
        syncCreateState();
        syncNextState();
      });
    };
    let retryNotebookAction = () => {
      void loadNotebooks(true);
    };
    retryNotebooksBtn.addEventListener("click", () => retryNotebookAction());
    const renderNotebookStatus = () => {
      const selectedId = nbSelect.value;
      if (notebooksLoading) {
        nbStatus.textContent = t("setupNotebookLoading");
        retryNotebooksBtn.style.display = "none";
        return;
      }
      if (!notebooksLoaded) {
        nbStatus.textContent = t("setupNotebookLoadFailed");
        retryNotebooksBtn.style.display = "";
        retryNotebookAction = () => {
          void loadNotebooks(true);
        };
        return;
      }
      if (nbSelect.options.length <= 1) {
        nbStatus.textContent = t("setupNotebookEmpty");
        retryNotebooksBtn.style.display = "none";
        return;
      }
      if (modeSelect.value !== "notebook" || !selectedId) {
        nbStatus.textContent = t("setupNotebookReady");
        retryNotebooksBtn.style.display = "none";
        return;
      }
      if (notebookDocsChecking) {
        nbStatus.textContent = t("setupNotebookDocsChecking");
        retryNotebooksBtn.style.display = "none";
        return;
      }
      if (checkedNotebookId !== selectedId || notebookDocsState === "unchecked") {
        nbStatus.textContent = t("setupNotebookNeedsDocsCheck");
        retryNotebooksBtn.style.display = "none";
        return;
      }
      if (notebookDocsState === "ready") {
        nbStatus.textContent = t("setupNotebookDocsReady");
        retryNotebooksBtn.style.display = "none";
        return;
      }
      nbStatus.textContent = notebookDocsState === "empty" ? t("setupNotebookNoDocs") : t("setupNotebookDocsCheckFailed");
      retryNotebooksBtn.style.display = notebookDocsState === "error" ? "" : "none";
      retryNotebookAction = () => {
        const notebookId = nbSelect.value;
        const revision = setupRevision;
        void verifyNotebookHasDocs(notebookId).then((valid) => {
          if (valid && setupRevision === revision && modeSelect.value === "notebook" && nbSelect.value === notebookId) gotoStep(2);
        });
      };
    };
    async function verifyNotebookHasDocs(notebookId) {
      if (notebookDocsChecking || !notebookId) return false;
      notebookDocsChecking = true;
      checkedNotebookId = notebookId;
      notebookDocsState = "unchecked";
      nbSelect.disabled = true;
      renderNotebookStatus();
      try {
        const result = await ctx.library.listNotebookDocs(notebookId);
        if (!result.ok) {
          notebookDocsState = "error";
          ctx.notify("error", t("kernelError", result.message));
          return false;
        }
        if (result.data.length === 0) {
          notebookDocsState = "empty";
          ctx.notify("error", t("setupNotebookNoDocs"));
          return false;
        }
        notebookDocsState = "ready";
        return true;
      } catch (err) {
        notebookDocsState = "error";
        ctx.notify("error", t("kernelError", err instanceof Error ? err.message : String(err)));
        return false;
      } finally {
        notebookDocsChecking = false;
        nbSelect.disabled = !notebooksLoaded || nbSelect.options.length <= 1;
        renderNotebookStatus();
        syncCreateState();
        syncNextState();
      }
    }
    const syncModeUi = () => {
      const mode = modeSelect.value;
      const needsNotebook = mode === "notebook" || mode === "new-doc";
      pickerWrap.style.display = mode === "doc" || mode === "tree" ? "" : "none";
      nbWrap.style.display = needsNotebook ? "" : "none";
      nameWrap.style.display = mode === "new-doc" ? "" : "none";
      nbLabel.textContent = mode === "new-doc" ? t("setupCreateNotebook") : t("setupNotebook");
      if (needsNotebook) loadNotebooks();
      renderNotebookStatus();
      syncCreateState();
      syncNextState();
    };
    modeSelect.addEventListener("change", () => {
      setupRevision++;
      syncModeUi();
    });
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
    nameInput.dataset.xlcControl = "setup.newdoc.title";
    nameLabel.htmlFor = nameInput.id;
    nameInput.value = t("setupNewDocName");
    nameRow.appendChild(nameInput);
    const createBtn = document.createElement("button");
    createBtn.className = "b3-button";
    createBtn.dataset.xlcControl = "setup.newdoc.create";
    createBtn.style.whiteSpace = "nowrap";
    createBtn.textContent = t("create");
    createBtn.disabled = true;
    let creatingLibrary = false;
    createBtn.addEventListener("click", () => {
      const notebookId = nbSelect.value;
      const title = nameInput.value.trim();
      if (!notebookId || !title) {
        ctx.notify("error", t("invalidItem"));
        return;
      }
      const revision = setupRevision;
      (0, import_siyuan3.confirm)("\u26A0\uFE0F " + t("setupTitle"), t("setupConfirmCreate", title), () => {
        if (creatingLibrary || setupRevision !== revision || modeSelect.value !== "new-doc" || nbSelect.value !== notebookId || nameInput.value.trim() !== title) return;
        creatingLibrary = true;
        modeSelect.disabled = true;
        nbSelect.disabled = true;
        nameInput.disabled = true;
        createBtn.textContent = t("saving");
        syncCreateState();
        void ctx.library.createLibraryDoc(notebookId, title).then((result) => {
          creatingLibrary = false;
          modeSelect.disabled = false;
          nbSelect.disabled = !notebooksLoaded || nbSelect.options.length <= 1;
          nameInput.disabled = false;
          createBtn.textContent = t("create");
          syncCreateState();
          if (!result.ok) {
            nbStatus.textContent = t("kernelError", result.message);
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
          creatingLibrary = false;
          modeSelect.disabled = false;
          nbSelect.disabled = !notebooksLoaded || nbSelect.options.length <= 1;
          nameInput.disabled = false;
          createBtn.textContent = t("create");
          syncCreateState();
          ctx.notify("error", t("kernelError", err.message));
        });
      });
    });
    nameRow.appendChild(createBtn);
    nameWrap.appendChild(nameRow);
    step1.appendChild(nameWrap);
    function syncCreateState() {
      createBtn.disabled = creatingLibrary || modeSelect.value !== "new-doc" || !notebooksLoaded || !nbSelect.value || !nameInput.value.trim();
    }
    nbSelect.addEventListener("change", () => {
      setupRevision++;
      checkedNotebookId = "";
      notebookDocsState = "unchecked";
      renderNotebookStatus();
      syncCreateState();
      syncNextState();
    });
    nameInput.addEventListener("input", syncCreateState);
    const step1Actions = document.createElement("div");
    step1Actions.className = "xlc-form-actions";
    if (opts == null ? void 0 : opts.onDismiss) {
      const dismissBtn = document.createElement("button");
      dismissBtn.className = "b3-button xlc-btn-ghost";
      dismissBtn.dataset.xlcControl = "setup.later";
      dismissBtn.textContent = t("setupLater");
      dismissBtn.addEventListener("click", () => {
        var _a;
        return (_a = opts.onDismiss) == null ? void 0 : _a.call(opts);
      });
      step1Actions.appendChild(dismissBtn);
    }
    const nextBtn = document.createElement("button");
    nextBtn.className = "b3-button xlc-btn-primary";
    nextBtn.dataset.xlcControl = "setup.next";
    nextBtn.textContent = t("setupNext");
    nextBtn.disabled = true;
    nextBtn.addEventListener("click", () => {
      const mode = modeSelect.value;
      if (mode === "notebook" && !nbSelect.value) {
        ctx.notify("error", nbSelect.disabled ? t("setupNotebookNotReady") : t("pickNotebookFirst"));
        return;
      }
      if (mode !== "notebook" && !pickedDoc) {
        ctx.notify("error", t("pickDocFirst"));
        return;
      }
      if (mode === "notebook") {
        const notebookId = nbSelect.value;
        const revision = setupRevision;
        nextBtn.disabled = true;
        void verifyNotebookHasDocs(notebookId).then((valid) => {
          if (valid && setupRevision === revision && modeSelect.value === "notebook" && nbSelect.value === notebookId) gotoStep(2);
        }).finally(() => syncNextState());
        return;
      }
      gotoStep(2);
    });
    step1Actions.appendChild(nextBtn);
    step1.appendChild(step1Actions);
    function syncNextState() {
      const mode = modeSelect.value;
      const rootCheckFailed = checkedNotebookId === nbSelect.value && (notebookDocsState === "empty" || notebookDocsState === "error");
      nextBtn.style.display = mode === "new-doc" ? "none" : "";
      nextBtn.disabled = mode === "notebook" ? !notebooksLoaded || !nbSelect.value || notebookDocsChecking || rootCheckFailed : mode === "new-doc" || !pickedDoc;
    }
    syncModeUi();
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
    backBtn.dataset.xlcControl = "setup.back";
    backBtn.textContent = t("setupBack");
    backBtn.addEventListener("click", () => gotoStep(1));
    step2Actions.appendChild(backBtn);
    const finishBtn = document.createElement("button");
    finishBtn.className = "b3-button xlc-btn-primary";
    finishBtn.dataset.xlcControl = "setup.finish";
    finishBtn.textContent = t("setupFinish");
    finishBtn.addEventListener("click", () => {
      const mode = modeSelect.value;
      if (mode === "notebook") {
        const notebookId = nbSelect.value;
        if (!notebookId) {
          ctx.notify("error", t("invalidItem"));
          return;
        }
        const revision = setupRevision;
        finishBtn.disabled = true;
        void verifyNotebookHasDocs(notebookId).then((valid) => {
          if (setupRevision !== revision || step !== 2 || modeSelect.value !== "notebook" || nbSelect.value !== notebookId) return;
          if (!valid) {
            gotoStep(1);
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
        }).finally(() => {
          finishBtn.disabled = false;
          syncNextState();
        });
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
      desc.textContent = mode === "notebook" ? t("setupSummaryNotebook") : mode === "tree" ? t("setupSummaryTree") : t("setupSummaryDoc");
      text.appendChild(desc);
      card.appendChild(text);
      summaryWrap.appendChild(card);
    }
    function gotoStep(next) {
      setupRevision++;
      step = next;
      stepsEl.remove();
      root.insertBefore(buildStepsEl(step, step === 1 ? t("setupStep1") : t("setupStep2")), root.firstChild);
      step1.style.display = step === 1 ? "" : "none";
      hint.style.display = step === 1 ? "" : "none";
      usageGuide.style.display = step === 1 && !showQuickStart ? "" : "none";
      recommendation.style.display = step === 1 ? "" : "none";
      quickStart.style.display = step === 1 && showQuickStart ? "" : "none";
      step2.style.display = step === 2 ? "" : "none";
      if (step === 2) paintSummary();
    }
    if (existingConfig && existingConfig.mode !== "notebook") {
      const currentDoc = existingConfig.containerDocIds[0];
      if (currentDoc) {
        void ctx.library.getDocPath(currentDoc).then((hPath) => {
          var _a;
          if (!hPath || pickerInput.value) return;
          const pathParts = hPath.split("/").filter(Boolean);
          pickerInput.value = (_a = pathParts[pathParts.length - 1]) != null ? _a : hPath;
          pickerInput.dispatchEvent(new Event("input"));
        });
      }
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
    let addCtBtn = null;
    const repaintCt = () => {
      ctList.textContent = "";
      for (const ct of ctx.state.ai.customTransforms) {
        const row = document.createElement("div");
        row.className = "xlc-ct-row";
        const nameInput = document.createElement("input");
        nameInput.className = "b3-text-field xlc-ct-name";
        nameInput.dataset.xlcControl = `settings.ai.custom-transform.name.${ct.id}`;
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
        promptInput.dataset.xlcControl = `settings.ai.custom-transform.prompt.${ct.id}`;
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
        delBtn.dataset.xlcControl = `settings.ai.custom-transform.delete.${ct.id}`;
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
      if (addCtBtn) addCtBtn.disabled = ctx.state.ai.customTransforms.length >= 10;
    };
    repaintCt();
    addCtBtn = document.createElement("button");
    addCtBtn.type = "button";
    addCtBtn.className = "b3-button";
    addCtBtn.dataset.xlcControl = "settings.ai.custom-transform.add";
    addCtBtn.style.alignSelf = "flex-start";
    addCtBtn.textContent = t("customTransformAdd");
    addCtBtn.addEventListener("click", () => {
      var _a;
      if (ctx.state.ai.customTransforms.length >= 10) return;
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
      const pinyinInput = pinyinRow.querySelector("input");
      pinyinInput == null ? void 0 : pinyinInput.setAttribute("aria-busy", "true");
      if (pinyinInput) pinyinInput.disabled = true;
      pinyinRow.setAttribute("aria-busy", "true");
      void ctx.library.reindex().then((idx) => {
        var _a;
        if (mySeq !== pinyinSeq) return;
        (_a = ctx.refreshSearch) == null ? void 0 : _a.call(ctx);
        ctx.notify("info", t("reindexDone", String(idx.entries.length)));
      }).catch((err) => {
        if (mySeq !== pinyinSeq) return;
        ctx.notify("error", t("kernelError", err.message));
      }).finally(() => {
        if (pinyinInput) {
          pinyinInput.disabled = false;
          pinyinInput.removeAttribute("aria-busy");
        }
        pinyinRow.removeAttribute("aria-busy");
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
  function buildSavedViewsSection(ctx, root, beforeOpen) {
    const t = ctx.t;
    const sec = document.createElement("div");
    sec.className = "xlc-form-field xlc-card xlc-saved-views";
    sec.dataset.xlcControl = "settings.saved-views";
    const label = document.createElement("span");
    label.className = "xlc-form-label";
    label.textContent = t("savedViewsSection");
    sec.appendChild(label);
    const list = document.createElement("div");
    list.className = "xlc-saved-view-list";
    list.setAttribute("role", "list");
    list.setAttribute("aria-label", t("savedViewsSection"));
    sec.appendChild(list);
    const readViews = () => {
      var _a, _b;
      const fromContext = (_a = ctx.getSavedDiscoveryViews) == null ? void 0 : _a.call(ctx);
      return (_b = fromContext != null ? fromContext : ctx.state.search.savedDiscoveryViews) != null ? _b : [];
    };
    const scopeLabel = (scope) => {
      switch (scope) {
        case "document":
          return t("discoveryScopeDocument");
        case "notebook":
          return t("discoveryScopeNotebook");
        case "tree":
          return t("discoveryScopeTree");
        case "selected-notebook":
          return t("discoveryScopeSelectedNotebook");
        case "all-notebooks":
          return t("discoveryScopeAllNotebooks");
      }
    };
    const render = () => {
      list.replaceChildren();
      const views = readViews();
      if (views.length === 0) {
        const empty = document.createElement("span");
        empty.className = "xlc-form-hint xlc-saved-view-empty";
        empty.textContent = t("savedViewsEmpty");
        list.appendChild(empty);
        return;
      }
      for (const view of views) {
        const row = document.createElement("div");
        row.className = "xlc-setting-row xlc-saved-view-row";
        row.dataset.xlcSavedViewId = view.id;
        row.setAttribute("role", "listitem");
        const text = document.createElement("span");
        text.className = "xlc-setting-text";
        const name = document.createElement("strong");
        name.className = "xlc-saved-view-name";
        name.textContent = view.name;
        text.appendChild(name);
        const meta = document.createElement("span");
        meta.className = "xlc-setting-sub xlc-saved-view-meta";
        const pieces = [`#${view.tag}`, scopeLabel(view.scope)];
        if (view.pathLabel) pieces.push(view.pathLabel);
        meta.textContent = pieces.join(" \xB7 ");
        text.appendChild(meta);
        row.appendChild(text);
        const actions = document.createElement("span");
        actions.className = "xlc-setting-actions";
        const open = document.createElement("button");
        open.type = "button";
        open.className = "b3-button xlc-btn-ghost";
        open.dataset.xlcControl = "settings.saved-view.open";
        open.textContent = t("savedViewsOpen");
        open.disabled = !ctx.openSavedDiscoveryView;
        open.addEventListener("click", () => {
          if (!ctx.openSavedDiscoveryView) return;
          beforeOpen == null ? void 0 : beforeOpen();
          ctx.openSavedDiscoveryView(view);
        });
        actions.appendChild(open);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "b3-button xlc-btn-ghost";
        remove.dataset.xlcControl = "settings.saved-view.delete";
        remove.textContent = t("savedViewsDelete");
        remove.addEventListener("click", () => {
          (0, import_siyuan3.confirm)("\u26A0\uFE0F " + t("savedViewsDelete"), t("savedViewsDeleteConfirm", view.name), () => {
            var _a;
            if (ctx.deleteSavedDiscoveryView) {
              ctx.deleteSavedDiscoveryView(view.id);
            } else {
              ctx.state.search.savedDiscoveryViews = ((_a = ctx.state.search.savedDiscoveryViews) != null ? _a : []).filter((entry) => entry.id !== view.id);
              ctx.persistSoon();
            }
            ctx.notify("info", `${t("savedViewsDelete")}: ${view.name}`);
            render();
          });
        });
        actions.appendChild(remove);
        row.appendChild(actions);
        list.appendChild(row);
      }
    };
    render();
    root.appendChild(sec);
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
    libRow.textContent = `${t("librarySection")}\uFF1A${cfg ? cfg.mode === "notebook" ? t("libModeNotebook", String(cfg.notebookIds.length)) : cfg.mode === "tree" ? t("libModeTree", String(cfg.containerDocIds.length)) : t("libModeDoc", String(cfg.containerDocIds.length)) : t("libraryNone")}`;
    dataSec.appendChild(libRow);
    const operationStatus = document.createElement("div");
    operationStatus.className = "xlc-operation-status";
    operationStatus.hidden = true;
    operationStatus.setAttribute("role", "status");
    operationStatus.setAttribute("aria-live", "polite");
    dataSec.appendChild(operationStatus);
    const setOperationStatus = (state, message = "", retry) => {
      operationStatus.dataset.state = state;
      operationStatus.hidden = state === "idle";
      operationStatus.replaceChildren();
      if (message) {
        const text = document.createElement("span");
        text.className = state === "error" ? "xlc-form-error" : "xlc-form-hint";
        text.textContent = message;
        operationStatus.appendChild(text);
      }
      if (retry && state === "error") {
        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.className = "b3-button xlc-btn-ghost xlc-operation-retry";
        retryBtn.dataset.xlcControl = "settings.data.retry";
        retryBtn.textContent = t("retry");
        retryBtn.addEventListener("click", retry);
        operationStatus.appendChild(retryBtn);
      }
    };
    const dataBtns = document.createElement("div");
    dataBtns.style.display = "flex";
    dataBtns.style.gap = "8px";
    dataBtns.style.flexWrap = "wrap";
    const mkBtn = (label, onClick, control) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "b3-button";
      btn.textContent = label;
      if (control) btn.dataset.xlcControl = control;
      if (onClick) btn.addEventListener("click", onClick);
      dataBtns.appendChild(btn);
      return btn;
    };
    const withFlight = (btn, run, opts = {}) => {
      btn.addEventListener("click", () => {
        var _a, _b;
        if (btn.disabled) return;
        btn.disabled = true;
        const original = (_a = btn.textContent) != null ? _a : "";
        btn.setAttribute("aria-busy", "true");
        if (opts.flightLabel) btn.textContent = opts.flightLabel;
        setOperationStatus("loading", (_b = opts.loading) != null ? _b : t("loading"));
        void Promise.resolve().then(run).then((result) => {
          var _a2, _b2, _c, _d;
          const value = result != null ? result : {};
          if (value.status === "empty") {
            setOperationStatus("empty", (_b2 = (_a2 = value.message) != null ? _a2 : opts.empty) != null ? _b2 : t("empty"));
          } else if (value.message || opts.success) {
            setOperationStatus("success", (_d = (_c = value.message) != null ? _c : opts.success) != null ? _d : "");
          } else {
            setOperationStatus("idle");
          }
        }).catch((err) => {
          var _a2, _b2;
          const message = (_b2 = (_a2 = opts.formatError) == null ? void 0 : _a2.call(opts, err)) != null ? _b2 : t("kernelError", err instanceof Error ? err.message : String(err));
          ctx.notify("error", message);
          setOperationStatus("error", message, () => btn.click());
        }).finally(() => {
          btn.disabled = false;
          btn.removeAttribute("aria-busy");
          if (opts.flightLabel) btn.textContent = original;
        });
      });
    };
    const reindexBtn = mkBtn(t("reindexBtn"), void 0, "settings.data.reindex");
    withFlight(reindexBtn, async () => {
      var _a;
      const idx = await ctx.library.reindex();
      const message = idx.truncated ? t("reindexTruncated", String(LIMITS.maxItems)) : t("reindexDone", String(idx.entries.length));
      (_a = ctx.refreshSearch) == null ? void 0 : _a.call(ctx);
      ctx.notify("info", message);
      return { message };
    }, { flightLabel: t("indexing"), loading: t("indexing") });
    const clearRecentsBtn = mkBtn(ctx.state.recents.length ? t("clearRecents") : t("clearRecentsEmpty"), void 0, "settings.data.clearRecents");
    clearRecentsBtn.addEventListener("click", () => {
      if (ctx.state.recents.length === 0 || clearRecentsBtn.disabled) return;
      (0, import_siyuan3.confirm)("\u26A0\uFE0F " + t("clearRecents"), t("clearRecentsConfirm"), () => {
        var _a;
        ctx.state.recents = [];
        ctx.persistSoon();
        (_a = ctx.refreshSearch) == null ? void 0 : _a.call(ctx);
        clearRecentsBtn.textContent = t("clearRecentsEmpty");
        clearRecentsBtn.disabled = true;
        ctx.notify("info", t("clearRecentsDone"));
        setOperationStatus("success", t("clearRecentsDone"));
      });
    });
    clearRecentsBtn.disabled = ctx.state.recents.length === 0;
    if (ctx.state.ai.enabled) {
      const auditBtn = mkBtn("\u2726 " + t("tagAuditBtn"), void 0, "settings.data.tagAudit");
      withFlight(auditBtn, async () => {
        const result = await runTagAudit(ctx);
        return result === "empty" ? { status: "empty", message: t("tagAuditTooFew") } : void 0;
      }, { flightLabel: "\u2726 " + t("aiWorking"), loading: t("aiWorking"), formatError: (err) => err instanceof Error ? err.message : String(err) });
    }
    const exportBtn = mkBtn(t("exportBtn"), void 0, "settings.data.export");
    withFlight(exportBtn, async () => {
      const json = await ctx.exportBundle();
      const count = JSON.parse(json).items.length;
      if (count === 0) {
        return { status: "empty", message: t("exportEmpty") };
      }
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `xiaolv-common-export-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
      const message = t("exportDone", String(count));
      ctx.notify("info", message);
      return { message };
    }, { flightLabel: t("indexing"), loading: t("indexing"), formatError: (err) => formatExportError(ctx, err) });
    const packBtn = mkBtn(t("packBtn"), void 0, "settings.data.packExport");
    withFlight(packBtn, async () => {
      await openPackExportDialog(ctx);
      return { message: t("packExportTitle") };
    }, { flightLabel: t("loading"), loading: t("loading"), formatError: (err) => formatExportError(ctx, err) });
    const importBtn = mkBtn(t("importBtn"), () => {
      var _a;
      if (importBtn.disabled) return;
      const originalLabel = (_a = importBtn.textContent) != null ? _a : "";
      let finished = false;
      let focusTimer = null;
      let onFocus;
      const finish = () => {
        if (finished) return;
        finished = true;
        importBtn.disabled = false;
        importBtn.textContent = originalLabel;
        importBtn.removeAttribute("aria-busy");
        window.removeEventListener("focus", onFocus);
        if (focusTimer !== null) window.clearTimeout(focusTimer);
      };
      onFocus = () => {
        focusTimer = window.setTimeout(finish, 350);
      };
      importBtn.disabled = true;
      importBtn.setAttribute("aria-busy", "true");
      importBtn.textContent = t("loading");
      setOperationStatus("loading", t("loading"));
      window.addEventListener("focus", onFocus, { once: true });
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.dataset.xlcControl = "settings.import.file";
      fileInput.accept = ".json,application/json,.md,text/markdown";
      fileInput.addEventListener("change", () => {
        var _a2;
        const file = (_a2 = fileInput.files) == null ? void 0 : _a2[0];
        if (!file) {
          finish();
          return;
        }
        if (file.size > LIMITS.maxImportBytes) {
          const message = t("importFailed", t("importReasonTooLarge"));
          ctx.notify("error", message);
          setOperationStatus("error", message, () => importBtn.click());
          finish();
          return;
        }
        void file.text().then((text) => {
          var _a3;
          const isMd = /\.md$/i.test(file.name);
          if (isMd) {
            const parsed = parseMarkdownPack(text);
            if (parsed.items.length === 0) {
              const message = t("importFailed", t("importReasonNoMeta"));
              ctx.notify("error", message);
              setOperationStatus("error", message, () => importBtn.click());
              finish();
              return;
            }
            openImportPolicyDialog(ctx, { items: parsed.items, pack: parsed.pack }, parsed.issues, { kind: "markdown-pack", items: parsed.items });
            setOperationStatus("success", t("importPreview", String(parsed.items.length), String(parsed.issues.length)));
            finish();
            return;
          }
          const validation = validateImport(text);
          if (!validation.ok || !validation.parsed) {
            const message = t("importFailed", (_a3 = validation.reason) != null ? _a3 : t("importReasonUnknown"));
            ctx.notify("error", message);
            setOperationStatus("error", message, () => importBtn.click());
            finish();
            return;
          }
          openImportPolicyDialog(ctx, validation.parsed, validation.issues, { kind: "json", text });
          setOperationStatus("success", t("importPreview", String(validation.parsed.items.length), String(validation.issues.length)));
          finish();
        }).catch((err) => {
          const message = t("importFailed", err instanceof Error ? err.message : String(err));
          ctx.notify("error", message);
          setOperationStatus("error", message, () => importBtn.click());
          finish();
        });
      });
      fileInput.addEventListener("cancel", () => {
        finish();
        setOperationStatus("idle");
      });
      fileInput.click();
    });
    importBtn.dataset.xlcControl = "settings.data.import";
    const espansoBtn = mkBtn(t("espansoImportBtn"), void 0, "settings.data.espansoImport");
    let espansoOpen = false;
    espansoBtn.addEventListener("click", () => {
      if (espansoOpen || espansoBtn.disabled) return;
      espansoOpen = true;
      espansoBtn.disabled = true;
      espansoBtn.setAttribute("aria-busy", "true");
      setOperationStatus("loading", t("loading"));
      openEspansoImportDialog(ctx, () => {
        espansoOpen = false;
        espansoBtn.disabled = false;
        espansoBtn.removeAttribute("aria-busy");
        setOperationStatus("idle");
      });
    });
    dataSec.appendChild(dataBtns);
    const templateRow = document.createElement("div");
    templateRow.className = "xlc-setting-row xlc-template-import-row";
    const templateText = document.createElement("span");
    templateText.className = "xlc-setting-text";
    templateText.textContent = t("promptPackHint");
    templateRow.appendChild(templateText);
    const templateBtn = document.createElement("button");
    templateBtn.type = "button";
    templateBtn.className = "b3-button";
    templateBtn.textContent = t("promptPackBtn");
    templateBtn.dataset.xlcControl = "settings.data.templateImport";
    templateBtn.addEventListener("click", () => {
      var _a;
      if (templateBtn.disabled) return;
      templateBtn.disabled = true;
      templateBtn.setAttribute("aria-busy", "true");
      const originalLabel = (_a = templateBtn.textContent) != null ? _a : "";
      templateBtn.textContent = t("loading");
      setOperationStatus("loading", t("loading"));
      const parsed = parseMarkdownPack(PROMPT_PACK_MD);
      if (parsed.items.length === 0) {
        const message = t("importFailed", t("importReasonPackEmpty"));
        ctx.notify("error", message);
        setOperationStatus("error", message, () => templateBtn.click());
        templateBtn.disabled = false;
        templateBtn.removeAttribute("aria-busy");
        templateBtn.textContent = originalLabel;
        return;
      }
      openImportPolicyDialog(ctx, { items: parsed.items, pack: parsed.pack }, parsed.issues, { kind: "markdown-pack", items: parsed.items });
      setOperationStatus("success", t("importPreview", String(parsed.items.length), String(parsed.issues.length)));
      templateBtn.disabled = false;
      templateBtn.removeAttribute("aria-busy");
      templateBtn.textContent = originalLabel;
    });
    templateRow.appendChild(templateBtn);
    dataSec.appendChild(templateRow);
    root.appendChild(dataSec);
  }
  function openEspansoImportDialog(ctx, onClose) {
    const t = ctx.t;
    const dialog = new import_siyuan3.Dialog({
      title: t("espansoTitle"),
      content: "",
      width: "min(680px, 92vw)",
      height: "min(680px, 86vh)"
    });
    const container = dialog.element.querySelector(".b3-dialog__container");
    if (container) container.classList.add("xlc-form-host", "xlc-settings-host");
    const body = getDialogBody(dialog.element);
    if (!body) {
      onClose == null ? void 0 : onClose();
      return;
    }
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "xlc-form";
    const hint = document.createElement("p");
    hint.className = "xlc-form-hint";
    hint.textContent = t("espansoHint");
    root.appendChild(hint);
    const ta = document.createElement("textarea");
    ta.className = "b3-text-field";
    ta.dataset.xlcControl = "settings.espanso.text";
    ta.rows = 10;
    ta.placeholder = t("espansoPlaceholder");
    ta.setAttribute("spellcheck", "false");
    root.appendChild(ta);
    const preview = document.createElement("div");
    preview.className = "xlc-form-hint";
    preview.style.whiteSpace = "pre-wrap";
    root.appendChild(preview);
    const foot = document.createElement("div");
    foot.className = "xlc-form-row";
    foot.style.justifyContent = "flex-end";
    foot.style.gap = "8px";
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "b3-button";
    cancelBtn.dataset.xlcControl = "settings.espanso.cancel";
    cancelBtn.textContent = t("cancel");
    foot.appendChild(cancelBtn);
    const nextBtn = document.createElement("button");
    nextBtn.className = "b3-button xlc-btn-primary";
    nextBtn.dataset.xlcControl = "settings.espanso.next";
    nextBtn.textContent = t("setupNext");
    nextBtn.disabled = true;
    foot.appendChild(nextBtn);
    root.appendChild(foot);
    body.appendChild(root);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      observer == null ? void 0 : observer.disconnect();
      onClose == null ? void 0 : onClose();
    };
    let observer = null;
    observer = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
      if (!dialog.element.isConnected) release();
    });
    observer == null ? void 0 : observer.observe(document.body, { childList: true, subtree: true });
    let parsedItems = [];
    let parsedText = null;
    const runParse = async () => {
      const sourceText = ta.value;
      parsedItems = [];
      parsedText = null;
      nextBtn.disabled = true;
      preview.textContent = "";
      let parser;
      try {
        parser = await loadEspansoParser();
      } catch (err) {
        preview.textContent = t("importFailed", err.message.slice(0, 120));
        return;
      }
      if (sourceText !== ta.value || !dialog.element.isConnected) return;
      const result = parser.parseEspansoYaml(sourceText);
      if (result.items.length === 0) {
        preview.textContent = result.issues.length ? result.issues.slice(0, 5).join("\n") : t("espansoNone");
        return;
      }
      parsedItems = result.items;
      parsedText = sourceText;
      const lines = [t("espansoParsed", String(result.items.length))];
      for (const issue of result.issues.slice(0, 5)) lines.push(`\xB7 ${issue}`);
      if (result.issues.length > 5) lines.push(`\xB7 \u2026+${result.issues.length - 5}`);
      preview.textContent = lines.join("\n");
      nextBtn.disabled = false;
    };
    let parseTimer;
    ta.addEventListener("input", () => {
      if (parseTimer) clearTimeout(parseTimer);
      parsedItems = [];
      parsedText = null;
      nextBtn.disabled = true;
      preview.textContent = "";
      parseTimer = setTimeout(() => {
        void runParse();
      }, 400);
    });
    cancelBtn.addEventListener("click", () => {
      dialog.destroy();
      release();
    });
    nextBtn.addEventListener("click", () => {
      if (nextBtn.disabled || parsedItems.length === 0 || parsedText !== ta.value) return;
      dialog.destroy();
      release();
      openImportPolicyDialog(
        ctx,
        { items: parsedItems.map((i) => ({ id: i.id, title: i.title })) },
        [],
        { kind: "espanso", items: parsedItems }
      );
    });
    ta.focus();
  }
  async function runTagAudit(ctx) {
    var _a;
    const t = ctx.t;
    let idx;
    try {
      idx = await ctx.library.ensureIndex();
    } catch (err) {
      throw new Error(t("kernelError", err instanceof Error ? err.message : String(err)));
    }
    const tags = collectTags(idx.entries);
    if (tags.length < 2) {
      ctx.notify("info", t("tagAuditTooFew"));
      return "empty";
    }
    let suggestions;
    try {
      suggestions = await ctx.ai.tagAudit(tags);
    } catch (err) {
      throw new Error(ctx.aiErrorText(err));
    }
    const dialog = new import_siyuan3.Dialog({
      title: t("tagAuditTitle"),
      content: "",
      width: "min(620px, 92vw)",
      height: "min(600px, 84vh)"
      // 固定高：建议清单增长不顶跳（R146）
    });
    (_a = dialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _a.classList.add("xlc-form-host", "xlc-settings-host");
    const body = getDialogBody(dialog.element);
    if (!body) throw new Error(t("kernelError", "\u65E0\u6CD5\u6253\u5F00\u4F53\u68C0\u7ED3\u679C"));
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
    close.dataset.xlcControl = "settings.tag-audit.close";
    close.textContent = t("close");
    close.addEventListener("click", () => dialog.destroy());
    actions.appendChild(close);
    wrap.appendChild(actions);
    body.appendChild(wrap);
    return suggestions.length === 0 ? "empty" : "shown";
  }
  function openImportPolicyDialog(ctx, parsed, issues, source) {
    var _a;
    const t = ctx.t;
    const dialog = new import_siyuan3.Dialog({
      title: t("importPolicyTitle"),
      content: "",
      width: "min(540px, 92vw)",
      height: "min(640px, 86vh)"
      // 固定高：策略卡片高度稳定（R146）
    });
    (_a = dialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _a.classList.add("xlc-form-host", "xlc-settings-host");
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
    const receiptHint = document.createElement("p");
    receiptHint.className = "xlc-form-hint";
    receiptHint.setAttribute("role", "status");
    receiptHint.setAttribute("aria-live", "polite");
    receiptHint.textContent = t("importReceiptHint");
    const policyCards = [];
    const run = async (policy) => {
      var _a2;
      if (policyCards.some((card) => card.disabled)) return;
      policyCards.forEach((card) => {
        card.disabled = true;
        card.setAttribute("aria-busy", "true");
      });
      receiptHint.dataset.state = "loading";
      receiptHint.textContent = t("loading");
      try {
        const receipt = source.kind === "json" ? await ctx.importBundleText(source.text, policy) : await ctx.importMarkdownItems(source.items, policy);
        (_a2 = ctx.refreshSearch) == null ? void 0 : _a2.call(ctx);
        const message = t(
          "importDone",
          String(receipt.created),
          String(receipt.skipped),
          String(receipt.overwritten),
          String(receipt.renamed),
          String(receipt.failed)
        );
        receiptHint.dataset.state = receipt.failed > 0 ? "error" : "success";
        receiptHint.textContent = message;
        ctx.notify(receipt.failed > 0 ? "error" : "info", message);
      } catch (err) {
        const message = t("importRunFailed", err instanceof Error ? err.message : String(err));
        receiptHint.dataset.state = "error";
        receiptHint.replaceChildren();
        const error = document.createElement("span");
        error.className = "xlc-form-error";
        error.textContent = message;
        receiptHint.appendChild(error);
        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.className = "b3-button xlc-btn-ghost xlc-operation-retry";
        retryBtn.dataset.xlcControl = "settings.import.retry";
        retryBtn.textContent = t("retry");
        retryBtn.addEventListener("click", () => void run(policy));
        receiptHint.appendChild(retryBtn);
        ctx.notify("error", message);
        policyCards.forEach((card) => {
          card.disabled = false;
          card.removeAttribute("aria-busy");
        });
      }
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
      card.dataset.xlcControl = `settings.import.policy.${policy}`;
      card.addEventListener("click", () => void run(policy));
      policyCards.push(card);
      policyList.appendChild(card);
    }
    wrap.appendChild(policyList);
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
  var newWriteKey = (scope) => `xlc-${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`.slice(0, 120);
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
      /** 命令面板入口没有可禁用的按钮，用操作锁防止重复读取和重复落库。 */
      this.activeCaptures = /* @__PURE__ */ new Set();
      this.formOpen = false;
    }
    /** 保存前的共同前置条件：没有内容库时直接回到首次设置，避免先访问宿主再报错。 */
    ensureConfigured() {
      var _a, _b;
      if (!this.deps.isConfigured || this.deps.isConfigured()) return true;
      (_b = (_a = this.deps).onNotConfigured) == null ? void 0 : _b.call(_a);
      return false;
    }
    async withCaptureLock(key, action) {
      if (this.activeCaptures.has(key)) {
        this.deps.notify("info", this.deps.t("captureBusy"));
        return;
      }
      this.activeCaptures.add(key);
      try {
        await action();
      } catch (err) {
        this.deps.notify("error", this.deps.t("kernelError", err instanceof Error ? err.message : String(err)));
      } finally {
        this.activeCaptures.delete(key);
      }
    }
    notifyIfTruncated(text) {
      if (text.length <= 1e5) return text;
      this.deps.notify("info", this.deps.t("captureTruncated", "100000"));
      return text.slice(0, 1e5);
    }
    /** 保存当前选中内容（命令面板/正文右键入口） */
    async saveSelection() {
      var _a;
      if (!this.ensureConfigured()) return;
      let sel;
      try {
        sel = this.deps.getSelectionText();
      } catch (err) {
        this.deps.notify("error", this.deps.t("kernelError", err instanceof Error ? err.message : String(err)));
        return;
      }
      const text = sel.text.trim();
      if (!text) {
        this.deps.notify("error", this.deps.t("captureSelectionEmpty"));
        return;
      }
      const content = this.notifyIfTruncated(text);
      this.openForm(content, inferTypeFromText(content), sel.blockId, {
        docId: (_a = this.deps.currentDocId()) != null ? _a : void 0,
        sourceType: "selection"
      });
    }
    /** 从剪贴板捕获（失败诚实回执） */
    async captureFromClipboard() {
      if (!this.ensureConfigured()) return;
      await this.withCaptureLock("clipboard", async () => {
        try {
          const text = (await this.deps.readClipboardText()).trim();
          if (!text) {
            this.deps.notify("error", this.deps.t("clipboardEmpty"));
            this.openForm("", "text", null, {
              sourceType: "clipboard"
            });
            return;
          }
          const content = this.notifyIfTruncated(text);
          this.openForm(content, inferTypeFromText(content), null, {
            sourceType: "clipboard"
          });
        } catch {
          this.deps.notify("error", this.deps.t("clipboardReadFailed"));
          this.openForm("", "text", null, {
            sourceType: "clipboard"
          });
        }
      });
    }
    /** 快速捕获剪贴板（F8）：无表单一步入库——类型推断 + 首行作标题；
     *  同文已存在则诚实提示不重复写入（不打断）；⌥⇧V 连按防重入。 */
    async quickCaptureFromClipboard() {
      var _a, _b;
      if (this.deps.isConfigured && !this.deps.isConfigured()) {
        (_b = (_a = this.deps).onNotConfigured) == null ? void 0 : _b.call(_a);
        return;
      }
      await this.withCaptureLock("clipboard", () => this.doQuickCapture());
    }
    async doQuickCapture() {
      var _a;
      let text = "";
      let readFailed = false;
      try {
        text = (await this.deps.readClipboardText()).trim();
      } catch {
        readFailed = true;
      }
      if (!text) {
        this.deps.notify("error", this.deps.t(readFailed ? "clipboardReadFailed" : "clipboardEmpty"));
        return;
      }
      const content = this.notifyIfTruncated(text);
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
          title: firstLine.slice(0, 512),
          source: { sourceType: "clipboard" }
        }, { idempotencyKey: newWriteKey("clipboard") });
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
    newManual(titleCandidate) {
      var _a;
      if (!this.ensureConfigured()) return;
      this.openForm("", "text", null, {
        ...titleCandidate ? { title: titleCandidate } : {},
        docId: (_a = this.deps.currentDocId()) != null ? _a : void 0,
        sourceType: "manual"
      });
    }
    /** 从外部文本创建草稿（拖拽放置 / 面板快捷粘贴入口，ADR 0034 / T-0061） */
    newWithContent(content, options) {
      var _a, _b;
      if (!this.ensureConfigured()) return;
      const text = (content != null ? content : "").trim();
      if (!text) {
        this.newManual(options == null ? void 0 : options.title);
        return;
      }
      const safeText = this.notifyIfTruncated(text);
      const inferredType = inferTypeFromText(safeText);
      const derived = inferredType === "url" ? safeText : (safeText.split("\n")[0] || "").slice(0, 60).trim();
      const title = (options == null ? void 0 : options.title) || derived || this.deps.t("unknownType");
      this.openForm(safeText, inferredType, null, {
        title,
        docId: (_a = this.deps.currentDocId()) != null ? _a : void 0,
        sourceType: (_b = options == null ? void 0 : options.sourceType) != null ? _b : "manual"
      });
    }
    /** 右键块引用捕获：把被引用块存为 blockref 条目（目标块=引用目标） */
    captureBlockRef(blockId, refText) {
      var _a;
      if (!this.ensureConfigured()) return;
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
      if (!this.ensureConfigured()) return;
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
      if (!this.ensureConfigured()) return;
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
    /** 保存当前块：光标所在块整体作为条目，独立于选区保存语义。 */
    async captureCurrentBlock() {
      var _a;
      if (!this.ensureConfigured()) return;
      const sourceDocId = (_a = this.deps.currentDocId()) != null ? _a : void 0;
      await this.withCaptureLock("block", async () => {
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
        const content = this.notifyIfTruncated(kramdown);
        this.openForm(content, inferTypeFromText(content), blockId, {
          docId: sourceDocId,
          sourceType: "block"
        });
      });
    }
    /** 保存整篇文档为单个 Markdown 条目；不等同于发现文档中的多个候选。 */
    async captureCurrentDoc() {
      if (!this.ensureConfigured()) return;
      await this.withCaptureLock("document", async () => {
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
        if (!doc.content.trim()) {
          this.deps.notify("error", this.deps.t("captureDocEmpty"));
          return;
        }
        const title = (_a = doc.hPath.split("/").filter(Boolean).pop()) != null ? _a : doc.hPath;
        const content = this.notifyIfTruncated(doc.content);
        this.openForm(content, "markdown", null, { title, docId, sourceType: "doc-fragment" });
      });
    }
    openForm(defaultText, defaultType, sourceBlockId, overrides) {
      var _a, _b, _c, _d;
      if (this.deps.isConfigured && !this.deps.isConfigured()) {
        (_b = (_a = this.deps).onNotConfigured) == null ? void 0 : _b.call(_a);
        return;
      }
      if (this.formOpen) {
        this.deps.notify("info", this.deps.t("captureBusy"));
        return;
      }
      this.formOpen = true;
      const t = this.deps.t;
      let closed = false;
      let saving = false;
      const formWriteKey = newWriteKey("form");
      let tidySeq = 0;
      let draftSeq = 0;
      const dialog = new import_siyuan4.Dialog({
        title: t("newItem"),
        content: "",
        width: "min(620px, 92vw)",
        height: "min(860px, 92vh)",
        destroyCallback: () => {
          closed = true;
          this.formOpen = false;
          ++tidySeq;
          ++draftSeq;
        }
      });
      (_c = dialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _c.classList.add("xlc-form-host");
      const body = getDialogBody(dialog.element);
      if (!body) {
        this.formOpen = false;
        dialog.destroy();
        return;
      }
      body.innerHTML = "";
      const form = document.createElement("div");
      form.className = "xlc-form xlc-capture";
      const intro = document.createElement("p");
      intro.className = "xlc-page-intro";
      intro.textContent = t("captureIntro");
      form.appendChild(intro);
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
      const typeLabel2 = document.createElement("span");
      typeLabel2.className = "xlc-form-label";
      typeLabel2.textContent = t("type");
      typeWrap.appendChild(typeLabel2);
      const typeSelect = document.createElement("select");
      typeSelect.className = "b3-select xlc-form-type";
      typeSelect.dataset.xlcControl = "capture.type";
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
      contentEl.dataset.xlcControl = "capture.content";
      const contentWrap = contentEl.parentElement;
      const contentError = document.createElement("span");
      contentError.className = "xlc-form-error";
      contentError.id = "xlc-capture-content-error";
      contentError.setAttribute("role", "alert");
      contentError.hidden = true;
      contentWrap.appendChild(contentError);
      const varbar = buildVariableBar(t, () => contentEl);
      contentEl.parentElement.after(varbar);
      const titleEl = field(t("title"), (_d = overrides == null ? void 0 : overrides.title) != null ? _d : "", false, "xlc-form-title");
      titleEl.dataset.xlcControl = "capture.title";
      form.appendChild(metaRow);
      const aliasEl = field(t("alias"), "", false, "xlc-form-alias", metaRow);
      aliasEl.dataset.xlcControl = "capture.alias";
      metaRow.insertBefore(aliasEl.parentElement, typeWrap);
      const tagRow = document.createElement("div");
      tagRow.className = "xlc-form-row";
      const tagsEl = field(t("tags"), "", false, "xlc-form-tags", tagRow);
      tagsEl.dataset.xlcControl = "capture.tags";
      const tagsHint = document.createElement("span");
      tagsHint.className = "xlc-form-hint";
      tagsHint.textContent = t("tagsHint");
      tagsEl.parentElement.appendChild(tagsHint);
      const categoryEl = field(t("category"), "", false, "xlc-form-category", tagRow);
      categoryEl.dataset.xlcControl = "capture.category";
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
      const flagContentError = (message) => {
        contentEl.classList.add("xlc-input--error");
        contentEl.setAttribute("aria-invalid", "true");
        contentEl.setAttribute("aria-describedby", contentError.id);
        contentError.textContent = message;
        contentError.hidden = false;
        contentEl.focus();
      };
      contentEl.addEventListener("input", () => {
        contentEl.classList.remove("xlc-input--error");
        contentEl.removeAttribute("aria-invalid");
        contentEl.removeAttribute("aria-describedby");
        contentError.hidden = true;
        contentError.textContent = "";
      });
      const sugrow = document.createElement("div");
      sugrow.className = "xlc-sugrow";
      sugrow.style.display = "none";
      const sugText = document.createElement("span");
      sugrow.appendChild(sugText);
      const adoptBtn = document.createElement("button");
      adoptBtn.className = "xlc-sugrow-adopt";
      adoptBtn.dataset.xlcControl = "capture.ai.suggestion.adopt";
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
          tidyBtn.dataset.xlcControl = "capture.ai.tidy";
          tidyBtn.textContent = "\u2726 " + t("aiTidy");
          const tidyFailure = document.createElement("div");
          tidyFailure.className = "xlc-ai-failure";
          tidyFailure.hidden = true;
          const tidyFailureMessage = document.createElement("span");
          tidyFailureMessage.className = "xlc-form-error";
          tidyFailureMessage.dataset.xlcControl = "capture.ai.tidy.error";
          tidyFailureMessage.setAttribute("role", "alert");
          tidyFailureMessage.setAttribute("aria-live", "assertive");
          tidyFailure.appendChild(tidyFailureMessage);
          const tidyRetryBtn = document.createElement("button");
          tidyRetryBtn.type = "button";
          tidyRetryBtn.className = "xlc-form-ai xlc-ai-retry";
          tidyRetryBtn.dataset.xlcControl = "capture.ai.tidy.retry";
          tidyRetryBtn.textContent = t("retry");
          tidyFailure.appendChild(tidyRetryBtn);
          contentEl.parentElement.appendChild(tidyFailure);
          let tidyBusy = false;
          const syncTidyButton = () => {
            tidyBtn.disabled = tidyBusy || !contentEl.value.trim();
          };
          contentEl.addEventListener("input", syncTidyButton);
          syncTidyButton();
          const clearTidyFailure = () => {
            tidyFailure.hidden = true;
            tidyFailureMessage.textContent = "";
          };
          const showTidyFailure = (message) => {
            tidyFailureMessage.textContent = message || t("aiTransport");
            tidyFailure.hidden = false;
          };
          const runTidy = () => {
            if (closed || tidyBusy) return;
            const value = contentEl.value.trim();
            if (!value) {
              this.deps.notify("error", t("invalidItem"));
              return;
            }
            clearTidyFailure();
            suggestions = {};
            sugText.textContent = "";
            sugrow.style.display = "none";
            const request = ++tidySeq;
            tidyBusy = true;
            syncTidyButton();
            tidyBtn.textContent = t("aiWorking");
            void this.deps.aiTidy(value).then((result) => {
              var _a2;
              if (closed || request !== tidySeq) return;
              tidyBtn.textContent = "\u2726 " + t("aiTidy");
              tidyBusy = false;
              syncTidyButton();
              if (!result.ok) {
                showTidyFailure(result.message);
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
                result.alias ? `${t("alias")}\uFF1A${result.alias}` : "",
                ((_a2 = result.tags) == null ? void 0 : _a2.length) ? `${t("tags")}\uFF1A${result.tags.join("/")}` : "",
                result.category ? `${t("category")}\uFF1A${result.category}` : ""
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
              tidyBusy = false;
              syncTidyButton();
              showTidyFailure(err instanceof Error ? err.message : t("aiTransport"));
            });
          };
          tidyBtn.addEventListener("click", runTidy);
          tidyRetryBtn.addEventListener("click", runTidy);
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
        draftBtn.dataset.xlcControl = "capture.ai.draft.generate";
        draftBtn.textContent = "\u2726 " + t("aiDraftDesc");
        draftLabel.appendChild(draftBtn);
        const draftInput = document.createElement("input");
        draftInput.className = "b3-text-field";
        draftInput.dataset.xlcControl = "capture.ai.draft.description";
        draftInput.placeholder = t("aiDraftDesc");
        draftWrap.appendChild(draftInput);
        const draftFailure = document.createElement("div");
        draftFailure.className = "xlc-ai-failure";
        draftFailure.hidden = true;
        const draftFailureMessage = document.createElement("span");
        draftFailureMessage.className = "xlc-form-error";
        draftFailureMessage.dataset.xlcControl = "capture.ai.draft.error";
        draftFailureMessage.setAttribute("role", "alert");
        draftFailureMessage.setAttribute("aria-live", "assertive");
        draftFailure.appendChild(draftFailureMessage);
        const draftRetryBtn = document.createElement("button");
        draftRetryBtn.type = "button";
        draftRetryBtn.className = "xlc-form-ai xlc-ai-retry";
        draftRetryBtn.dataset.xlcControl = "capture.ai.draft.retry";
        draftRetryBtn.textContent = t("retry");
        draftFailure.appendChild(draftRetryBtn);
        draftWrap.appendChild(draftFailure);
        let draftBusy = false;
        draftBtn.disabled = true;
        const syncDraftButton = () => {
          draftBtn.disabled = draftBusy || !draftInput.value.trim();
        };
        draftInput.addEventListener("input", syncDraftButton);
        const clearDraftFailure = () => {
          draftFailure.hidden = true;
          draftFailureMessage.textContent = "";
        };
        const showDraftFailure = (message) => {
          draftFailureMessage.textContent = message || t("aiTransport");
          draftFailure.hidden = false;
        };
        const runDraft = () => {
          if (closed || draftBusy) return;
          const desc = draftInput.value.trim();
          if (!desc) {
            this.deps.notify("error", t("aiDraftNeedDescription"));
            draftInput.focus();
            return;
          }
          if (draftBtn.disabled) return;
          clearDraftFailure();
          draftBusy = true;
          syncDraftButton();
          const request = ++draftSeq;
          draftBtn.textContent = t("aiWorking");
          void this.deps.aiDraft(desc).then((result) => {
            if (closed || request !== draftSeq) return;
            draftBtn.textContent = "\u2726 " + t("aiDraftDesc");
            draftBusy = false;
            syncDraftButton();
            if (!result.ok) {
              showDraftFailure(result.message);
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
            if (closed || request !== draftSeq) return;
            draftBtn.textContent = "\u2726 " + t("aiDraftDesc");
            draftBusy = false;
            syncDraftButton();
            showDraftFailure(err instanceof Error ? err.message : t("aiTransport"));
          });
        };
        draftBtn.addEventListener("click", runDraft);
        draftRetryBtn.addEventListener("click", runDraft);
        form.insertBefore(draftWrap, form.firstChild);
      }
      const actions = document.createElement("div");
      actions.className = "xlc-form-actions";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "b3-button";
      cancelBtn.dataset.xlcControl = "capture.cancel";
      cancelBtn.textContent = t("cancel");
      cancelBtn.addEventListener("click", () => {
        closed = true;
        ++tidySeq;
        ++draftSeq;
        dialog.destroy();
      });
      const saveBtn = document.createElement("button");
      saveBtn.className = "b3-button xlc-btn-primary";
      saveBtn.dataset.xlcControl = "capture.save";
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
          flagContentError(t("captureContentRequired"));
          this.deps.notify("error", t("captureContentRequired"));
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
          if (!isSafeHttpUrl(markdown)) {
            flagContentError(t("captureUrlInvalid"));
            this.deps.notify("error", t("captureUrlInvalid"));
            return;
          }
        }
        saving = true;
        saveBtn.disabled = true;
        saveBtn.textContent = t("checkingDuplicate");
        cancelBtn.disabled = true;
        const doSave = () => {
          var _a2;
          if (closed) return;
          saving = true;
          saveBtn.disabled = true;
          saveBtn.textContent = t("saving");
          cancelBtn.disabled = true;
          const docId = overrides && "docId" in overrides ? overrides.docId : (overrides == null ? void 0 : overrides.sourceType) === "clipboard" ? void 0 : this.deps.currentDocId();
          void this.deps.createItem({
            itemType: type,
            markdown,
            title: titleEl.value || void 0,
            alias: aliasEl.value || void 0,
            tags: tagsEl.value ? tagsEl.value.split(/[,,]/).map((s) => s.trim()).filter(Boolean) : void 0,
            category: categoryEl.value || void 0,
            url: type === "url" ? markdown : void 0,
            targetBlockId: overrides == null ? void 0 : overrides.targetBlockId,
            source: docId || sourceBlockId || (overrides == null ? void 0 : overrides.sourceType) ? {
              sourceDocId: docId != null ? docId : "",
              sourceBlockId: sourceBlockId != null ? sourceBlockId : "",
              sourceType: (_a2 = overrides == null ? void 0 : overrides.sourceType) != null ? _a2 : sourceBlockId ? "selection" : "manual"
            } : void 0
          }, { idempotencyKey: formWriteKey }).then((result) => {
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
          if (closed) return;
          if (!dup) {
            saving = false;
            doSave();
            return;
          }
          saving = false;
          saveBtn.disabled = false;
          saveBtn.textContent = t("save");
          cancelBtn.disabled = false;
          (0, import_siyuan4.confirm)("\u26A0\uFE0F " + t("duplicateTitle"), t("duplicateConfirm", dup.title), () => {
            if (!closed) doSave();
          });
        }).catch((err) => {
          if (closed) return;
          saving = false;
          saveBtn.disabled = false;
          saveBtn.textContent = t("save");
          cancelBtn.disabled = false;
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

  // src/ui/discovery-dialog.ts
  var import_siyuan5 = __toESM(require_stub_dom());

  // src/model/discovery-facets.ts
  function matchesDiscoveryTag(tags, query) {
    const wanted = (query != null ? query : "").trim().toLocaleLowerCase();
    if (!wanted) return true;
    return (tags != null ? tags : []).some((tag) => typeof tag === "string" && tag.trim().toLocaleLowerCase() === wanted);
  }
  function buildDiscoveryTagFacets(candidates, limit = 12) {
    var _a, _b;
    const counts = /* @__PURE__ */ new Map();
    for (const candidate of candidates) {
      const seen = /* @__PURE__ */ new Set();
      for (const raw of (_a = candidate.tags) != null ? _a : []) {
        if (typeof raw !== "string") continue;
        const tag = raw.trim();
        if (!tag || seen.has(tag)) continue;
        seen.add(tag);
        counts.set(tag, ((_b = counts.get(tag)) != null ? _b : 0) + 1);
      }
    }
    const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 12;
    return Array.from(counts, ([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-Hans")).slice(0, safeLimit);
  }

  // src/ui/discovery-dialog.ts
  var FALLBACKS = {
    discoveryTitle: "\u4ECE\u5F53\u524D\u6587\u6863\u53D1\u73B0",
    discoveryTitleNotebook: "\u4ECE\u5F53\u524D\u7B14\u8BB0\u672C\u53D1\u73B0",
    discoveryTitleGeneral: "\u53D1\u73B0\u5DF2\u6709\u5185\u5BB9",
    discoveryTitleTree: "\u4ECE\u6307\u5B9A\u6587\u6863\u6811\u53D1\u73B0\u5E38\u7528\u8BED",
    discoveryScope: "\u626B\u63CF\u8303\u56F4",
    discoveryStartDocument: "\u5165\u53E3\u6587\u6863",
    discoveryScopeDocument: "\u5F53\u524D\u6587\u6863",
    discoveryScopeNotebook: "\u5F53\u524D\u7B14\u8BB0\u672C",
    discoveryScopeTree: "\u6307\u5B9A\u6587\u6863\u6811",
    discoveryScopeSelectedNotebook: "\u6307\u5B9A\u7B14\u8BB0\u672C",
    discoveryScopeAllNotebooks: "\u5168\u90E8\u7B14\u8BB0\u672C\uFF08\u9AD8\u7EA7\uFF09",
    discoveryScopeUnavailable: "\u5F53\u524D\u73AF\u5883\u6682\u4E0D\u53EF\u7528\u6B64\u626B\u63CF\u8303\u56F4",
    discoveryScopeTreeHint: "\u626B\u63CF\u6240\u9009\u6839\u6587\u6863\u53CA\u5176\u4E0B\u7EA7\u6587\u6863\u9876\u5C42\u5757\uFF1B\u6536\u5F55\u65B9\u5F0F\u53EF\u9009\u5F15\u7528\u6216\u72EC\u7ACB\u526F\u672C\u3002",
    discoveryScopeSelectedNotebookHint: "\u626B\u63CF\u6240\u9009\u7B14\u8BB0\u672C\u7684\u6587\u6863\u9876\u5C42\u5757\uFF1B\u6536\u5F55\u65B9\u5F0F\u53EF\u9009\u5F15\u7528\u6216\u72EC\u7ACB\u526F\u672C\u3002",
    discoveryScopeLockedForUndo: "\u5F53\u524D\u4ECD\u6709\u53EF\u64A4\u9500\u7684\u6536\u5F55\u6279\u6B21\uFF1B\u8BF7\u5148\u64A4\u9500\u6216\u5173\u95ED\u672C\u7A97\u53E3\uFF0C\u518D\u66F4\u6362\u626B\u63CF\u8303\u56F4\u3002",
    discoverySelectTree: "\u8F93\u5165\u5173\u952E\u8BCD\u67E5\u627E\u6587\u6863\u6811\u6839\u6587\u6863",
    discoverySelectTreeRoot: "\u8BF7\u9009\u62E9\u6587\u6863\u6811\u6839\u6587\u6863",
    discoveryNoDocsFound: "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u6587\u6863",
    discoveryNoNotebooks: "\u5F53\u524D\u6CA1\u6709\u53EF\u626B\u63CF\u7684\u7B14\u8BB0\u672C",
    discoverySelectNotebook: "\u9009\u62E9\u8981\u626B\u63CF\u7684\u7B14\u8BB0\u672C",
    discoverySearch: "\u641C\u7D22",
    discoverySearchingDocs: "\u6B63\u5728\u641C\u7D22\u6587\u6863\u2026",
    discoveryNotebookLoading: "\u6B63\u5728\u8BFB\u53D6\u7B14\u8BB0\u672C\u5217\u8868\u2026",
    discoveryRetryNotebooks: "\u91CD\u8BD5\u52A0\u8F7D\u7B14\u8BB0\u672C",
    discoveryAllWarning: "\u4E0A\u9650\uFF1A%s \u4E2A\u7B14\u8BB0\u672C\u3001%s \u7BC7\u6587\u6863\u3001%s \u5C42\u76EE\u5F55\u3001%s \u4E2A\u5757\u3001%s \u4E2A\u5019\u9009\u3001\u5355\u5757 %s \u5B57\u7B26\u3001\u5019\u9009\u6587\u672C\u7D2F\u8BA1 %s \u5B57\u7B26\u3001%s \u79D2\u3002\u6587\u6863\u548C\u5757\u6309\u987A\u5E8F\u8BFB\u53D6\uFF1B\u8DEF\u5F84\u67E5\u8BE2\u4E0E\u91CD\u590D\u6838\u9A8C\u6700\u591A 4 \u8DEF\u5E76\u53D1\u3002\u53EA\u8BFB\u626B\u63CF\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u6536\u5F55\u3002",
    discoveryConfirmAll: "\u6211\u786E\u8BA4\u5F00\u59CB\u626B\u63CF\u6240\u6709\u53EF\u641C\u7D22\u7B14\u8BB0\u672C",
    discoveryTargetRequired: "\u8BF7\u5148\u9009\u62E9\u6216\u786E\u8BA4\u626B\u63CF\u76EE\u6807",
    discoverySearchFailed: "\u6587\u6863\u641C\u7D22\u5931\u8D25\uFF1A%s",
    discoveryNotebookLoadFailed: "\u7B14\u8BB0\u672C\u5217\u8868\u52A0\u8F7D\u5931\u8D25\uFF1A%s",
    discoveryErrors: "\u626B\u63CF\u6216\u5185\u5BB9\u5E93\u91CD\u590D\u6838\u9A8C\u5931\u8D25 %s \u5904\uFF0C\u5DF2\u4FDD\u7559\u5176\u4ED6\u7ED3\u679C",
    discoverySkippedLong: "\u8DF3\u8FC7\u8D85\u957F\u5757 %s \u4E2A",
    discoveryLimitScope: "\u8303\u56F4/\u6DF1\u5EA6\u4E0A\u9650",
    discoveryLimitNotebooks: "\u7B14\u8BB0\u672C\u6570\u4E0A\u9650",
    discoveryLimitDocuments: "\u6587\u6863\u6570\u4E0A\u9650",
    discoveryLimitBlocks: "\u5757\u6570\u4E0A\u9650",
    discoveryLimitCandidates: "\u5019\u9009\u6570\u4E0A\u9650",
    discoveryLimitCharacters: "\u6587\u672C\u5B57\u7B26\u4E0A\u9650",
    discoveryLimitTime: "\u626B\u63CF\u65F6\u95F4\u4E0A\u9650",
    discoveryResultsPage: "\u7B2C %s / %s \u9875",
    discoveryPreviousPage: "\u4E0A\u4E00\u9875",
    discoveryNextPage: "\u4E0B\u4E00\u9875",
    discoveryAddAll: "\u52A0\u5165\u672C\u9875\u9009\u4E2D\u9879",
    discoveryDefaultCategory: "\u9ED8\u8BA4\u5206\u7C7B",
    discoveryUnsortedCategory: "\u5F85\u6574\u7406",
    discoveryDefaultCategoryHint: "\u65B0\u6536\u5F55\u9879\u9ED8\u8BA4\u4F7F\u7528\u6B64\u5206\u7C7B\uFF1B\u9884\u89C8\u4E2D\u53EF\u5355\u72EC\u4FEE\u6539\u5F53\u524D\u6761\u76EE\u3002",
    discoveryCandidateCategory: "\u672C\u6761\u5206\u7C7B",
    discoveryUseDefaultCategory: "\u6062\u590D\u9ED8\u8BA4",
    discoveryRescanKeepsUndo: "\u8BF7\u5148\u64A4\u9500\u6216\u5173\u95ED\u672C\u6279\u6B21\uFF0C\u518D\u91CD\u65B0\u626B\u63CF\u3002",
    discoveryCloseKeepsUndo: "\u672C\u6B21\u53D1\u73B0\u4ECD\u6709\u53EF\u64A4\u9500\u7684\u6536\u5F55\u6279\u6B21\u3002\u5173\u95ED\u4F1A\u4E22\u5931\u64A4\u9500\u5165\u53E3\uFF1B\u4ECD\u8981\u5173\u95ED\u5417\uFF1F",
    discoveryCloseTitle: "\u5173\u95ED\u53D1\u73B0\u7A97\u53E3",
    discoveryCloseKeepsItems: "\u5DF2\u52A0\u5165\u7684\u5E38\u7528\u5185\u5BB9\u4F1A\u4FDD\u7559\uFF1B\u5173\u95ED\u4E0D\u4F1A\u64A4\u9500\u65B0\u589E\u5185\u5BB9\u3002",
    discoveryCloseCancel: "\u8FD4\u56DE\u5E76\u4FDD\u7559\u64A4\u9500",
    discoveryCloseConfirm: "\u4ECD\u7136\u5173\u95ED",
    discoveryTitleSavedNotebook: "\u4ECE\u5DF2\u4FDD\u5B58\u7B14\u8BB0\u672C\u53D1\u73B0",
    discoveryScopeSavedNotebook: "\u5DF2\u4FDD\u5B58\u7B14\u8BB0\u672C",
    discoveryScopeHintSavedNotebook: "\u626B\u63CF\u89C6\u56FE\u4FDD\u5B58\u65F6\u7684\u7B14\u8BB0\u672C\uFF1B\u5165\u53E3\u6587\u6863\u79FB\u52A8\u4E0D\u4F1A\u66F4\u6362\u626B\u63CF\u76EE\u6807\uFF0C\u6E90\u6587\u6863\u4E0D\u4F1A\u88AB\u4FEE\u6539\u3002",
    discoveryScopeHintDocument: "\u53EA\u8BFB\u53D6\u5F53\u524D\u6587\u6863\u7684\u9876\u5C42\u5757\uFF1B\u6536\u5F55\u524D\u53EF\u9884\u89C8\uFF0C\u539F\u6587\u4E0D\u4F1A\u88AB\u4FEE\u6539\u3002",
    discoveryScopeHintNotebook: "\u626B\u63CF\u5F53\u524D\u6587\u6863\u6240\u5C5E\u7B14\u8BB0\u672C\u7684\u9876\u5C42\u5757\uFF1B\u5019\u9009\u4F1A\u663E\u793A\u5404\u81EA\u6765\u6E90\uFF0C\u6536\u5F55\u65B9\u5F0F\u53EF\u9009\u5F15\u7528\u6216\u72EC\u7ACB\u526F\u672C\u3002",
    discoveryNotebookUnavailable: "\u5F53\u524D\u7248\u672C\u6682\u4E0D\u652F\u6301\u7B14\u8BB0\u672C\u8303\u56F4\u53D1\u73B0",
    discoveryScanningDocument: "\u6B63\u5728\u626B\u63CF\u5F53\u524D\u6587\u6863\u2026",
    discoveryScanningNotebook: "\u6B63\u5728\u626B\u63CF\u5F53\u524D\u7B14\u8BB0\u672C\u2026",
    discoveryScanningTree: "\u6B63\u5728\u626B\u63CF\u6240\u9009\u6587\u6863\u6811\u2026",
    discoveryScanningSelectedNotebook: "\u6B63\u5728\u626B\u63CF\u6240\u9009\u7B14\u8BB0\u672C\u2026",
    discoveryScanningAllNotebooks: "\u6B63\u5728\u626B\u63CF\u5168\u90E8\u7B14\u8BB0\u672C\u2026",
    discoveryNotebookEnumerating: "\u6B63\u5728\u67E5\u627E\u6587\u6863\uFF0C\u5DF2\u53D1\u73B0 %s \u4E2A\u2026",
    discoveryNotebookProgress: "\u626B\u63CF\u6587\u6863 %s / %s\uFF0C\u5DF2\u8BFB\u53D6 %s \u4E2A\u5757\u2026",
    discoveryScannedNotebooks: "\u81F3\u5C11\u6709\u4E00\u6B21\u76EE\u5F55\u8BFB\u53D6\u6210\u529F\u7684\u7B14\u8BB0\u672C %s \u4E2A",
    discoveryCancelPending: "\u5DF2\u8BF7\u6C42\u505C\u6B62\uFF1B\u5F53\u524D\u5DF2\u53D1\u51FA\u7684\u5185\u6838\u8BF7\u6C42\u7ED3\u675F\u540E\u4E0D\u518D\u542F\u52A8\u540E\u7EED\u8BF7\u6C42\uFF0C\u5E76\u4FDD\u7559\u5DF2\u5B8C\u6210\u90E8\u5206\u4F9B\u4F60\u9009\u62E9\u6536\u5F55\u3002",
    discoveryStopping: "\u6B63\u5728\u7B49\u5F85\u5F53\u524D\u8BF7\u6C42\u7ED3\u675F\u2026",
    discoveryStopped: "\u5DF2\u505C\u6B62\u626B\u63CF\uFF0C\u4FDD\u7559 %s \u6761\u5019\u9009\uFF1B\u6CA1\u6709\u81EA\u52A8\u6536\u5F55\uFF0C\u5F85\u786E\u8BA4\u91CD\u590D\u72B6\u6001\u7684\u5019\u9009\u4F1A\u5728\u6536\u5F55\u524D\u590D\u67E5\u3002",
    discoveryStoppedNoResults: "\u5DF2\u505C\u6B62\u3002\u4E13\u7528\u5E93\u8FB9\u754C\u5C1A\u672A\u6838\u5B9E\uFF0C\u56E0\u6B64\u6CA1\u6709\u7EE7\u7EED\u626B\u63CF\u6216\u4FDD\u7559\u5019\u9009\uFF1B\u53EF\u4EE5\u91CD\u65B0\u5F00\u59CB\u3002",
    discoveryUndoBatch: "\u64A4\u9500\u672C\u6279\u65B0\u589E",
    discoveryUndoing: "\u6B63\u5728\u5B89\u5168\u68C0\u67E5\u5E76\u64A4\u9500\u2026",
    discoveryUndoReceiptTitle: "\u64A4\u9500\u56DE\u6267",
    discoveryUndoDone: "\u5DF2\u64A4\u9500\u65B0\u589E %s \u6761\uFF1B\u5DF2\u8DF3\u8FC7 %s \u6761\uFF0C\u5931\u8D25 %s \u6761\u3002\u91CD\u65B0\u626B\u63CF\u53EF\u5237\u65B0\u5019\u9009\u72B6\u6001\u3002",
    discoveryUndoAlreadyDone: "\u8FD9\u6279\u65B0\u589E\u5DF2\u64A4\u9500\u3002\u91CD\u65B0\u626B\u63CF\u53EF\u5237\u65B0\u5019\u9009\u72B6\u6001\u3002",
    discoveryUndoSkipNotFound: "\u6761\u76EE\u5DF2\u5220\u9664",
    discoveryUndoSkipIdentityChanged: "\u6761\u76EE\u8EAB\u4EFD\u6216\u5185\u5BB9\u5E93\u8303\u56F4\u5DF2\u53D8\u5316",
    discoveryUndoSkipEdited: "\u6761\u76EE\u5DF2\u88AB\u7F16\u8F91",
    discoveryUndoSkipLibraryUnverified: "\u5185\u5BB9\u5E93\u7D22\u5F15\u4E0D\u5B8C\u6574\uFF0C\u65E0\u6CD5\u5B89\u5168\u6838\u5BF9",
    discoveryUndoDeleteFailed: "\u5220\u9664\u5931\u8D25\uFF1A%s",
    discoveryScanning: "\u6B63\u5728\u626B\u63CF\u5F53\u524D\u6587\u6863\u2026",
    discoveryScanned: "\u5DF2\u626B\u63CF %s \u4E2A\u5757\uFF0C\u53D1\u73B0 %s \u4E2A\u5019\u9009",
    discoverySkipped: "\u8DF3\u8FC7\u7A7A\u5757 %s \u4E2A",
    discoveryTruncated: "\u5DF2\u8FBE\u5230\u626B\u63CF\u4E0A\u9650\uFF0C\u7ED3\u679C\u53EF\u80FD\u4E0D\u5B8C\u6574",
    discoveryCancelScan: "\u505C\u6B62\u626B\u63CF",
    discoveryRetry: "\u91CD\u65B0\u626B\u63CF",
    discoveryFilter: "\u7B5B\u9009",
    discoveryFilterAll: "\u5168\u90E8\u72B6\u6001",
    discoveryFilterCandidate: "\u5F85\u6536\u5F55",
    discoveryFilterUnverified: "\u5F85\u786E\u8BA4\u91CD\u590D",
    discoveryFilterSameContent: "\u5185\u5BB9\u76F8\u540C",
    discoveryFilterAlready: "\u5DF2\u5728\u5E93\u4E2D",
    discoveryFilterAdded: "\u5DF2\u6536\u5F55",
    discoveryTypeAll: "\u5168\u90E8\u7C7B\u578B",
    discoverySearchPlaceholder: "\u7B5B\u9009\u6807\u9898\u3001\u6458\u8981\u6216\u6765\u6E90",
    discoveryNoCandidates: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u5019\u9009",
    discoveryEmptyScope: "\u6B64\u8303\u56F4\u6CA1\u6709\u53D1\u73B0\u53EF\u6536\u5F55\u7684\u5019\u9009\u3002",
    discoveryScanningCandidates: "\u6B63\u5728\u626B\u63CF\uFF0C\u5019\u9009\u5B8C\u6210\u540E\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002",
    discoveryAwaitingScan: "\u9009\u62E9\u626B\u63CF\u8303\u56F4\u548C\u76EE\u6807\u540E\uFF0C\u5F00\u59CB\u626B\u63CF\u5373\u53EF\u67E5\u770B\u5019\u9009\u3002",
    discoveryScanIncompleteEmpty: "\u626B\u63CF\u672A\u5B8C\u6210\uFF0C\u5F53\u524D\u6CA1\u6709\u5019\u9009\u7ED3\u679C\uFF1B\u53EF\u4EE5\u91CD\u8BD5\u3002",
    discoveryScanStoppedEmpty: "\u626B\u63CF\u5DF2\u505C\u6B62\uFF0C\u5C1A\u672A\u4FDD\u7559\u5019\u9009\uFF1B\u53EF\u4EE5\u91CD\u65B0\u626B\u63CF\u3002",
    discoveryClearFilters: "\u6E05\u9664\u7B5B\u9009",
    discoveryPreviewTitle: "\u5019\u9009\u9884\u89C8",
    discoveryPreviewEmpty: "\u9009\u62E9\u4E00\u6761\u5019\u9009\u540E\u67E5\u770B\u6B63\u6587\uFF1B\u6536\u5F55\u524D\u4F1A\u518D\u6B21\u6821\u9A8C\u6765\u6E90\u3002",
    discoveryPreviewLoading: "\u6B63\u5728\u8BFB\u53D6\u5019\u9009\u6B63\u6587\u2026",
    discoveryPreviewRetry: "\u91CD\u65B0\u8BFB\u53D6\u9884\u89C8",
    discoveryPreviewUnavailable: "\u5019\u9009\u9884\u89C8\u672A\u80FD\u8BFB\u53D6\uFF0C\u8BF7\u91CD\u8BD5\uFF1B\u539F\u7B14\u8BB0\u672A\u4FEE\u6539\u3002",
    discoverySourceChanged: "\u6765\u6E90\u5185\u5BB9\u6216\u6240\u5728\u8303\u56F4\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u9884\u89C8\u540E\u518D\u6536\u5F55\uFF1B\u5FC5\u8981\u65F6\u91CD\u65B0\u626B\u63CF\u3002",
    discoverySourceUnavailable: "\u6765\u6E90\u6216\u626B\u63CF\u76EE\u6807\u5DF2\u4E0D\u53EF\u7528\uFF0C\u8BF7\u68C0\u67E5\u539F\u7B14\u8BB0\u540E\u91CD\u65B0\u626B\u63CF\u3002",
    discoveryContentTooLong: "\u6765\u6E90\u6B63\u6587\u8D85\u8FC7\u5355\u6761\u5185\u5BB9\u4E0A\u9650\uFF0C\u8BF7\u7F29\u77ED\u5185\u5BB9\u540E\u91CD\u65B0\u8BFB\u53D6\u9884\u89C8\u3002",
    discoveryLibraryCheckIncomplete: "\u5185\u5BB9\u5E93\u91CD\u590D\u6838\u9A8C\u672A\u5B8C\u6210\uFF0C\u8BF7\u68C0\u67E5\u5185\u5BB9\u5E93\u72B6\u6001\u540E\u91CD\u8BD5\u3002",
    discoveryOperationConflict: "\u5F53\u524D\u64CD\u4F5C\u72B6\u6001\u53D1\u751F\u53D8\u5316\uFF0C\u8BF7\u7B49\u5F85\u6B63\u5728\u8FDB\u884C\u7684\u64CD\u4F5C\u7ED3\u675F\u540E\u91CD\u8BD5\u3002",
    discoveryInvalidInput: "\u626B\u63CF\u76EE\u6807\u6216\u5019\u9009\u72B6\u6001\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u76EE\u6807\u6216\u91CD\u65B0\u626B\u63CF\u3002",
    discoveryKernelError: "\u601D\u6E90\u8BF7\u6C42\u672A\u5B8C\u6210\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5\u540E\u91CD\u8BD5\u3002",
    discoveryUndoAvailable: "\u672C\u6B21\u6536\u5F55\u4ECD\u53EF\u64A4\u9500\uFF1B\u5173\u95ED\u7A97\u53E3\u540E\u5C06\u5931\u53BB\u8FD9\u91CC\u7684\u64A4\u9500\u5165\u53E3\u3002",
    discoveryAddingSingle: "\u6B63\u5728\u6821\u9A8C\u6765\u6E90\u5E76\u52A0\u5165\u5E38\u7528\u5E93\u2026",
    discoveryAddingBatch: "\u6B63\u5728\u6536\u5F55\u9009\u4E2D\u9879\uFF1A%s / %s",
    discoveryAdd: "\u52A0\u5165\u5E38\u7528\u5E93",
    discoveryAddSelected: "\u52A0\u5165\u9009\u4E2D\u9879",
    discoverySyncView: "\u540C\u6B65\u5230\u5E38\u7528\u5E93",
    discoverySelectFiltered: "\u9009\u4E2D\u5F53\u524D\u7B5B\u9009\uFF08%s\uFF09",
    discoveryClearFilteredSelection: "\u6E05\u9664\u5F53\u524D\u7B5B\u9009\u9009\u62E9",
    discoveryForceSameContent: "\u6279\u91CF\u5141\u8BB8\u6536\u5F55\u5185\u5BB9\u76F8\u540C\u7684\u5019\u9009",
    discoverySelected: "\u5DF2\u9009 %s \u9879",
    discoveryClose: "\u5173\u95ED",
    discoveryClosePendingWrites: "\u6709\u6536\u5F55\u6B63\u5728\u5199\u5165\u5185\u5BB9\u5E93\u3002\u8BF7\u7B49\u5F85\u6536\u5F55\u56DE\u6267\uFF0C\u5FC5\u8981\u65F6\u5148\u64A4\u9500\u672C\u6279\u65B0\u589E\uFF0C\u518D\u5173\u95ED\u6B64\u7A97\u53E3\u3002",
    discoveryReceiptTitle: "\u6536\u5F55\u56DE\u6267",
    discoveryReceiptAdded: "\u5DF2\u52A0\u5165\u5E38\u7528\u5E93\uFF1A%s\uFF1B\u539F\u7B14\u8BB0\u672A\u4FEE\u6539\u3002",
    discoveryReceiptSameContent: "\u5185\u5BB9\u4E0E\u300C%s\u300D\u76F8\u540C\uFF0C\u672A\u81EA\u52A8\u6536\u5F55\uFF1B\u5982\u4ECD\u8981\u6536\u5F55\uFF0C\u8BF7\u660E\u786E\u786E\u8BA4\u3002",
    discoveryReceiptAlready: "\u5DF2\u5728\u5E38\u7528\u5E93\u4E2D\uFF1A%s",
    discoveryReceiptFailed: "\u6536\u5F55\u5931\u8D25\uFF1A%s",
    discoveryReceiptBatch: "\u6279\u91CF\u6536\u5F55\u5B8C\u6210\uFF1A\u65B0\u589E %s\uFF0C\u8DF3\u8FC7 %s\uFF0C\u5931\u8D25 %s",
    discoverySessionExpired: "\u53D1\u73B0\u4F1A\u8BDD\u5DF2\u5931\u6548\uFF0C\u5019\u9009\u6B63\u6587\u5DF2\u91CA\u653E\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF\u3002",
    discoveryScanFailed: "\u626B\u63CF\u5931\u8D25\uFF1A%s",
    discoveryUnknown: "\u672A\u77E5\u9519\u8BEF",
    discoveryStatusCandidate: "\u5F85\u6536\u5F55",
    discoveryStatusAlready: "\u5DF2\u5728\u5E93\u4E2D",
    discoveryStatusSameContent: "\u5185\u5BB9\u76F8\u540C",
    discoveryStatusUnverified: "\u91CD\u590D\u5F85\u786E\u8BA4",
    discoveryStatusAdded: "\u5DF2\u6536\u5F55",
    discoveryType: "\u7C7B\u578B",
    discoverySource: "\u6765\u6E90",
    discoveryStats: "\u7EDF\u8BA1",
    discoveryNotConfigured: "\u5C1A\u672A\u914D\u7F6E\u5E38\u7528\u5185\u5BB9\u5E93\uFF0C\u65E0\u6CD5\u6536\u5F55\u5019\u9009\u3002"
  };
  var STATUS_KEYS = [
    "all",
    "candidate",
    "library-unverified",
    "same-content",
    "already-in-library",
    "added"
  ];
  var typeLabel = (t, itemType) => {
    const value = t(`type.${itemType}`);
    return value && value !== `type.${itemType}` ? value : itemType;
  };
  function replaceArgs(value, args) {
    let index = 0;
    return value.replace(/%s/g, () => {
      var _a;
      return (_a = args[index++]) != null ? _a : "";
    });
  }
  var DiscoveryDialog = class {
    constructor(deps, options) {
      this.deps = deps;
      this.options = options;
      this.dialog = null;
      this.saveViewDialog = null;
      this.closeConfirmationDialog = null;
      this.root = null;
      this.list = null;
      this.preview = null;
      this.status = null;
      this.receipt = null;
      this.closeButton = null;
      this.addSelectedButton = null;
      this.selectedLabel = null;
      this.scanButton = null;
      this.scopeSelect = null;
      this.scopeHint = null;
      this.scopeTarget = null;
      this.targetDocId = "";
      this.initialTreeRootId = "";
      this.targetNotebookId = "";
      this.allConfirmed = false;
      this.scopeLoadSeq = 0;
      this.page = 0;
      this.pageSize = 100;
      this.undoableBatchIds = /* @__PURE__ */ new Set();
      this.filterStatus = null;
      this.filterType = null;
      this.filterText = null;
      this.filterTag = null;
      this.tagFacets = null;
      this.saveViewButton = null;
      this.selectFilteredButton = null;
      this.addMode = null;
      this.forceSameContent = null;
      this.defaultCategoryInput = null;
      this.candidateCategoryInput = null;
      this.resetCategoryButton = null;
      this.session = null;
      this.sessionId = null;
      this.candidates = /* @__PURE__ */ new Map();
      this.selected = /* @__PURE__ */ new Set();
      this.previewed = /* @__PURE__ */ new Set();
      this.categoryOverrides = /* @__PURE__ */ new Map();
      this.activeKey = null;
      this.scanSeq = 0;
      this.previewSeq = 0;
      this.actionBusy = false;
      this.closed = false;
      this.cancelRequested = false;
      this.scanState = "idle";
      this.filter = {
        status: "all",
        type: "all",
        text: "",
        tag: ""
      };
      this.scope = options.scope === "tree" && deps.service.discoverTree && deps.searchDocs ? "tree" : options.scope === "notebook" && (options.initialNotebookId !== void 0 || deps.service.discoverCurrentNotebook) ? "notebook" : "document";
      if (this.scope === "tree" && options.initialTreeRootId) {
        this.targetDocId = options.initialTreeRootId;
        this.initialTreeRootId = options.initialTreeRootId;
      }
      if (typeof options.initialTag === "string") {
        this.filter.tag = options.initialTag.trim().slice(0, 64).toLocaleLowerCase();
      }
    }
    titleKey() {
      return this.scope === "notebook" ? this.options.initialNotebookId !== void 0 ? "discoveryTitleSavedNotebook" : "discoveryTitleNotebook" : this.scope === "tree" ? "discoveryTitleTree" : this.scope === "document" ? "discoveryTitle" : "discoveryTitleGeneral";
    }
    tx(key, ...args) {
      var _a;
      const result = this.deps.t(key, ...args);
      const value = result && result !== key ? result : (_a = FALLBACKS[key]) != null ? _a : key;
      return replaceArgs(value, args);
    }
    open() {
      var _a, _b;
      if (this.dialog) return;
      this.closed = false;
      const dialog = new import_siyuan5.Dialog({
        title: (_a = this.options.title) != null ? _a : this.tx(this.titleKey()),
        content: "",
        width: "min(1040px, 94vw)",
        height: "min(840px, 92vh)",
        disableClose: true,
        destroyCallback: () => {
          var _a2, _b2, _c, _d, _e, _f, _g;
          if (this.closed) return;
          this.closed = true;
          (_a2 = this.saveViewDialog) == null ? void 0 : _a2.destroy();
          this.saveViewDialog = null;
          (_b2 = this.closeConfirmationDialog) == null ? void 0 : _b2.destroy();
          this.closeConfirmationDialog = null;
          const closed = this.deps.service.closeSession((_c = this.sessionId) != null ? _c : void 0);
          if (!closed.ok) {
            (_e = (_d = this.deps).notify) == null ? void 0 : _e.call(_d, "error", closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : this.failureMessage(closed));
          }
          this.session = null;
          this.sessionId = null;
          this.dialog = null;
          this.root = null;
          (_g = (_f = this.deps).notify) == null ? void 0 : _g.call(_f, "info", this.tx("discoveryClose"));
        }
      });
      this.dialog = dialog;
      (_b = dialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _b.classList.add("xlc-form-host", "xlc-discovery-host");
      const body = getDialogBody(dialog.element);
      if (!body) return;
      body.innerHTML = "";
      this.root = document.createElement("div");
      this.root.className = "xlc-form xlc-discovery";
      this.root.dataset.xlcDiscovery = "dialog";
      body.appendChild(this.root);
      this.renderShell();
      void this.scan();
    }
    close(force = false, onClosed) {
      if (!this.dialog) {
        onClosed == null ? void 0 : onClosed();
        return true;
      }
      if (!force && this.closeConfirmationDialog) return false;
      if (!force && this.undoableBatchIds.size && !this.actionBusy) {
        this.openCloseConfirmation(onClosed);
        return false;
      }
      const closed = this.finishClose(force);
      if (closed) onClosed == null ? void 0 : onClosed();
      return closed;
    }
    finishClose(force = false, onRejected) {
      var _a, _b, _c, _d, _e;
      if (!this.dialog) return true;
      if (!force) {
        if (this.actionBusy) {
          const message = this.tx("discoveryClosePendingWrites");
          this.setReceipt(message, true, Array.from(this.undoableBatchIds));
          onRejected == null ? void 0 : onRejected(message);
          return false;
        }
        const closed = this.deps.service.closeSession((_a = this.sessionId) != null ? _a : void 0);
        if (!closed.ok) {
          const message = closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : this.failureMessage(closed);
          this.setReceipt(message, true, Array.from(this.undoableBatchIds));
          (_c = (_b = this.deps).notify) == null ? void 0 : _c.call(_b, "error", message);
          onRejected == null ? void 0 : onRejected(message);
          return false;
        }
      }
      this.closed = true;
      (_d = this.saveViewDialog) == null ? void 0 : _d.destroy();
      this.saveViewDialog = null;
      (_e = this.closeConfirmationDialog) == null ? void 0 : _e.destroy();
      this.closeConfirmationDialog = null;
      this.scanSeq++;
      this.previewSeq++;
      this.session = null;
      this.sessionId = null;
      const dialog = this.dialog;
      this.dialog = null;
      dialog.destroy();
      return true;
    }
    openCloseConfirmation(onClosed) {
      var _a;
      if (this.closeConfirmationDialog || this.closed) return;
      const dialog = new import_siyuan5.Dialog({
        title: this.tx("discoveryCloseTitle"),
        content: "",
        width: "min(440px, 92vw)",
        disableClose: true,
        destroyCallback: () => {
          var _a2;
          if (this.closeConfirmationDialog === dialog) this.closeConfirmationDialog = null;
          if (!this.closed) (_a2 = this.closeButton) == null ? void 0 : _a2.focus();
        }
      });
      this.closeConfirmationDialog = dialog;
      (_a = dialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _a.classList.add("xlc-form-host");
      const body = getDialogBody(dialog.element);
      if (!body) {
        dialog.destroy();
        this.setReceipt(this.tx("discoveryCloseKeepsUndo"), true, Array.from(this.undoableBatchIds));
        return;
      }
      const form = document.createElement("form");
      form.className = "xlc-form xlc-discovery-close-form";
      const warning = document.createElement("p");
      warning.className = "xlc-form-hint";
      warning.textContent = `${this.tx("discoveryCloseKeepsUndo")} ${this.tx("discoveryCloseKeepsItems")}`;
      const error = document.createElement("div");
      error.className = "xlc-form-error";
      error.setAttribute("role", "alert");
      const actions = document.createElement("div");
      actions.className = "xlc-form-actions";
      let settled = false;
      const cancelClose = () => {
        settled = true;
        dialog.destroy();
      };
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "b3-button b3-button--cancel";
      cancel.dataset.xlcControl = "discovery.close.cancel";
      cancel.textContent = this.tx("discoveryCloseCancel");
      cancel.addEventListener("click", cancelClose);
      const confirm3 = document.createElement("button");
      confirm3.type = "submit";
      confirm3.className = "b3-button b3-button--text";
      confirm3.dataset.xlcControl = "discovery.close.confirm";
      confirm3.textContent = this.tx("discoveryCloseConfirm");
      actions.append(cancel, confirm3);
      form.append(warning, error, actions);
      body.appendChild(form);
      form.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !event.isComposing && event.keyCode !== 229) {
          event.preventDefault();
          cancelClose();
        }
        if (event.key === "Enter" && (event.isComposing || event.keyCode === 229)) event.preventDefault();
        event.stopPropagation();
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (settled || this.closed || this.closeConfirmationDialog !== dialog) return;
        if (!this.finishClose(false, (message) => {
          error.textContent = message;
        })) return;
        settled = true;
        onClosed == null ? void 0 : onClosed();
      });
      requestAnimationFrame(() => {
        if (!settled && !this.closed && this.closeConfirmationDialog === dialog) cancel.focus();
      });
    }
    renderShell() {
      var _a, _b, _c;
      const root = this.root;
      if (!root) return;
      const head = document.createElement("div");
      head.className = "xlc-discovery-head";
      const heading = document.createElement("div");
      heading.className = "xlc-discovery-heading";
      const title = document.createElement("h2");
      title.className = "xlc-form-title";
      title.textContent = this.tx(this.titleKey());
      heading.appendChild(title);
      const scopeRow = document.createElement("div");
      scopeRow.className = "xlc-discovery-scope-row";
      const scopeLabel = document.createElement("label");
      scopeLabel.className = "xlc-form-hint";
      scopeLabel.textContent = `${this.tx("discoveryScope")}\uFF1A`;
      this.scopeSelect = document.createElement("select");
      this.scopeSelect.className = "b3-select xlc-discovery-scope-select";
      this.scopeSelect.dataset.xlcControl = "discovery.scope";
      this.scopeSelect.setAttribute("aria-label", this.tx("discoveryScope"));
      const documentOption = document.createElement("option");
      documentOption.value = "document";
      documentOption.textContent = this.tx("discoveryScopeDocument");
      this.scopeSelect.appendChild(documentOption);
      const notebookOption = document.createElement("option");
      notebookOption.value = "notebook";
      notebookOption.textContent = this.tx(this.options.initialNotebookId !== void 0 ? "discoveryScopeSavedNotebook" : "discoveryScopeNotebook");
      notebookOption.disabled = this.options.initialNotebookId !== void 0 ? !this.deps.service.discoverNotebook : !this.deps.service.discoverCurrentNotebook;
      if (notebookOption.disabled) notebookOption.title = this.tx("discoveryNotebookUnavailable");
      this.scopeSelect.appendChild(notebookOption);
      for (const [value, key, enabled] of [
        ["tree", "discoveryScopeTree", !!this.deps.service.discoverTree && !!this.deps.searchDocs],
        ["selected-notebook", "discoveryScopeSelectedNotebook", !!this.deps.service.discoverNotebook && !!this.deps.listNotebooks],
        ["all-notebooks", "discoveryScopeAllNotebooks", !!this.deps.service.discoverAllNotebooks]
      ]) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = this.tx(key);
        option.disabled = !enabled;
        if (!enabled) option.title = this.tx("discoveryScopeUnavailable");
        this.scopeSelect.appendChild(option);
      }
      this.scopeSelect.value = this.scope;
      this.scopeSelect.addEventListener("change", () => {
        var _a2, _b2, _c2;
        const nextScope = (_a2 = this.scopeSelect) == null ? void 0 : _a2.value;
        if (nextScope === this.scope) return;
        if (this.actionBusy || ((_b2 = this.root) == null ? void 0 : _b2.getAttribute("aria-busy")) === "true") {
          this.scopeSelect.value = this.scope;
          return;
        }
        if (this.undoableBatchIds.size) {
          this.scopeSelect.value = this.scope;
          this.setStatus(this.tx("discoveryRescanKeepsUndo"));
          return;
        }
        if (this.sessionId) {
          const closed = this.deps.service.closeSession(this.sessionId);
          if (!closed.ok) {
            this.scopeSelect.value = this.scope;
            const message = closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : this.failureMessage(closed);
            this.setReceipt(message, true);
            return;
          }
        }
        this.previewSeq++;
        this.session = null;
        this.sessionId = null;
        this.candidates.clear();
        this.selected.clear();
        this.previewed.clear();
        this.categoryOverrides.clear();
        this.activeKey = null;
        this.page = 0;
        this.scanState = "idle";
        this.scope = nextScope;
        title.textContent = this.tx(this.titleKey());
        (_c2 = this.list) == null ? void 0 : _c2.setAttribute("aria-label", this.tx(this.titleKey()));
        if (this.scopeHint) this.scopeHint.textContent = this.scopeHintText();
        this.targetDocId = "";
        this.targetNotebookId = "";
        this.allConfirmed = false;
        this.syncCandidateCategory();
        this.setReceipt("");
        if (this.preview) this.preview.textContent = this.tx("discoveryPreviewEmpty");
        this.renderList();
        this.renderScopeTarget();
        if (this.scope === "document" || this.scope === "notebook") void this.scan();
        else if (this.scope !== "selected-notebook") this.setStatus(this.tx("discoveryTargetRequired"));
        this.updateSelectionState();
      });
      scopeLabel.appendChild(this.scopeSelect);
      scopeRow.appendChild(scopeLabel);
      this.scopeTarget = document.createElement("div");
      this.scopeTarget.className = "xlc-discovery-scope-target";
      scopeRow.appendChild(this.scopeTarget);
      const sourcePath = document.createElement("span");
      sourcePath.className = "xlc-form-hint xlc-discovery-scope";
      sourcePath.textContent = `${this.tx("discoveryStartDocument")}\uFF1A${this.options.sourcePath || this.options.docId}`;
      scopeRow.appendChild(sourcePath);
      heading.appendChild(scopeRow);
      head.appendChild(heading);
      this.closeButton = document.createElement("button");
      this.closeButton.type = "button";
      this.closeButton.className = "b3-button xlc-btn-ghost";
      this.closeButton.textContent = this.tx("discoveryClose");
      this.closeButton.dataset.xlcDiscoveryAction = "close";
      this.closeButton.addEventListener("click", () => this.close());
      head.appendChild(this.closeButton);
      root.appendChild(head);
      const notice = document.createElement("div");
      notice.className = "xlc-discovery-notice xlc-form-hint";
      notice.setAttribute("role", "note");
      this.scopeHint = notice;
      notice.textContent = this.scopeHintText();
      root.appendChild(notice);
      this.renderScopeTarget();
      const statusRow = document.createElement("div");
      statusRow.className = "xlc-discovery-status-row";
      this.status = document.createElement("div");
      this.status.className = "xlc-status";
      this.status.setAttribute("role", "status");
      this.status.setAttribute("aria-live", "polite");
      statusRow.appendChild(this.status);
      this.scanButton = document.createElement("button");
      this.scanButton.type = "button";
      this.scanButton.className = "b3-button xlc-btn-ghost";
      this.scanButton.textContent = this.tx("discoveryCancelScan");
      this.scanButton.dataset.xlcDiscoveryAction = "cancel-scan";
      this.scanButton.addEventListener("click", () => {
        if (this.scanState === "scanning") this.cancelScan();
        else void this.scan();
      });
      statusRow.appendChild(this.scanButton);
      root.appendChild(statusRow);
      const filters = document.createElement("div");
      filters.className = "xlc-discovery-filters";
      const filterLabel = document.createElement("span");
      filterLabel.className = "xlc-form-label";
      filterLabel.textContent = this.tx("discoveryFilter");
      filters.appendChild(filterLabel);
      this.filterStatus = document.createElement("select");
      this.filterStatus.className = "b3-select";
      this.filterStatus.dataset.xlcControl = "discovery.filter.status";
      this.filterStatus.setAttribute("aria-label", this.tx("discoveryFilter"));
      for (const status of STATUS_KEYS) {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status === "all" ? this.tx("discoveryFilterAll") : this.statusLabel(status);
        this.filterStatus.appendChild(option);
      }
      this.filterStatus.addEventListener("change", () => {
        var _a2;
        this.filter.status = (_a2 = this.filterStatus) == null ? void 0 : _a2.value;
        this.page = 0;
        this.renderList();
      });
      filters.appendChild(this.filterStatus);
      this.filterType = document.createElement("select");
      this.filterType.className = "b3-select";
      this.filterType.dataset.xlcControl = "discovery.filter.type";
      this.filterType.setAttribute("aria-label", this.tx("discoveryType"));
      const typeAll = document.createElement("option");
      typeAll.value = "all";
      typeAll.textContent = this.tx("discoveryTypeAll");
      this.filterType.appendChild(typeAll);
      for (const itemType of ITEM_TYPES) {
        const option = document.createElement("option");
        option.value = itemType;
        option.textContent = typeLabel(this.deps.t, itemType);
        this.filterType.appendChild(option);
      }
      this.filterType.addEventListener("change", () => {
        var _a2;
        this.filter.type = (_a2 = this.filterType) == null ? void 0 : _a2.value;
        this.page = 0;
        this.renderList();
      });
      filters.appendChild(this.filterType);
      this.filterText = document.createElement("input");
      this.filterText.className = "b3-text-field";
      this.filterText.dataset.xlcControl = "discovery.filter.text";
      this.filterText.placeholder = this.tx("discoverySearchPlaceholder");
      this.filterText.setAttribute("aria-label", this.tx("discoverySearchPlaceholder"));
      this.filterText.addEventListener("input", () => {
        var _a2, _b2;
        this.filter.text = (_b2 = (_a2 = this.filterText) == null ? void 0 : _a2.value.trim().toLocaleLowerCase()) != null ? _b2 : "";
        this.page = 0;
        this.renderList();
      });
      filters.appendChild(this.filterText);
      this.filterTag = document.createElement("input");
      this.filterTag.className = "b3-text-field";
      this.filterTag.dataset.xlcControl = "discovery.filter.tag";
      this.filterTag.placeholder = this.tx("discoveryTagFilterPlaceholder");
      this.filterTag.setAttribute("aria-label", this.tx("discoveryTagFilterPlaceholder"));
      this.filterTag.addEventListener("input", () => {
        var _a2, _b2;
        this.filter.tag = (_b2 = (_a2 = this.filterTag) == null ? void 0 : _a2.value.trim().toLocaleLowerCase()) != null ? _b2 : "";
        this.page = 0;
        this.renderList();
      });
      if (this.filter.tag) this.filterTag.value = (_b = (_a = this.options.initialTag) == null ? void 0 : _a.trim().slice(0, 64)) != null ? _b : "";
      filters.appendChild(this.filterTag);
      this.tagFacets = document.createElement("div");
      this.tagFacets.className = "xlc-discovery-tag-facets";
      this.tagFacets.setAttribute("role", "list");
      this.tagFacets.setAttribute("aria-label", this.tx("discoveryTagFacets"));
      filters.appendChild(this.tagFacets);
      if (this.deps.onSaveView) {
        this.saveViewButton = document.createElement("button");
        this.saveViewButton.type = "button";
        this.saveViewButton.className = "b3-button xlc-btn-ghost";
        this.saveViewButton.dataset.xlcDiscoveryAction = "save-view";
        this.saveViewButton.textContent = this.tx("discoverySaveView");
        this.saveViewButton.addEventListener("click", () => this.saveCurrentView());
        filters.appendChild(this.saveViewButton);
      }
      this.selectFilteredButton = document.createElement("button");
      this.selectFilteredButton.type = "button";
      this.selectFilteredButton.className = "b3-button xlc-btn-ghost";
      this.selectFilteredButton.dataset.xlcDiscoveryAction = "select-filtered";
      this.selectFilteredButton.setAttribute("aria-pressed", "false");
      this.selectFilteredButton.addEventListener("click", () => this.toggleFilteredSelection());
      filters.appendChild(this.selectFilteredButton);
      root.appendChild(filters);
      const modeRow = document.createElement("label");
      modeRow.className = "xlc-form-label xlc-discovery-mode-row";
      const modeLabel = document.createElement("span");
      modeLabel.textContent = this.tx("discoveryAddMode");
      modeRow.appendChild(modeLabel);
      this.addMode = document.createElement("select");
      this.addMode.className = "b3-select";
      this.addMode.dataset.xlcControl = "discovery.add-mode";
      const reference = document.createElement("option");
      reference.value = "reference";
      reference.textContent = this.tx("discoveryAddModeReference");
      const copy = document.createElement("option");
      copy.value = "copy";
      copy.textContent = this.tx("discoveryAddModeCopy");
      this.addMode.append(reference, copy);
      if (this.options.referenceOnly) {
        this.addMode.value = "reference";
        this.addMode.disabled = true;
      }
      modeRow.appendChild(this.addMode);
      const modeHint = document.createElement("span");
      modeHint.className = "xlc-form-hint";
      modeHint.textContent = this.tx("discoveryAddModeHint");
      modeRow.appendChild(modeHint);
      root.appendChild(modeRow);
      const categorySettings = document.createElement("div");
      categorySettings.className = "xlc-discovery-category-settings";
      const defaultCategoryLabel = document.createElement("label");
      defaultCategoryLabel.className = "xlc-form-label";
      defaultCategoryLabel.textContent = this.tx("discoveryDefaultCategory");
      defaultCategoryLabel.htmlFor = "xlc-discovery-default-category";
      this.defaultCategoryInput = document.createElement("input");
      this.defaultCategoryInput.type = "text";
      this.defaultCategoryInput.className = "b3-text-field";
      this.defaultCategoryInput.value = ((_c = this.options.defaultCategory) == null ? void 0 : _c.trim().slice(0, 64)) || this.tx("discoveryUnsortedCategory");
      this.defaultCategoryInput.maxLength = 64;
      this.defaultCategoryInput.id = "xlc-discovery-default-category";
      this.defaultCategoryInput.dataset.xlcDiscoveryAction = "default-category";
      this.defaultCategoryInput.setAttribute("aria-label", this.tx("discoveryDefaultCategory"));
      this.defaultCategoryInput.addEventListener("input", () => {
        var _a2, _b2;
        const key = this.activeKey;
        if (key && !this.categoryOverrides.has(key) && this.candidateCategoryInput) {
          this.candidateCategoryInput.value = (_b2 = (_a2 = this.defaultCategoryInput) == null ? void 0 : _a2.value) != null ? _b2 : "";
        }
      });
      categorySettings.appendChild(defaultCategoryLabel);
      categorySettings.appendChild(this.defaultCategoryInput);
      const defaultCategoryHint = document.createElement("span");
      defaultCategoryHint.className = "xlc-form-hint";
      defaultCategoryHint.textContent = this.tx("discoveryDefaultCategoryHint");
      categorySettings.appendChild(defaultCategoryHint);
      root.appendChild(categorySettings);
      const content = document.createElement("div");
      content.className = "xlc-discovery-content";
      this.list = document.createElement("div");
      this.list.className = "xlc-discovery-list";
      this.list.setAttribute("role", "region");
      this.list.setAttribute("aria-label", this.tx(this.titleKey()));
      content.appendChild(this.list);
      const pane = document.createElement("section");
      pane.className = "xlc-discovery-preview";
      const paneTitle = document.createElement("h3");
      paneTitle.textContent = this.tx("discoveryPreviewTitle");
      pane.appendChild(paneTitle);
      const candidateCategoryRow = document.createElement("div");
      candidateCategoryRow.className = "xlc-discovery-candidate-category";
      const candidateCategoryLabel = document.createElement("label");
      candidateCategoryLabel.className = "xlc-form-label";
      candidateCategoryLabel.textContent = this.tx("discoveryCandidateCategory");
      candidateCategoryLabel.htmlFor = "xlc-discovery-candidate-category";
      this.candidateCategoryInput = document.createElement("input");
      this.candidateCategoryInput.type = "text";
      this.candidateCategoryInput.className = "b3-text-field";
      this.candidateCategoryInput.disabled = true;
      this.candidateCategoryInput.maxLength = 64;
      this.candidateCategoryInput.id = "xlc-discovery-candidate-category";
      this.candidateCategoryInput.dataset.xlcDiscoveryAction = "candidate-category";
      this.candidateCategoryInput.setAttribute("aria-label", this.tx("discoveryCandidateCategory"));
      this.candidateCategoryInput.addEventListener("input", () => {
        var _a2, _b2;
        if (!this.activeKey) return;
        this.categoryOverrides.set(this.activeKey, (_b2 = (_a2 = this.candidateCategoryInput) == null ? void 0 : _a2.value) != null ? _b2 : "");
        this.updateCategoryResetState();
      });
      candidateCategoryRow.appendChild(candidateCategoryLabel);
      candidateCategoryRow.appendChild(this.candidateCategoryInput);
      this.resetCategoryButton = document.createElement("button");
      this.resetCategoryButton.type = "button";
      this.resetCategoryButton.className = "b3-button xlc-btn-ghost";
      this.resetCategoryButton.textContent = this.tx("discoveryUseDefaultCategory");
      this.resetCategoryButton.dataset.xlcDiscoveryAction = "category-reset";
      this.resetCategoryButton.disabled = true;
      this.resetCategoryButton.addEventListener("click", () => {
        if (!this.activeKey || this.actionBusy) return;
        this.categoryOverrides.delete(this.activeKey);
        this.syncCandidateCategory();
      });
      candidateCategoryRow.appendChild(this.resetCategoryButton);
      pane.appendChild(candidateCategoryRow);
      this.preview = document.createElement("pre");
      this.preview.className = "xlc-discovery-preview-body";
      this.preview.textContent = this.tx("discoveryPreviewEmpty");
      pane.appendChild(this.preview);
      content.appendChild(pane);
      root.appendChild(content);
      const footer = document.createElement("div");
      footer.className = "xlc-discovery-footer";
      this.selectedLabel = document.createElement("span");
      this.selectedLabel.className = "xlc-form-hint";
      footer.appendChild(this.selectedLabel);
      const forceLabel = document.createElement("label");
      forceLabel.className = "xlc-discovery-force";
      this.forceSameContent = document.createElement("input");
      this.forceSameContent.type = "checkbox";
      this.forceSameContent.dataset.xlcControl = "discovery.allow-same-content";
      this.forceSameContent.addEventListener("change", () => this.renderList());
      forceLabel.appendChild(this.forceSameContent);
      const forceText = document.createElement("span");
      forceText.textContent = this.tx("discoveryForceSameContent");
      forceLabel.appendChild(forceText);
      footer.appendChild(forceLabel);
      this.addSelectedButton = document.createElement("button");
      this.addSelectedButton.type = "button";
      this.addSelectedButton.className = "b3-button xlc-btn-primary";
      this.addSelectedButton.textContent = this.options.referenceOnly ? this.tx("discoverySyncView") : this.tx("discoveryAddSelected");
      this.addSelectedButton.dataset.xlcDiscoveryAction = "add-selected";
      this.addSelectedButton.addEventListener("click", () => void this.addSelected());
      footer.appendChild(this.addSelectedButton);
      root.appendChild(footer);
      this.receipt = document.createElement("div");
      this.receipt.className = "xlc-discovery-receipt";
      this.receipt.setAttribute("role", "status");
      this.receipt.setAttribute("aria-live", "polite");
      this.receipt.setAttribute("aria-atomic", "true");
      this.receipt.style.display = "none";
      root.appendChild(this.receipt);
      this.setScanningState(false);
      this.renderList();
    }
    statusLabel(status) {
      const key = status === "already-in-library" ? "discoveryStatusAlready" : status === "library-unverified" ? "discoveryStatusUnverified" : status === "same-content" ? "discoveryStatusSameContent" : status === "added" ? "discoveryStatusAdded" : "discoveryStatusCandidate";
      return this.tx(key);
    }
    setStatus(message, isError = false) {
      if (!this.status) return;
      this.status.textContent = message;
      this.status.classList.toggle("xlc-status--error", isError);
    }
    setScanningState(scanning) {
      if (!scanning) this.cancelRequested = false;
      this.updateScopeControlState();
    }
    scopeControlsLocked() {
      return this.scanState === "scanning" || this.actionBusy || this.undoableBatchIds.size > 0;
    }
    /** Loading/empty states belong to each target control; operation locks only overlay them. */
    setTargetDisabled(control, disabled) {
      control.dataset.xlcTargetDisabled = String(disabled);
      this.updateScopeControlState();
    }
    updateScopeControlState() {
      var _a;
      const scanning = this.scanState === "scanning";
      const locked = this.undoableBatchIds.size > 0;
      (_a = this.root) == null ? void 0 : _a.setAttribute("aria-busy", String(scanning || this.actionBusy));
      if (this.scanButton) {
        this.scanButton.disabled = this.actionBusy || (scanning ? this.cancelRequested : locked || this.missingScopeTarget());
        this.scanButton.textContent = scanning ? this.tx(this.cancelRequested ? "discoveryStopping" : "discoveryCancelScan") : this.tx("discoveryRetry");
        this.scanButton.dataset.xlcDiscoveryAction = scanning ? "cancel-scan" : "retry-scan";
      }
      if (this.filterStatus) this.filterStatus.disabled = scanning || this.actionBusy;
      if (this.filterType) this.filterType.disabled = scanning || this.actionBusy;
      if (this.filterText) this.filterText.disabled = scanning || this.actionBusy;
      if (this.filterTag) this.filterTag.disabled = scanning || this.actionBusy;
      if (this.saveViewButton) this.saveViewButton.disabled = scanning || this.actionBusy || !this.filter.tag || this.scope !== "document" && this.scope !== "notebook" && this.scope !== "tree";
      if (this.tagFacets) this.tagFacets.setAttribute("aria-busy", String(scanning || this.actionBusy));
      if (this.addMode) this.addMode.disabled = this.options.referenceOnly === true || scanning || this.actionBusy;
      if (this.scopeSelect) {
        this.scopeSelect.disabled = scanning || this.actionBusy || locked;
        this.scopeSelect.title = locked ? this.tx("discoveryScopeLockedForUndo") : "";
      }
      if (this.scopeTarget) this.scopeTarget.querySelectorAll("input, select, button").forEach((control) => {
        control.disabled = scanning || this.actionBusy || locked || control.dataset.xlcTargetDisabled === "true";
      });
      if (this.forceSameContent) this.forceSameContent.disabled = scanning || this.actionBusy || !this.sessionId;
    }
    scopeHintText() {
      const hint = this.scope === "document" ? this.tx("discoveryScopeHintDocument") : this.scope === "notebook" ? this.tx(this.options.initialNotebookId !== void 0 ? "discoveryScopeHintSavedNotebook" : "discoveryScopeHintNotebook") : this.scope === "tree" ? this.tx("discoveryScopeTreeHint") : this.scope === "selected-notebook" ? this.tx("discoveryScopeSelectedNotebookHint") : this.tx("discoveryAllWarning", "20", "200", "8", "2,000", "500", "100,000", "2,000,000", "60");
      return this.undoableBatchIds.size ? `${hint} ${this.tx("discoveryScopeLockedForUndo")}` : hint;
    }
    renderScopeTarget() {
      const target = this.scopeTarget;
      if (!target) return;
      this.scopeLoadSeq++;
      target.textContent = "";
      if (this.scope === "tree") {
        const input = document.createElement("input");
        input.type = "search";
        input.className = "b3-text-field";
        input.dataset.xlcControl = "discovery.tree.query";
        input.placeholder = this.tx("discoverySelectTree");
        input.setAttribute("aria-label", this.tx("discoverySelectTree"));
        const search = document.createElement("button");
        search.type = "button";
        search.className = "b3-button xlc-btn-ghost";
        search.dataset.xlcControl = "discovery.tree.search";
        search.textContent = this.tx("discoverySearch");
        const results = document.createElement("select");
        results.className = "b3-select";
        results.dataset.xlcControl = "discovery.tree.result";
        results.setAttribute("aria-label", this.tx("discoverySelectTree"));
        results.addEventListener("change", () => {
          if (this.scopeControlsLocked()) {
            results.value = this.targetDocId;
            return;
          }
          this.targetDocId = results.value;
          this.updateScopeControlState();
          if (this.targetDocId) void this.scan();
        });
        if (this.initialTreeRootId) {
          const placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = this.tx("discoverySelectTreeRoot");
          results.appendChild(placeholder);
          const root = document.createElement("option");
          root.value = this.initialTreeRootId;
          root.textContent = this.options.sourcePath || this.initialTreeRootId;
          results.appendChild(root);
          results.value = this.initialTreeRootId;
          results.hidden = false;
          this.initialTreeRootId = "";
        }
        input.addEventListener("input", () => {
          if (this.scopeControlsLocked()) return;
          this.targetDocId = "";
          results.textContent = "";
          results.hidden = true;
          this.scopeLoadSeq++;
          this.setTargetDisabled(search, !input.value.trim());
          this.setStatus(this.tx("discoveryTargetRequired"));
        });
        search.addEventListener("click", () => {
          const keyword = input.value.trim();
          if (!keyword || !this.deps.searchDocs || this.scopeControlsLocked()) return;
          this.targetDocId = "";
          results.textContent = "";
          results.hidden = true;
          this.setTargetDisabled(search, true);
          const requestSeq = ++this.scopeLoadSeq;
          this.setStatus(this.tx("discoverySearchingDocs"));
          void this.deps.searchDocs(keyword).then((docs) => {
            if (requestSeq !== this.scopeLoadSeq || this.closed) return;
            results.textContent = "";
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = this.tx("discoverySelectTreeRoot");
            results.appendChild(placeholder);
            for (const doc of docs) {
              const option = document.createElement("option");
              option.value = doc.id;
              option.textContent = doc.hPath || doc.name || doc.id;
              results.appendChild(option);
            }
            results.hidden = docs.length === 0;
            this.setStatus(docs.length ? this.tx("discoveryTargetRequired") : this.tx("discoveryNoDocsFound"));
          }).catch((error) => {
            if (requestSeq === this.scopeLoadSeq && !this.closed) this.setStatus(this.tx("discoverySearchFailed", this.errorMessage(error)), true);
          }).finally(() => {
            if (requestSeq === this.scopeLoadSeq && !this.closed) this.setTargetDisabled(search, !input.value.trim());
          });
        });
        results.hidden = !this.targetDocId;
        target.append(input, search, results);
        this.setTargetDisabled(search, true);
        return;
      }
      if (this.scope === "selected-notebook") {
        const select = document.createElement("select");
        select.className = "b3-select";
        select.dataset.xlcControl = "discovery.notebook.select";
        select.setAttribute("aria-label", this.tx("discoverySelectNotebook"));
        select.dataset.xlcTargetDisabled = "true";
        select.disabled = true;
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = this.tx("discoverySelectNotebook");
        select.appendChild(placeholder);
        if (!this.deps.listNotebooks) return;
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "b3-button xlc-btn-ghost xlc-discovery-retry-notebooks";
        retry.textContent = this.tx("discoveryRetryNotebooks");
        retry.dataset.xlcDiscoveryAction = "retry-notebooks";
        retry.hidden = true;
        target.append(select, retry);
        select.addEventListener("change", () => {
          if (this.scopeControlsLocked()) {
            select.value = this.targetNotebookId;
            return;
          }
          this.targetNotebookId = select.value;
          this.updateScopeControlState();
          if (this.targetNotebookId) void this.scan();
        });
        const loadNotebooks = async () => {
          var _a, _b;
          if (this.scopeControlsLocked()) return;
          const requestSeq = ++this.scopeLoadSeq;
          this.targetNotebookId = "";
          this.setTargetDisabled(select, true);
          select.textContent = "";
          const pending = document.createElement("option");
          pending.value = "";
          pending.textContent = this.tx("discoverySelectNotebook");
          select.appendChild(pending);
          retry.hidden = true;
          this.setTargetDisabled(retry, true);
          this.setStatus(this.tx("discoveryNotebookLoading"));
          try {
            const notebooks = await ((_b = (_a = this.deps).listNotebooks) == null ? void 0 : _b.call(_a));
            if (requestSeq !== this.scopeLoadSeq || this.closed || !notebooks) return;
            for (const notebook of notebooks) {
              const option = document.createElement("option");
              option.value = notebook.id;
              option.textContent = notebook.name;
              select.appendChild(option);
            }
            this.setTargetDisabled(select, notebooks.length === 0);
            retry.hidden = notebooks.length > 0;
            this.setStatus(notebooks.length ? this.tx("discoveryTargetRequired") : this.tx("discoveryNoNotebooks"));
          } catch (error) {
            if (requestSeq !== this.scopeLoadSeq || this.closed) return;
            this.setStatus(this.tx("discoveryNotebookLoadFailed", this.errorMessage(error)), true);
            retry.hidden = false;
          } finally {
            if (requestSeq === this.scopeLoadSeq && !this.closed) this.setTargetDisabled(retry, false);
          }
        };
        retry.addEventListener("click", () => void loadNotebooks());
        void loadNotebooks();
        return;
      }
      if (this.scope === "all-notebooks") {
        const label = document.createElement("label");
        label.className = "xlc-discovery-all-confirm";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.xlcControl = "discovery.all-notebooks.confirm";
        const text = document.createElement("span");
        text.textContent = this.tx("discoveryConfirmAll");
        checkbox.addEventListener("change", () => {
          if (this.scopeControlsLocked()) {
            checkbox.checked = this.allConfirmed;
            return;
          }
          this.allConfirmed = checkbox.checked;
          this.updateScopeControlState();
        });
        label.append(checkbox, text);
        target.appendChild(label);
        this.updateScopeControlState();
      }
    }
    async scan() {
      var _a, _b;
      if (this.actionBusy) return;
      if (this.undoableBatchIds.size) {
        this.setReceipt(this.tx("discoveryRescanKeepsUndo"), true, Array.from(this.undoableBatchIds));
        return;
      }
      if (this.scope === "tree" && !this.targetDocId || this.scope === "selected-notebook" && !this.targetNotebookId || this.scope === "all-notebooks" && !this.allConfirmed) return;
      this.cancelRequested = false;
      const seq = ++this.scanSeq;
      if (this.sessionId) {
        const closed = this.deps.service.closeSession(this.sessionId);
        if (!closed.ok) {
          const message = closed.reason === "conflict" ? this.tx("discoveryClosePendingWrites") : this.failureMessage(closed);
          this.setReceipt(message, true);
          (_b = (_a = this.deps).notify) == null ? void 0 : _b.call(_a, "error", message);
          return;
        }
      }
      this.scanState = "scanning";
      this.session = null;
      this.sessionId = null;
      this.candidates.clear();
      this.selected.clear();
      this.previewed.clear();
      this.categoryOverrides.clear();
      this.activeKey = null;
      this.syncCandidateCategory();
      this.setScanningState(true);
      const scanningKey = this.scope === "document" ? "discoveryScanningDocument" : this.scope === "notebook" ? "discoveryScanningNotebook" : this.scope === "tree" ? "discoveryScanningTree" : this.scope === "selected-notebook" ? "discoveryScanningSelectedNotebook" : "discoveryScanningAllNotebooks";
      this.setStatus(this.tx(scanningKey));
      this.setReceipt("");
      if (this.preview) this.preview.textContent = this.tx("discoveryPreviewEmpty");
      this.renderList();
      let result;
      try {
        const progress = {
          onProgress: (progress2) => {
            if (this.closed || seq !== this.scanSeq) return;
            if (progress2.phase === "enumerating") {
              this.setStatus(this.tx("discoveryNotebookEnumerating", String(progress2.discoveredDocs)));
              return;
            }
            const total = typeof progress2.totalDocs === "number" ? String(progress2.totalDocs) : "\u2026";
            this.setStatus(this.tx("discoveryNotebookProgress", String(progress2.scannedDocs), total, String(progress2.scannedBlocks)));
          }
        };
        if (this.scope === "notebook") {
          if (this.options.initialNotebookId !== void 0) {
            result = !isBlockId(this.options.initialNotebookId) ? { ok: false, reason: "invalid-input", message: "saved notebook id is invalid" } : !this.deps.service.discoverNotebook ? { ok: false, reason: "kernel-error", message: this.tx("discoveryNotebookUnavailable") } : await this.deps.service.discoverNotebook(this.options.initialNotebookId, progress);
          } else {
            result = this.deps.service.discoverCurrentNotebook ? await this.deps.service.discoverCurrentNotebook(this.options.docId, progress) : { ok: false, reason: "kernel-error", message: this.tx("discoveryNotebookUnavailable") };
          }
        } else if (this.scope === "tree" && this.deps.service.discoverTree) {
          result = await this.deps.service.discoverTree(this.targetDocId, progress);
        } else if (this.scope === "selected-notebook" && this.deps.service.discoverNotebook) {
          result = await this.deps.service.discoverNotebook(this.targetNotebookId, progress);
        } else if (this.scope === "all-notebooks" && this.deps.service.discoverAllNotebooks) {
          result = await this.deps.service.discoverAllNotebooks({ ...progress, confirmed: this.allConfirmed });
        } else {
          result = await this.deps.service.discoverCurrentDocument(this.options.docId);
        }
      } catch (error) {
        result = { ok: false, reason: "kernel-error", message: error instanceof Error ? error.message : String(error) };
      }
      if (this.closed) return;
      if (seq !== this.scanSeq) return;
      if (!result.ok && result.reason === "cancelled") {
        const stoppedByUser = this.cancelRequested;
        this.scanState = "cancelled";
        this.setScanningState(false);
        if (stoppedByUser) {
          const message = this.tx("discoveryStoppedNoResults");
          this.setStatus(message);
          this.showRetryReceipt(message);
        } else {
          this.setStatus(this.tx("discoveryRetry"));
          this.showRetryReceipt(this.tx("discoveryRetry"));
        }
        this.renderList();
        return;
      }
      if (!result.ok) {
        this.scanState = "failed";
        this.setScanningState(false);
        const message = this.tx("discoveryScanFailed", this.failureMessage(result));
        this.setStatus(message, true);
        this.showRetryReceipt(message);
        this.renderList();
        return;
      }
      this.session = result.data;
      this.sessionId = result.data.id;
      this.candidates = new Map(result.data.candidates.map((candidate) => [candidate.key, candidate]));
      this.page = 0;
      this.scanState = "ready";
      this.setScanningState(false);
      const suffix = result.data.truncated && !result.data.stopped ? ` \xB7 ${this.tx("discoveryTruncated")}` : "";
      const stoppedSuffix = result.data.stopped ? ` \xB7 ${this.tx("discoveryStopped", String(result.data.candidates.length))}` : "";
      const scannedDocs = result.data.scannedDocs;
      const docsSuffix = this.scope !== "document" && typeof scannedDocs === "number" ? ` \xB7 ${this.tx("discoveryScannedDocs", String(scannedDocs))}` : "";
      const scannedNotebooks = result.data.scannedNotebooks;
      const notebooksSuffix = this.scope === "all-notebooks" && typeof scannedNotebooks === "number" ? ` \xB7 ${this.tx("discoveryScannedNotebooks", String(scannedNotebooks))}` : "";
      const skippedLong = result.data.skippedLong ? ` \xB7 ${this.tx("discoverySkippedLong", String(result.data.skippedLong))}` : "";
      const errorSuffix = result.data.errors.length ? ` \xB7 ${this.tx("discoveryErrors", String(result.data.errors.length))}` : "";
      const limitKeys = {
        "scope-document-depth": "discoveryLimitScope",
        notebooks: "discoveryLimitNotebooks",
        documents: "discoveryLimitDocuments",
        blocks: "discoveryLimitBlocks",
        candidates: "discoveryLimitCandidates",
        characters: "discoveryLimitCharacters",
        time: "discoveryLimitTime"
      };
      const reasons = result.data.truncationReasons.filter((reason) => reason !== "cancelled").length ? ` \xB7 ${result.data.truncationReasons.filter((reason) => reason !== "cancelled").map((reason) => {
        var _a2;
        return this.tx((_a2 = limitKeys[reason]) != null ? _a2 : "discoveryTruncated");
      }).join("\u3001")}` : "";
      this.setStatus(`${this.tx("discoveryScanned", String(result.data.scannedBlocks), String(result.data.candidates.length))}${docsSuffix}${notebooksSuffix} \xB7 ${this.tx("discoverySkipped", String(result.data.skippedEmpty))}${skippedLong}${suffix}${reasons}${stoppedSuffix}${errorSuffix}`);
      if (result.data.errors.length) this.setReceipt(result.data.errors.map((error) => `${error.sourcePath || this.tx("discoveryScope")}\uFF1A${this.errorMessage(error.message)}`).join("\n"), true);
      if (this.options.autoSelectFiltered) {
        const eligible = Array.from(this.candidates.values()).filter((candidate) => candidate.status === "candidate" && this.matches(candidate));
        for (const candidate of eligible) this.selected.add(candidate.key);
      }
      this.renderList();
    }
    missingScopeTarget() {
      return this.scope === "tree" && !this.targetDocId || this.scope === "selected-notebook" && !this.targetNotebookId || this.scope === "all-notebooks" && !this.allConfirmed;
    }
    cancelScan() {
      if (this.cancelRequested || !this.deps.service.requestScanStop()) return;
      this.cancelRequested = true;
      this.setScanningState(true);
      this.setStatus(this.tx("discoveryCancelPending"));
    }
    showRetryReceipt(message = this.tx("discoverySessionExpired")) {
      if (!this.receipt || !this.scanButton) return;
      this.receipt.style.display = "block";
      this.receipt.textContent = "";
      const text = document.createElement("span");
      text.textContent = message;
      this.receipt.appendChild(text);
      this.updateScopeControlState();
    }
    matches(candidate) {
      if (this.filter.status !== "all" && candidate.status !== this.filter.status) return false;
      if (this.filter.type !== "all" && candidate.itemType !== this.filter.type) return false;
      if (!matchesDiscoveryTag(candidate.tags, this.filter.tag)) return false;
      if (!this.filter.text) return true;
      const haystack = `${candidate.title} ${candidate.summary} ${candidate.sourcePath}`.toLocaleLowerCase();
      return haystack.includes(this.filter.text);
    }
    toggleFilteredSelection() {
      var _a;
      const eligible = Array.from(this.candidates.values()).filter((candidate) => this.canAdd(candidate) && this.matches(candidate));
      if (!eligible.length || this.actionBusy || !this.sessionId) return;
      const allSelected = eligible.every((candidate) => this.selected.has(candidate.key));
      for (const candidate of eligible) {
        if (allSelected) this.selected.delete(candidate.key);
        else this.selected.add(candidate.key);
      }
      this.renderList();
      (_a = this.selectFilteredButton) == null ? void 0 : _a.focus();
    }
    canAdd(candidate) {
      return candidate.status === "candidate" || candidate.status === "same-content" || candidate.status === "library-unverified";
    }
    renderList() {
      var _a;
      const list = this.list;
      if (!list) return;
      this.renderTagFacets();
      list.textContent = "";
      const visible = Array.from(this.candidates.values()).filter((candidate) => this.matches(candidate));
      const pages = Math.max(1, Math.ceil(visible.length / this.pageSize));
      this.page = Math.max(0, Math.min(this.page, pages - 1));
      const pageItems = visible.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize);
      const results = document.createElement("div");
      results.setAttribute("role", "list");
      results.setAttribute("aria-label", this.tx(this.titleKey()));
      if (!visible.length) {
        const empty = document.createElement("div");
        empty.className = "xlc-discovery-empty";
        empty.setAttribute("role", "listitem");
        const scanning = ((_a = this.root) == null ? void 0 : _a.getAttribute("aria-busy")) === "true";
        const hasFilters = this.filter.status !== "all" || this.filter.type !== "all" || !!this.filter.text || !!this.filter.tag;
        empty.textContent = scanning ? this.tx("discoveryScanningCandidates") : this.scanState === "failed" ? this.tx("discoveryScanIncompleteEmpty") : this.scanState === "cancelled" ? this.tx("discoveryScanStoppedEmpty") : this.candidates.size === 0 && this.scanState === "ready" ? this.tx("discoveryEmptyScope") : this.candidates.size === 0 ? this.tx("discoveryAwaitingScan") : this.tx("discoveryNoCandidates");
        results.appendChild(empty);
        if (!scanning && this.candidates.size > 0 && hasFilters) {
          const clear = document.createElement("button");
          clear.type = "button";
          clear.className = "b3-button xlc-btn-ghost";
          clear.textContent = this.tx("discoveryClearFilters");
          clear.dataset.xlcDiscoveryAction = "clear-filters";
          clear.addEventListener("click", () => {
            this.filter = { status: "all", type: "all", text: "", tag: "" };
            if (this.filterStatus) this.filterStatus.value = "all";
            if (this.filterType) this.filterType.value = "all";
            if (this.filterText) this.filterText.value = "";
            if (this.filterTag) this.filterTag.value = "";
            this.page = 0;
            this.renderList();
          });
          empty.appendChild(clear);
        }
      }
      for (const candidate of pageItems) {
        const row = document.createElement("div");
        row.className = "xlc-discovery-row";
        row.dataset.xlcDiscoveryKey = candidate.key;
        row.setAttribute("role", "listitem");
        row.tabIndex = 0;
        row.setAttribute("aria-label", `${candidate.title} \xB7 ${candidate.sourcePath} \xB7 ${this.statusLabel(candidate.status)}`);
        row.classList.toggle("xlc-discovery-row--active", this.activeKey === candidate.key);
        row.classList.toggle("xlc-discovery-row--disabled", !this.canAdd(candidate));
        row.addEventListener("click", (event) => {
          const target = event.target;
          if (target.closest("button, input")) return;
          void this.selectCandidate(candidate.key);
        });
        row.addEventListener("keydown", (event) => {
          if (event.target !== row || event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          void this.selectCandidate(candidate.key);
        });
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.xlcControl = "discovery.candidate.select";
        checkbox.checked = this.selected.has(candidate.key);
        checkbox.disabled = this.actionBusy || !this.canAdd(candidate);
        checkbox.setAttribute("aria-label", `${this.tx("discoveryAdd")}\uFF1A${candidate.title}`);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) this.selected.add(candidate.key);
          else this.selected.delete(candidate.key);
          this.updateSelectionState();
        });
        row.appendChild(checkbox);
        const body = document.createElement("div");
        body.className = "xlc-discovery-row-body";
        const title = document.createElement("div");
        title.className = "xlc-discovery-row-title";
        title.textContent = candidate.title;
        body.appendChild(title);
        const meta = document.createElement("div");
        meta.className = "xlc-discovery-row-meta";
        meta.textContent = `${typeLabel(this.deps.t, candidate.itemType)} \xB7 ${candidate.sourcePath}${candidate.tags.length ? ` \xB7 ${candidate.tags.join(", ")}` : ""}`;
        body.appendChild(meta);
        const summary = document.createElement("div");
        summary.className = "xlc-discovery-row-summary";
        summary.textContent = candidate.summary;
        body.appendChild(summary);
        row.appendChild(body);
        const side = document.createElement("div");
        side.className = "xlc-discovery-row-side";
        const badge = document.createElement("span");
        badge.className = "xlc-badge";
        badge.textContent = this.statusLabel(candidate.status);
        side.appendChild(badge);
        const add = document.createElement("button");
        add.type = "button";
        add.className = "b3-button xlc-btn-primary";
        add.textContent = candidate.status === "added" ? this.tx("discoveryStatusAdded") : this.tx("discoveryAdd");
        add.disabled = this.actionBusy || !this.canAdd(candidate);
        add.dataset.xlcDiscoveryAction = "add-one";
        add.addEventListener("click", () => void this.addOne(candidate.key, false));
        side.appendChild(add);
        row.appendChild(side);
        results.appendChild(row);
      }
      list.appendChild(results);
      if (visible.length > this.pageSize) {
        const pager = document.createElement("div");
        pager.className = "xlc-discovery-pager";
        pager.setAttribute("role", "navigation");
        pager.setAttribute("aria-label", this.tx("discoveryPagination"));
        const pageLabel = document.createElement("span");
        pageLabel.className = "xlc-discovery-page-label";
        pageLabel.setAttribute("aria-current", "page");
        pageLabel.setAttribute("role", "status");
        pageLabel.setAttribute("aria-live", "polite");
        pageLabel.setAttribute("aria-atomic", "true");
        const previous = document.createElement("button");
        previous.type = "button";
        previous.className = "b3-button xlc-btn-ghost";
        previous.dataset.xlcControl = "discovery.page.previous";
        previous.textContent = this.tx("discoveryPreviousPage");
        previous.disabled = this.page === 0 || this.actionBusy;
        previous.addEventListener("click", () => this.changePage(-1, "previous"));
        pageLabel.textContent = this.tx("discoveryResultsPage", String(this.page + 1), String(pages));
        const next = document.createElement("button");
        next.type = "button";
        next.className = "b3-button xlc-btn-ghost";
        next.dataset.xlcControl = "discovery.page.next";
        next.textContent = this.tx("discoveryNextPage");
        next.disabled = this.page >= pages - 1 || this.actionBusy;
        next.addEventListener("click", () => this.changePage(1, "next"));
        pager.append(previous, pageLabel, next);
        list.appendChild(pager);
      }
      this.updateSelectionState();
    }
    renderTagFacets() {
      const host = this.tagFacets;
      if (!host) return;
      host.textContent = "";
      const facets = buildDiscoveryTagFacets(Array.from(this.candidates.values()));
      if (!facets.length) {
        host.style.display = "none";
        return;
      }
      host.style.display = "flex";
      const label = document.createElement("span");
      label.className = "xlc-discovery-tag-facets-label";
      label.textContent = this.tx("discoveryTagFacets");
      host.appendChild(label);
      for (const facet of facets) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "b3-button xlc-tag-facet";
        button.dataset.xlcControl = "discovery.tag-facet";
        button.dataset.tag = facet.tag;
        button.setAttribute("role", "listitem");
        const active2 = this.filter.tag === facet.tag.toLocaleLowerCase();
        button.setAttribute("aria-pressed", String(active2));
        button.setAttribute("aria-label", this.tx("discoveryTagFacetApply", facet.tag, String(facet.count)));
        button.textContent = `#${facet.tag} \xB7 ${facet.count}`;
        button.addEventListener("click", () => {
          var _a;
          const next = active2 ? "" : facet.tag;
          this.filter.tag = next.toLocaleLowerCase();
          if (this.filterTag) this.filterTag.value = next;
          this.page = 0;
          this.renderList();
          (_a = this.filterTag) == null ? void 0 : _a.focus();
        });
        host.appendChild(button);
      }
    }
    saveCurrentView() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      const tag = (_b = (_a = this.filterTag) == null ? void 0 : _a.value.trim()) != null ? _b : "";
      if (!tag || !this.deps.onSaveView || this.saveViewDialog || this.closeConfirmationDialog || this.closed || this.actionBusy || this.scanState === "scanning") return;
      if (this.scope !== "document" && this.scope !== "notebook" && this.scope !== "tree") {
        this.setReceipt(this.tx("discoverySaveViewInvalid"), true);
        return;
      }
      const targetDocId = this.scope === "notebook" ? "" : this.scope === "tree" ? this.targetDocId : this.options.docId;
      const targetNotebookId = this.scope === "notebook" ? (_d = (_c = this.session) == null ? void 0 : _c.sourceNotebookId) != null ? _d : "" : "";
      if (this.scope === "notebook" ? !isBlockId(targetNotebookId) || ((_e = this.session) == null ? void 0 : _e.scope) !== "notebook" : !isBlockId(targetDocId)) {
        this.setReceipt(this.tx("discoverySaveViewInvalid"), true);
        return;
      }
      const rule = {
        tag: tag.slice(0, LIMITS.tag),
        scope: this.scope,
        targetDocId,
        targetNotebookId,
        pathLabel: ((_f = this.options.sourcePath) != null ? _f : "").slice(0, LIMITS.savedViewPathChars),
        defaultCategory: ((_h = (_g = this.defaultCategoryInput) == null ? void 0 : _g.value) != null ? _h : "").trim().slice(0, LIMITS.category)
      };
      const dialog = new import_siyuan5.Dialog({
        title: this.tx("discoverySaveView"),
        content: "",
        width: "min(440px, 92vw)",
        disableClose: true,
        destroyCallback: () => {
          var _a2;
          this.saveViewDialog = null;
          if (!this.closed) (_a2 = this.saveViewButton) == null ? void 0 : _a2.focus();
        }
      });
      this.saveViewDialog = dialog;
      (_i = dialog.element.querySelector(".b3-dialog__container")) == null ? void 0 : _i.classList.add("xlc-form-host");
      const body = getDialogBody(dialog.element);
      if (!body) {
        dialog.destroy();
        this.setReceipt(this.tx("discoverySaveViewInvalid"), true);
        return;
      }
      const form = document.createElement("form");
      form.className = "xlc-form xlc-save-view-form";
      form.noValidate = true;
      const label = document.createElement("label");
      label.className = "xlc-form-field";
      const caption = document.createElement("span");
      caption.className = "xlc-form-label";
      caption.textContent = this.tx("discoverySaveViewPrompt");
      const input = document.createElement("input");
      input.className = "b3-text-field";
      input.dataset.xlcControl = "discovery.view.name";
      input.maxLength = LIMITS.savedViewNameChars;
      input.value = tag.slice(0, LIMITS.savedViewNameChars);
      input.required = true;
      const error = document.createElement("div");
      error.id = `xlc-save-view-error-${Date.now().toString(36)}`;
      error.className = "xlc-form-error xlc-save-view-error";
      error.setAttribute("role", "alert");
      input.setAttribute("aria-describedby", error.id);
      label.append(caption, input);
      const actions = document.createElement("div");
      actions.className = "xlc-form-actions";
      let settled = false;
      const cancelNaming = () => {
        settled = true;
        dialog.destroy();
      };
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "b3-button b3-button--cancel";
      cancel.dataset.xlcControl = "discovery.view.cancel";
      cancel.textContent = this.tx("cancel");
      cancel.addEventListener("click", cancelNaming);
      const save = document.createElement("button");
      save.type = "submit";
      save.className = "b3-button b3-button--text";
      save.dataset.xlcControl = "discovery.view.save";
      save.textContent = this.tx("save");
      actions.append(cancel, save);
      form.append(label, error, actions);
      body.appendChild(form);
      let composing = false;
      input.addEventListener("compositionstart", () => {
        composing = true;
      });
      input.addEventListener("compositionend", () => {
        composing = false;
      });
      form.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.isComposing || composing || event.keyCode === 229)) event.preventDefault();
        if (event.key === "Escape" && !event.isComposing && !composing) {
          event.preventDefault();
          cancelNaming();
        }
        event.stopPropagation();
      });
      input.addEventListener("input", () => {
        error.textContent = "";
        input.removeAttribute("aria-invalid");
      });
      form.addEventListener("submit", (event) => {
        var _a2, _b2;
        event.preventDefault();
        if (settled || composing || this.closed || this.saveViewDialog !== dialog) return;
        const name = input.value.trim().slice(0, LIMITS.savedViewNameChars);
        if (!name) {
          error.textContent = this.tx("discoverySaveViewInvalid");
          input.setAttribute("aria-invalid", "true");
          input.focus();
          return;
        }
        settled = true;
        if (((_b2 = (_a2 = this.deps).onSaveView) == null ? void 0 : _b2.call(_a2, { name, ...rule })) === false) {
          settled = false;
          error.textContent = this.tx("discoverySaveViewInvalid");
          input.focus();
          return;
        }
        this.setReceipt(this.tx("discoverySaveViewDone", name));
        dialog.destroy();
      });
      requestAnimationFrame(() => {
        if (settled || this.closed || this.saveViewDialog !== dialog) return;
        input.focus();
        input.select();
      });
    }
    changePage(delta, direction) {
      var _a, _b;
      this.page += delta;
      this.renderList();
      const preferred = (_a = this.list) == null ? void 0 : _a.querySelector(`[data-xlc-control="discovery.page.${direction}"]`);
      const fallback = (_b = this.list) == null ? void 0 : _b.querySelector(`[data-xlc-control="discovery.page.${direction === "next" ? "previous" : "next"}"]`);
      const target = preferred && !preferred.disabled ? preferred : fallback && !fallback.disabled ? fallback : this.list;
      if (target === this.list && this.list) this.list.tabIndex = -1;
      target == null ? void 0 : target.focus();
    }
    updateSelectionState() {
      var _a;
      const count = this.selected.size;
      this.updateScopeControlState();
      if (this.closeButton) this.closeButton.disabled = this.actionBusy;
      if (this.selectedLabel) this.selectedLabel.textContent = this.tx("discoverySelected", String(count));
      if (this.scopeHint) this.scopeHint.textContent = this.scopeHintText();
      if (this.addSelectedButton) {
        this.addSelectedButton.disabled = this.actionBusy || !this.sessionId || count === 0;
      }
      if (this.selectFilteredButton) {
        const eligible = Array.from(this.candidates.values()).filter((candidate) => this.canAdd(candidate) && this.matches(candidate));
        const allSelected = eligible.length > 0 && eligible.every((candidate) => this.selected.has(candidate.key));
        this.selectFilteredButton.textContent = this.tx(allSelected ? "discoveryClearFilteredSelection" : "discoverySelectFiltered", String(eligible.length));
        this.selectFilteredButton.disabled = this.actionBusy || !this.sessionId || eligible.length === 0;
        this.selectFilteredButton.setAttribute("aria-pressed", String(allSelected));
        this.selectFilteredButton.setAttribute("aria-label", this.tx(allSelected ? "discoveryClearFilteredSelection" : "discoverySelectFiltered", String(eligible.length)));
      }
      if (this.defaultCategoryInput) this.defaultCategoryInput.disabled = this.actionBusy;
      if (this.candidateCategoryInput) this.candidateCategoryInput.disabled = this.actionBusy || !this.activeKey || !this.sessionId;
      if (this.saveViewButton) this.saveViewButton.disabled = this.scanState === "scanning" || this.actionBusy || !this.filter.tag || this.scope !== "document" && this.scope !== "notebook" && this.scope !== "tree";
      this.updateCategoryResetState();
      (_a = this.receipt) == null ? void 0 : _a.querySelectorAll("button").forEach((button) => {
        button.disabled = this.actionBusy;
      });
    }
    getCategory(key) {
      var _a, _b, _c;
      return this.categoryOverrides.has(key) ? (_a = this.categoryOverrides.get(key)) != null ? _a : "" : (_c = (_b = this.defaultCategoryInput) == null ? void 0 : _b.value) != null ? _c : this.tx("discoveryUnsortedCategory");
    }
    syncCandidateCategory() {
      if (this.candidateCategoryInput) {
        this.candidateCategoryInput.value = this.activeKey ? this.getCategory(this.activeKey) : "";
      }
      this.updateCategoryResetState();
    }
    updateCategoryResetState() {
      if (!this.resetCategoryButton) return;
      this.resetCategoryButton.disabled = this.actionBusy || !this.activeKey || !this.categoryOverrides.has(this.activeKey);
    }
    async selectCandidate(key, allowBusy = false) {
      const candidate = this.candidates.get(key);
      if (!candidate || !this.sessionId || this.actionBusy && !allowBusy) return;
      this.activeKey = key;
      this.syncCandidateCategory();
      this.renderList();
      if (this.preview) this.preview.textContent = this.tx("discoveryPreviewLoading");
      this.previewed.delete(key);
      const seq = ++this.previewSeq;
      let result;
      try {
        result = await this.deps.service.previewCandidate(this.sessionId, key);
      } catch (error) {
        result = { ok: false, reason: "kernel-error", message: this.errorMessage(error) };
      }
      if (this.closed || seq !== this.previewSeq) return;
      if (!result.ok) {
        this.handleFailure(result, key, true);
        return;
      }
      this.applyPreview(result.data);
    }
    applyPreview(data) {
      var _a;
      this.previewed.add(data.candidate.key);
      this.candidates.set(data.candidate.key, data.candidate);
      (_a = this.session) == null ? void 0 : _a.candidates.splice(0, this.session.candidates.length, ...this.candidates.values());
      if (this.preview && this.activeKey === data.candidate.key) this.preview.textContent = data.markdown;
      this.renderList();
      this.setReceipt(!data.contentComparisonComplete ? this.tx("discoveryStatusUnverified") : this.undoableBatchIds.size ? this.tx("discoveryUndoAvailable") : "");
    }
    async ensurePreview(key) {
      if (this.previewed.has(key)) return true;
      await this.selectCandidate(key, true);
      return this.previewed.has(key);
    }
    async addOne(key, allowSameContent) {
      var _a, _b, _c;
      if (!this.sessionId || this.actionBusy) return;
      const mode = ((_a = this.addMode) == null ? void 0 : _a.value) === "copy" ? "copy" : "reference";
      const candidate = this.candidates.get(key);
      if (!candidate || !this.canAdd(candidate)) return;
      const previousStatus = (_c = (_b = this.status) == null ? void 0 : _b.textContent) != null ? _c : "";
      this.actionBusy = true;
      this.setStatus(this.tx("discoveryAddingSingle"));
      this.updateSelectionState();
      this.renderList();
      try {
        if (!await this.ensurePreview(key) || !this.sessionId) return;
        const result = await this.deps.service.addCandidate(this.sessionId, key, {
          allowSameContent,
          category: this.getCategory(key),
          mode
        });
        if (!result.ok) {
          this.handleFailure(result, key);
          return;
        }
        this.handleAddResult(key, result.data);
      } catch (error) {
        this.handleFailure({ ok: false, reason: "kernel-error", message: this.errorMessage(error) }, key);
      } finally {
        this.actionBusy = false;
        this.renderList();
        if (this.sessionId) this.setStatus(previousStatus);
      }
    }
    async addSelected() {
      var _a, _b, _c, _d, _e;
      if (!this.sessionId || this.actionBusy || this.selected.size === 0) return;
      const sessionId = this.sessionId;
      const mode = ((_a = this.addMode) == null ? void 0 : _a.value) === "copy" ? "copy" : "reference";
      const batchStart = this.deps.service.beginAddBatch(sessionId);
      if (!batchStart.ok) {
        this.handleFailure(batchStart);
        return;
      }
      const batchId = batchStart.data.batchId;
      const previousStatus = (_c = (_b = this.status) == null ? void 0 : _b.textContent) != null ? _c : "";
      this.actionBusy = true;
      this.updateSelectionState();
      this.renderList();
      const keys = Array.from(this.selected);
      const categories = new Map(keys.map((key) => [key, this.getCategory(key)]));
      const allowSameContent = ((_d = this.forceSameContent) == null ? void 0 : _d.checked) === true;
      let added = 0;
      let skipped = 0;
      let failed = 0;
      const details = [];
      try {
        for (const [index, key] of keys.entries()) {
          this.setStatus(this.tx("discoveryAddingBatch", String(index + 1), String(keys.length)));
          if (!this.sessionId || this.sessionId !== sessionId) break;
          const candidate = this.candidates.get(key);
          if (!candidate || !this.canAdd(candidate)) {
            skipped++;
            continue;
          }
          if (!await this.ensurePreview(key) || !this.sessionId || this.sessionId !== sessionId) {
            failed++;
            details.push(`${candidate.title}\uFF1A${this.tx("discoveryPreviewUnavailable")}`);
            continue;
          }
          const result = await this.deps.service.addCandidate(this.sessionId, key, {
            allowSameContent,
            batchId,
            category: (_e = categories.get(key)) != null ? _e : this.tx("discoveryUnsortedCategory"),
            mode
          });
          if (!result.ok) {
            if (result.reason === "session-expired") {
              this.handleFailure(result);
              failed++;
              break;
            }
            failed++;
            if (result.reason === "source-changed" || result.reason === "invalid-input") this.previewed.delete(key);
            details.push(`${candidate.title}\uFF1A${this.failureMessage(result)}`);
            continue;
          }
          if (result.data.status === "added") {
            added++;
            this.handleAddResult(key, result.data, false);
          } else {
            skipped++;
            this.handleAddResult(key, result.data, false);
          }
        }
      } catch (error) {
        failed++;
        details.push(this.errorMessage(error));
      } finally {
        const finish = this.deps.service.finishAddBatch(sessionId, batchId);
        if (!finish.ok) {
          failed++;
          details.push(this.failureMessage(finish));
        }
        this.actionBusy = false;
        this.renderList();
        if (this.sessionId) this.setStatus(previousStatus);
      }
      const summary = `${this.tx("discoveryReceiptBatch", String(added), String(skipped), String(failed))}${details.length ? `
${details.join("\n")}` : ""}`;
      if (added > 0) this.undoableBatchIds.add(batchId);
      this.setReceipt(summary, failed > 0, added > 0 ? [batchId] : []);
      this.updateSelectionState();
    }
    handleAddResult(key, result, showReceipt = true) {
      var _a, _b, _c, _d;
      const candidate = this.candidates.get(key);
      if (!candidate) return;
      if (result.status === "added") {
        this.undoableBatchIds.add(result.batchId);
        candidate.status = "added";
        candidate.match = { itemId: result.item.id, title: result.item.title };
        this.previewed.add(key);
        this.selected.delete(key);
        (_b = (_a = this.deps).onAdded) == null ? void 0 : _b.call(_a, result.item.id, result.item.title);
        if (showReceipt) {
          this.setReceipt(this.tx("discoveryReceiptAdded", result.item.title), false, [result.batchId]);
          (_d = (_c = this.deps).notify) == null ? void 0 : _d.call(_c, "info", this.tx("discoveryReceiptAdded", result.item.title));
        }
        return;
      }
      if (result.status === "already-in-library") {
        candidate.status = "already-in-library";
        candidate.match = { itemId: result.itemId, title: result.title };
        this.selected.delete(key);
        if (showReceipt) this.setReceipt(this.tx("discoveryReceiptAlready", result.title));
        return;
      }
      candidate.status = "same-content";
      candidate.match = { itemId: result.itemId, title: result.title };
      if (showReceipt) {
        this.setReceipt(this.tx("discoveryReceiptSameContent", result.title), true);
        this.renderForceAction(key, result.title);
      }
    }
    renderForceAction(key, title) {
      if (!this.receipt) return;
      const force = document.createElement("button");
      force.type = "button";
      force.className = "b3-button xlc-btn-primary";
      force.textContent = `${this.tx("discoveryAdd")}\uFF08${title}\uFF09`;
      force.dataset.xlcDiscoveryAction = "force-same-content";
      force.addEventListener("click", () => {
        void this.addOne(key, true);
      });
      this.receipt.appendChild(document.createTextNode(" "));
      this.receipt.appendChild(force);
    }
    handleFailure(result, candidateKey, previewFailure = false) {
      var _a, _b;
      if (result.reason === "session-expired") {
        this.previewSeq++;
        this.session = null;
        this.sessionId = null;
        this.candidates.clear();
        this.selected.clear();
        this.previewed.clear();
        this.categoryOverrides.clear();
        this.undoableBatchIds.clear();
        this.activeKey = null;
        this.scanState = "failed";
        this.syncCandidateCategory();
        if (this.preview) this.preview.textContent = this.tx("discoverySessionExpired");
        this.setStatus(this.tx("discoverySessionExpired"), true);
        this.showRetryReceipt();
        this.renderList();
        return;
      }
      const message = this.failureMessage(result);
      const retryPreview = candidateKey && (previewFailure || result.reason === "source-changed" || result.reason === "invalid-input");
      if (retryPreview) {
        this.previewed.delete(candidateKey);
        if (this.preview && this.activeKey === candidateKey) this.preview.textContent = message;
      }
      this.setReceipt(message, true);
      if (retryPreview && this.receipt) {
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "b3-button xlc-btn-ghost";
        retry.textContent = this.tx("discoveryPreviewRetry");
        retry.dataset.xlcDiscoveryAction = "retry-preview";
        retry.disabled = this.actionBusy;
        retry.addEventListener("click", () => void this.selectCandidate(candidateKey));
        this.receipt.appendChild(retry);
      }
      (_b = (_a = this.deps).notify) == null ? void 0 : _b.call(_a, "error", message);
    }
    failureMessage(result) {
      const keys = {
        "not-configured": "discoveryNotConfigured",
        "library-document": "discoveryLibraryDocument",
        "library-boundary-unknown": "discoveryBoundaryUnknown",
        "invalid-response": "discoveryInvalidResponse",
        "invalid-input": "discoveryInvalidInput",
        "not-found": "discoverySourceUnavailable",
        "source-changed": "discoverySourceChanged",
        "content-too-long": "discoveryContentTooLong",
        "library-check-incomplete": "discoveryLibraryCheckIncomplete",
        "session-expired": "discoverySessionExpired",
        conflict: "discoveryOperationConflict",
        timeout: "timeout",
        cancelled: "discoveryScanStoppedEmpty"
      };
      const key = result.reason ? keys[result.reason] : void 0;
      return key ? this.tx(key) : this.errorMessage(result.message);
    }
    errorMessage(error) {
      const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
      return /[\u3400-\u9fff]/.test(message) ? message : this.tx("discoveryKernelError");
    }
    async undoBatch(batchId) {
      var _a, _b, _c, _d, _e;
      if (!this.sessionId || this.actionBusy) return;
      const sessionId = this.sessionId;
      this.actionBusy = true;
      this.updateSelectionState();
      this.renderList();
      this.setReceipt(this.tx("discoveryUndoing"), false, [], "discoveryUndoReceiptTitle");
      try {
        const result = await this.deps.service.undoBatch(sessionId, batchId);
        if (!result.ok) {
          const message = this.failureMessage(result);
          this.setReceipt(message, true, [batchId], "discoveryUndoReceiptTitle");
          (_b = (_a = this.deps).notify) == null ? void 0 : _b.call(_a, "error", message);
          return;
        }
        this.showUndoResult(result.data);
      } catch (error) {
        const message = this.errorMessage(error);
        this.setReceipt(message, true, [batchId], "discoveryUndoReceiptTitle");
        (_d = (_c = this.deps).notify) == null ? void 0 : _d.call(_c, "error", message);
      } finally {
        this.actionBusy = false;
        this.renderList();
        if ((_e = this.receipt) == null ? void 0 : _e.querySelector("[data-xlc-discovery-action='undo-batch']")) {
          this.receipt.querySelector("[data-xlc-discovery-action='undo-batch']").disabled = false;
        }
      }
    }
    showUndoResult(result) {
      var _a, _b, _c, _d, _e;
      const deletedItems = (_a = result.deletedItems) != null ? _a : [];
      const absentItems = [
        ...deletedItems,
        ...result.skipped.filter((item) => item.reason === "not-found").map(({ itemId, title }) => ({ itemId, title }))
      ];
      for (const { itemId } of absentItems) {
        for (const candidate of this.candidates.values()) {
          if (candidate.status === "added" && ((_b = candidate.match) == null ? void 0 : _b.itemId) === itemId) {
            candidate.status = "candidate";
            delete candidate.match;
          }
        }
      }
      for (const item of absentItems) (_d = (_c = this.deps).onAdded) == null ? void 0 : _d.call(_c, item.itemId, item.title);
      const skipKey = {
        "not-found": "discoveryUndoSkipNotFound",
        "identity-changed": "discoveryUndoSkipIdentityChanged",
        edited: "discoveryUndoSkipEdited",
        "library-unverified": "discoveryUndoSkipLibraryUnverified"
      };
      const lines = [this.tx("discoveryUndoDone", String(result.deleted), String(result.skipped.length), String(result.failed.length))];
      for (const item of result.skipped) lines.push(`${item.title}\uFF1A${this.tx((_e = skipKey[item.reason]) != null ? _e : "discoveryUnknown")}`);
      for (const item of result.failed) lines.push(`${item.title}\uFF1A${this.tx("discoveryUndoDeleteFailed", this.errorMessage(item.message))}`);
      const retryable = result.skipped.some((item) => item.reason !== "not-found") || result.failed.length > 0;
      if (!retryable) this.undoableBatchIds.delete(result.batchId);
      this.setReceipt(result.alreadyUndone ? this.tx("discoveryUndoAlreadyDone") : lines.join("\n"), false, retryable ? [result.batchId] : [], "discoveryUndoReceiptTitle");
    }
    setReceipt(message, error = false, undoBatchIds = [], titleKey = "discoveryReceiptTitle") {
      if (!this.receipt) return;
      this.receipt.style.display = message ? "block" : "none";
      this.receipt.textContent = "";
      if (!message) return;
      const title = document.createElement("strong");
      title.textContent = this.tx(titleKey);
      this.receipt.appendChild(title);
      const body = document.createElement("div");
      body.className = error ? "xlc-status--error" : "";
      body.textContent = message;
      this.receipt.appendChild(body);
      for (const batchId of /* @__PURE__ */ new Set([...this.undoableBatchIds, ...undoBatchIds])) {
        const undo = document.createElement("button");
        undo.type = "button";
        undo.className = "b3-button xlc-btn-ghost";
        undo.textContent = this.tx("discoveryUndoBatch");
        undo.disabled = this.actionBusy;
        undo.dataset.xlcDiscoveryAction = "undo-batch";
        undo.addEventListener("click", () => void this.undoBatch(batchId));
        this.receipt.appendChild(undo);
      }
    }
  };
  function openDiscoveryDialog(deps, options) {
    const dialog = new DiscoveryDialog(deps, options);
    dialog.open();
    return dialog;
  }

  // src/service/commands.ts
  var import_siyuan6 = __toESM(require_stub_dom());

  // src/model/placeholders.ts
  var PLACEHOLDER_PATTERN = /\{\{xlc:(date|time|datetime|weekday|title|path|doc|random)(?:\|([^}]+))?\}\}/g;
  var WEEKDAYS_ZH = ["\u5468\u65E5", "\u5468\u4E00", "\u5468\u4E8C", "\u5468\u4E09", "\u5468\u56DB", "\u5468\u4E94", "\u5468\u516D"];
  var RELATIVE_ARG = /^([+-])(\d{1,4})([dwmy])$/;
  var NEXT_WEEKDAY_ARG = /^next_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/;
  var WEEKDAY_INDEX = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function renderDate(now) {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  function addMonthsClamped(base, months) {
    const y = base.getFullYear();
    const m = base.getMonth() + months;
    const lastDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(base.getDate(), lastDay));
  }
  function resolveDateArg(now, rawArg) {
    const arg = rawArg.trim().toLowerCase();
    const rel = RELATIVE_ARG.exec(arg);
    if (rel) {
      const sign = rel[1] === "+" ? 1 : -1;
      const n = Number(rel[2]);
      let next;
      if (rel[3] === "d" || rel[3] === "w") {
        next = new Date(now);
        next.setDate(next.getDate() + sign * n * (rel[3] === "w" ? 7 : 1));
      } else {
        next = addMonthsClamped(now, sign * n * (rel[3] === "y" ? 12 : 1));
      }
      return renderDate(next);
    }
    const wd = NEXT_WEEKDAY_ARG.exec(arg);
    const dayName = wd == null ? void 0 : wd[1];
    const target = dayName ? WEEKDAY_INDEX[dayName] : void 0;
    if (target !== void 0) {
      const ahead = (target - now.getDay() + 7) % 7 || 7;
      const next = new Date(now);
      next.setDate(next.getDate() + ahead);
      return renderDate(next);
    }
    return null;
  }
  function pickRandomOption(rawArg) {
    var _a;
    const options = rawArg.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 16);
    if (options.length === 0) return null;
    return (_a = options[Math.floor(Math.random() * options.length)]) != null ? _a : null;
  }
  function renderPlaceholder(kind, now, doc) {
    var _a, _b, _c;
    switch (kind) {
      case "date":
        return renderDate(now);
      case "time":
        return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      case "datetime":
        return `${renderDate(now)} ${renderPlaceholder("time", now)}`;
      case "weekday":
        return (_a = WEEKDAYS_ZH[now.getDay()]) != null ? _a : "";
      case "title":
      case "doc":
        return (_b = doc == null ? void 0 : doc.title) != null ? _b : "";
      case "path":
        return (_c = doc == null ? void 0 : doc.path) != null ? _c : "";
      case "random":
        return "";
    }
  }
  function resolvePlaceholder(kind, arg, now, doc) {
    if (kind === "random") return arg ? pickRandomOption(arg) : null;
    if (kind === "date" && arg) return resolveDateArg(now, arg);
    if (arg) return null;
    return renderPlaceholder(kind, now, doc);
  }
  function applyPlaceholders(text, now, enabled, doc) {
    if (!enabled || !text) return text;
    return text.replace(PLACEHOLDER_PATTERN, (match, kind, arg) => {
      var _a;
      return (_a = resolvePlaceholder(kind, arg, now, doc)) != null ? _a : match;
    });
  }
  function listPlaceholders(text) {
    const kinds = [];
    for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
      const kind = match[1];
      if (!kinds.includes(kind)) kinds.push(kind);
    }
    return kinds;
  }

  // src/service/commands.ts
  var ActionExecutor = class {
    constructor(library, host, notify, onItemUsed, placeholders) {
      this.library = library;
      this.host = host;
      this.onItemUsed = onItemUsed;
      this.placeholders = placeholders;
      void notify;
    }
    /** provider payload 渲染（xiaolv-common/v1 语义定案）：与库条目一致，插入前应用动态占位符。
     *  提供方如需字面花括号，请使用非 xlc 命名空间。 */
    async renderProviderOutput(text) {
      return this.applyOutput(text);
    }
    /** 对输出载荷应用动态占位符（插入 markdown 与剪贴板文本；存储内容不受影响）。
     *  仅当文本含 title/path/doc 占位符时才取当前文档（避免多余内核往返）。
     *  {{xlc:clipboard}} 异步替换（读取失败=空串，语义同无文档）。
     *  code 条目跳过替换：代码中的 {{xlc:…}} 是字面文本（例如演示模板的代码），绝不能被改写。 */
    /** 公开渲染入口：定向插入（insertToDoc）与 provider payload 共用（R50/R51 语义统一）。
     *  fills：变量填充卡收集的 ask 值（R67）；插入语义，含片段展开（R72）、光标移除与未填充兜底。 */
    async renderForInsert(text, item, fills) {
      var _a;
      let payload = text;
      if ((item == null ? void 0 : item.itemType) !== "code") {
        payload = await this.library.expandSnippetRefs(payload);
        if (fills) {
          payload = expandAsks(payload, fills);
        }
        payload = applyAskDefaults(stripCursorToken(payload));
      }
      return (_a = await this.applyOutput(payload, item)) != null ? _a : payload;
    }
    async applyOutput(text, item) {
      var _a;
      if (text === void 0) return void 0;
      if ((item == null ? void 0 : item.itemType) === "code") return text;
      if (!this.placeholders) return text;
      try {
        if (!this.placeholders.enabled()) return text;
        const needsDoc = listPlaceholders(text).some((k) => k === "title" || k === "path" || k === "doc");
        const doc = needsDoc ? await this.placeholders.currentDoc() : null;
        let output = applyPlaceholders(text, this.placeholders.now(), true, doc);
        if (output.includes("{{xlc:clipboard}}") && this.placeholders.clipboard) {
          let clipboardText = "";
          try {
            clipboardText = (_a = await this.placeholders.clipboard()) != null ? _a : "";
          } catch {
            clipboardText = "";
          }
          output = output.replaceAll("{{xlc:clipboard}}", clipboardText.slice(0, 4e3));
        }
        return output;
      } catch {
        return text;
      }
    }
    async resolveContent(item) {
      const health = await this.library.checkSourceHealth(item);
      const h = health.ok ? health.data : { blockMissing: false, docMissing: false, assetMissing: false };
      const sourceMissing = item.itemType === "blockref" ? h.blockMissing : h.blockMissing || h.docMissing;
      if (item.itemType === "blockref" && sourceMissing) {
        return { kramdown: "", sourceMissing: true, assetMissing: false };
      }
      const kramdown = await this.library.getItemKramdown(item);
      if (!kramdown.ok) return null;
      return {
        kramdown: kramdown.data,
        // libraryDocId 是条目所在库文档，不能用它掩盖 sourceDocId 的失效。
        // 来源文档/块任一失效都必须传入计划层，openSource 才能返回 source-missing。
        sourceMissing,
        assetMissing: h.assetMissing
      };
    }
    emitEvent(eventName, item, extra) {
      try {
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: { protocolVersion: PROTOCOL_VERSION, itemId: item.id, itemType: item.itemType, ...extra }
        }));
      } catch {
      }
    }
    /** 现场解析条目内容；先展开片段引用（F5，code 条目不处理），再应用变量填充卡的 ask 值。 */
    /** 使用记录统一出口（F3）：侧车失败不影响动作回执 */
    noteUsed(item) {
      var _a;
      try {
        (_a = this.onItemUsed) == null ? void 0 : _a.call(this, item);
      } catch {
      }
    }
    async resolveWithFills(item, fills) {
      const content = await this.resolveContent(item);
      if (!content) return null;
      if (item.itemType !== "code") {
        let kramdown = await this.library.expandSnippetRefs(content.kramdown);
        if (fills) {
          kramdown = expandAsks(kramdown, fills);
        }
        content.kramdown = kramdown;
      }
      return content;
    }
    /** Capture before a caller starts lookup/queue work and release after its entire action. */
    async withInsertTargetScope(mode, action) {
      if (!mode.startsWith("insert") || typeof this.host.captureInsertTarget !== "function") return action(void 0);
      const editorTarget = this.host.captureInsertTarget();
      try {
        return await action(editorTarget);
      } finally {
        if (editorTarget !== void 0) this.host.releaseInsertTarget(editorTarget);
      }
    }
    run(item, mode, opts) {
      if ((opts == null ? void 0 : opts.editorTarget) !== void 0) return this.runAtTarget(item, mode, opts.fills, opts.editorTarget);
      return this.withInsertTargetScope(mode, (target) => this.runAtTarget(item, mode, opts == null ? void 0 : opts.fills, target));
    }
    async runAtTarget(item, mode, fills, editorTarget) {
      const content = await this.resolveWithFills(item, fills);
      if (!content) {
        return { ok: false, mode, message: "kernel-error:content", downgraded: false, pendingVerification: [] };
      }
      if (item.itemType === "blockref" && content.sourceMissing && (mode === "copy" || mode === "copy-content" || mode === "insert-content")) {
        return { ok: false, mode, message: "source-missing", downgraded: true, pendingVerification: [] };
      }
      const ctx = {
        surface: this.host.isMobile() ? "mobile" : "desktop",
        hasActiveEditor: editorTarget !== void 0 ? this.host.canInsertAtTarget(editorTarget) : this.host.hasActiveEditor(),
        content
      };
      const plan = planAction(item, mode, ctx);
      if (plan.downgraded && plan.downgradeReason === "source-missing") {
        return { ok: false, mode: plan.mode, message: "source-missing", downgraded: true, pendingVerification: plan.pendingVerification };
      }
      if ((plan.mode === "copy" || plan.mode === "copy-content") && !plan.clipboardText) {
        return { ok: false, mode: plan.mode, message: "empty-plan", downgraded: plan.downgraded, pendingVerification: plan.pendingVerification };
      }
      return this.execute(item, plan, editorTarget);
    }
    async execute(item, plan, editorTarget) {
      var _a, _b, _c;
      const insertRender = (text) => {
        if (text === void 0) return Promise.resolve(void 0);
        if (item.itemType === "code") return Promise.resolve(text);
        return this.applyOutput(applyAskDefaults(stripCursorToken(text)), item);
      };
      if ((plan.mode === "insert" || plan.mode === "insert-content" || plan.mode === "insert-ref" || plan.mode === "insert-embed") && this.host.isMobile()) {
        const text = (_a = await insertRender(plan.markdown)) != null ? _a : "";
        const copied = text ? await this.host.writeClipboard(text) : false;
        if (copied) {
          this.noteUsed(item);
        }
        return {
          ok: copied,
          mode: plan.mode,
          message: copied ? "insert-downgraded-copied" : "copy-failed",
          downgraded: true,
          pendingVerification: ["mobile-insert-unverified", ...plan.pendingVerification]
        };
      }
      if (plan.mode === "insert" || plan.mode === "insert-content" || plan.mode === "insert-ref" || plan.mode === "insert-embed") {
        const md = (_b = await insertRender(plan.markdown)) != null ? _b : "";
        if (!md) {
          return { ok: false, mode: plan.mode, message: "empty-plan", downgraded: plan.downgraded, pendingVerification: plan.pendingVerification };
        }
        const targetAvailable = editorTarget !== void 0 ? this.host.canInsertAtTarget(editorTarget) : this.host.hasActiveEditor();
        if (!targetAvailable) {
          const copied = await this.host.writeClipboard(md);
          if (copied) {
            this.noteUsed(item);
          }
          return {
            ok: copied,
            mode: plan.mode,
            message: copied ? (editorTarget == null ? void 0 : editorTarget.editor) ? "target-unavailable-copied" : "no-editor-copied" : "no-editor-copy-failed",
            downgraded: true,
            pendingVerification: plan.pendingVerification
          };
        }
        const inserted = this.host.insertMarkdown(md, editorTarget);
        if (inserted) {
          this.emitEvent(EVENTS.itemInserted, item, { insertMode: plan.mode });
          this.noteUsed(item);
        }
        return {
          ok: inserted,
          mode: plan.mode,
          message: inserted ? "inserted" : "insert-failed",
          downgraded: false,
          pendingVerification: plan.pendingVerification
        };
      }
      if (plan.mode === "copy" || plan.mode === "copy-content") {
        const text = (_c = await this.applyOutput(plan.clipboardText, item)) != null ? _c : "";
        const copied = await this.host.writeClipboard(text);
        if (copied) {
          this.noteUsed(item);
        }
        return {
          ok: copied,
          mode: plan.mode,
          message: copied ? "copied" : "copy-failed",
          downgraded: plan.downgraded,
          pendingVerification: plan.pendingVerification
        };
      }
      if (plan.mode === "open" && plan.open) {
        return this.openTarget(plan.open, item);
      }
      return { ok: false, mode: plan.mode, message: "unsupported", downgraded: false, pendingVerification: plan.pendingVerification };
    }
    async openTarget(target, _item) {
      var _a;
      let opened = false;
      if (target.kind === "url" && target.url) opened = this.host.openExternal(target.url);
      else if (target.kind === "asset" && target.assetPath) opened = this.host.openAsset(target.assetPath);
      else if (target.kind === "block" && target.blockId) opened = this.host.openDoc((_a = target.docId) != null ? _a : "", target.blockId);
      else if (target.kind === "doc" && target.docId) opened = this.host.openDoc(target.docId);
      return {
        ok: opened,
        mode: "open-source",
        message: opened ? "source-opened" : "open-failed",
        downgraded: false,
        pendingVerification: [],
        ...opened ? { opened: target.kind } : {}
      };
    }
    async openSource(item) {
      var _a;
      const content = await this.resolveContent(item);
      if (!content) {
        return { ok: false, mode: "open-source", message: "kernel-error:content", downgraded: false, pendingVerification: [] };
      }
      const planned = planOpenSource(item, content);
      if (planned.failure || !planned.target) {
        return {
          ok: false,
          mode: "open-source",
          message: (_a = planned.failure) != null ? _a : "not-found",
          downgraded: true,
          pendingVerification: []
        };
      }
      return this.openTarget(planned.target, item);
    }
  };

  // src/kernel/client.ts
  function parseChildBlocks(data) {
    if (!Array.isArray(data)) return [];
    return data.filter((raw) => {
      return !!raw && typeof raw.id === "string" && typeof raw.type === "string";
    });
  }
  function parseKramdown(data) {
    if (!data || typeof data.id !== "string") return null;
    const kramdown = data.kramdown;
    return { id: data.id, kramdown: typeof kramdown === "string" ? kramdown : "" };
  }
  function parseBatchKramdowns(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const out = {};
    for (const [blockId, value] of Object.entries(data)) {
      if (/^\d{14}-[0-9a-z]{7}$/.test(blockId) && typeof value === "string") out[blockId] = value;
    }
    return out;
  }
  function parseAttrs(data) {
    if (!data || typeof data !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  }
  function parseBatchAttrs(data) {
    if (!data || typeof data !== "object") return {};
    const out = {};
    for (const [blockId, attrs] of Object.entries(data)) {
      out[blockId] = parseAttrs(attrs);
    }
    return out;
  }
  function parseExistingMap(data) {
    if (!data || typeof data !== "object") return {};
    const out = {};
    for (const [id, v] of Object.entries(data)) {
      out[id] = v === true;
    }
    return out;
  }
  function parseDocId(data) {
    return typeof data === "string" && data.length > 0 ? data : null;
  }
  function parseString(data) {
    return typeof data === "string" ? data : "";
  }
  function parseDocSearch(data) {
    var _a;
    if (!Array.isArray(data)) return [];
    const out = [];
    for (const raw of data) {
      if (!raw || typeof raw !== "object") continue;
      const obj = raw;
      const path = typeof obj.path === "string" ? obj.path : "";
      const m = path.match(/(\d{14}-[0-9a-z]{7})\.sy$/);
      if (!m) continue;
      out.push({
        id: (_a = m[1]) != null ? _a : "",
        hPath: typeof obj.hPath === "string" ? obj.hPath : "",
        box: typeof obj.box === "string" ? obj.box : "",
        name: typeof obj.name === "string" ? obj.name : ""
      });
      if (out.length >= 30) break;
    }
    return out;
  }

  // src/model/kramdown.ts
  var ATTRIBUTE_PATTERN = /(^|\s)([\w:-]+)=(?:"[^"]*"|'[^']*'|[^\s}]+)(?=\s|$)/g;
  var IAL_TOKEN_PATTERN = /(`+)|(\{:[^{}]*\})/g;
  function normalizeIalToken(ial) {
    const attributes = ial.slice(2, -1);
    const safeAttributes = attributes.replace(
      ATTRIBUTE_PATTERN,
      (attribute, _space, name) => name === "id" || name === "updated" || name.startsWith("custom-xlc-") ? " " : attribute
    ).trim();
    return safeAttributes ? `{: ${safeAttributes}}` : "";
  }
  function findCodeLines(lines) {
    var _a, _b;
    const codeLines = [];
    let fence = null;
    for (const line of lines) {
      if (fence) {
        codeLines.push(true);
        const closing = (_a = line.match(/^\s*(`+|~+)\s*$/)) == null ? void 0 : _a[1];
        if (closing && closing.charAt(0) === fence.marker && closing.length >= fence.length) fence = null;
        continue;
      }
      if (!line.trim()) {
        codeLines.push(false);
        continue;
      }
      if (/^(?: {4,}|\t)/.test(line)) {
        codeLines.push(true);
        continue;
      }
      const opening = (_b = line.match(/^\s*(`{3,}|~{3,})/)) == null ? void 0 : _b[1];
      if (opening) {
        fence = { marker: opening.charAt(0), length: opening.length };
        codeLines.push(true);
        continue;
      }
      codeLines.push(false);
    }
    return codeLines;
  }
  function findInlineCodeTicks(lines, codeLines) {
    var _a, _b;
    const pairedByLine = lines.map(() => /* @__PURE__ */ new Set());
    let segment = [];
    const pairSegment = () => {
      var _a2, _b2;
      const nextByLength = /* @__PURE__ */ new Map();
      const nextSameLength = /* @__PURE__ */ new Map();
      for (let index = segment.length - 1; index >= 0; index--) {
        const tick = segment[index];
        if (!tick) continue;
        const next = nextByLength.get(tick.length);
        if (next !== void 0) nextSameLength.set(index, next);
        nextByLength.set(tick.length, index);
      }
      for (let index = 0; index < segment.length; index++) {
        const tick = segment[index];
        if (!tick) continue;
        const closeIndex = nextSameLength.get(index);
        if (closeIndex === void 0) continue;
        (_a2 = pairedByLine[tick.line]) == null ? void 0 : _a2.add(tick.offset);
        const close = segment[closeIndex];
        if (close) (_b2 = pairedByLine[close.line]) == null ? void 0 : _b2.add(close.offset);
        index = closeIndex;
      }
      segment = [];
    };
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = (_a = lines[lineIndex]) != null ? _a : "";
      if (codeLines[lineIndex]) {
        pairSegment();
        continue;
      }
      IAL_TOKEN_PATTERN.lastIndex = 0;
      for (const match of line.matchAll(IAL_TOKEN_PATTERN)) {
        if (!match[1]) continue;
        segment.push({ line: lineIndex, offset: (_b = match.index) != null ? _b : 0, length: match[0].length });
      }
    }
    pairSegment();
    return pairedByLine;
  }
  function normalizeLineIals(line, activeInlineCodeTicks, pairedInlineCodeTicks) {
    var _a;
    let cursor = 0;
    let inlineCodeTicks = activeInlineCodeTicks;
    let output = "";
    IAL_TOKEN_PATTERN.lastIndex = 0;
    for (const match of line.matchAll(IAL_TOKEN_PATTERN)) {
      const token = match[0];
      const start = (_a = match.index) != null ? _a : 0;
      output += line.slice(cursor, start);
      cursor = start + token.length;
      if (match[1]) {
        if (pairedInlineCodeTicks.has(start)) {
          if (!inlineCodeTicks) inlineCodeTicks = token.length;
          else if (inlineCodeTicks === token.length) inlineCodeTicks = 0;
        }
        output += token;
      } else if (inlineCodeTicks) {
        output += token;
      } else {
        output += normalizeIalToken(token);
      }
    }
    return { line: output + line.slice(cursor), activeInlineCodeTicks: inlineCodeTicks };
  }
  function normalizeKramdownIal(markdown) {
    var _a, _b;
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    const codeLines = findCodeLines(lines);
    const pairedInlineCodeTicks = findInlineCodeTicks(lines, codeLines);
    const output = [];
    let inlineCodeTicks = 0;
    for (let index = 0; index < lines.length; index++) {
      const line = (_a = lines[index]) != null ? _a : "";
      if (codeLines[index]) {
        inlineCodeTicks = 0;
        output.push(line);
        continue;
      }
      const normalized = normalizeLineIals(line, inlineCodeTicks, (_b = pairedInlineCodeTicks[index]) != null ? _b : /* @__PURE__ */ new Set());
      output.push(normalized.line);
      inlineCodeTicks = normalized.activeInlineCodeTicks;
    }
    return output.join("\n").trim();
  }

  // src/service/library.ts
  function fail(reason, message) {
    return { ok: false, reason, message };
  }
  function ok(data) {
    return { ok: true, data };
  }
  function sameManagedItem(actual, expected) {
    return actual.id === expected.id && actual.blockId === expected.blockId && actual.libraryDocId === expected.libraryDocId && actual.itemType === expected.itemType && actual.title === expected.title && actual.alias === expected.alias && actual.tags.length === expected.tags.length && actual.tags.every((tag, index) => tag === expected.tags[index]) && actual.category === expected.category && (actual.itemType === "blockref" && expected.itemType === "blockref" ? true : actual.varCount === expected.varCount) && actual.source.sourceDocId === expected.source.sourceDocId && actual.source.sourceBlockId === expected.source.sourceBlockId && actual.source.sourceType === expected.source.sourceType && actual.url === expected.url && actual.targetBlockId === expected.targetBlockId && actual.createdAt === expected.createdAt && actual.updatedAt === expected.updatedAt && actual.droppedFields.length === expected.droppedFields.length && actual.droppedFields.every((field, index) => field === expected.droppedFields[index]);
  }
  function normalizeConditionalMarkdown(markdown) {
    return normalizeKramdownIal(markdown);
  }
  function sameCustomAttrs(actual, expected) {
    const actualKeys = Object.keys(actual).filter((key) => key.startsWith(ATTR_PREFIX)).sort();
    const expectedKeys = Object.keys(expected).filter((key) => key.startsWith(ATTR_PREFIX)).sort();
    return actualKeys.length === expectedKeys.length && actualKeys.every((key, index) => key === expectedKeys[index] && actual[key] === expected[key]);
  }
  function toFailureReceipt(err) {
    const name = err == null ? void 0 : err.name;
    if (name === "KernelTimeoutError") return fail("timeout", err.message);
    return fail("kernel-error", err.message);
  }
  function toSearchEntry(item) {
    return {
      id: item.id,
      blockId: item.blockId,
      libraryDocId: item.libraryDocId,
      itemType: item.itemType,
      title: item.title,
      alias: item.alias,
      tags: item.tags,
      category: item.category,
      summary: item.summary,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      sourceDocId: item.source.sourceDocId,
      sourceBlockId: item.source.sourceBlockId,
      varCount: item.varCount
    };
  }
  var LibraryService = class {
    constructor(kernel, options = {}) {
      this.kernel = kernel;
      this.config = null;
      this.index = null;
      /**
       * 写操作按条目/逻辑 ID 串行化。UI 已经锁按钮，但协议调用方、重复快捷键和
       * 两个弹窗仍可能同时写同一块；队列保证失败不会让后一个请求覆盖回滚状态。
       */
      this.writeLocks = /* @__PURE__ */ new Map();
      /** IDs created during this service lifetime; survives cache invalidation until a config switch. */
      this.createdLogicalIds = /* @__PURE__ */ new Set();
      /** 已完成的幂等写回执；短期保留可防止网络重试/双击在锁释放后再次落块。 */
      this.idempotencyReceipts = /* @__PURE__ */ new Map();
      this.updateReceipts = /* @__PURE__ */ new Map();
      this.removeReceipts = /* @__PURE__ */ new Map();
      /** 成功的文档追加回执；仅调用方提供幂等键时启用。 */
      this.appendReceipts = /* @__PURE__ */ new Map();
      /** 首次设置创建文档的幂等回执，避免确认弹窗/宿主重试产生多个库文档。 */
      this.libraryDocReceipts = /* @__PURE__ */ new Map();
      this.conditionalDeleteGrants = /* @__PURE__ */ new WeakMap();
      /** 索引（可丢弃缓存）。为空或超过 maxAgeMs 时重建（SWR：陈旧索引透明刷新）。 */
      /** 索引（可丢弃缓存）。为空或超过 maxAgeMs 时重建（SWR）。
       *  并发去重：重建进行中时共用同一 Promise（双开弹窗/预热竞争只建一次）。 */
      this.buildingPromise = null;
      /** 索引代数：任一失效（index=null）自增；重建完成时代数已变则丢弃陈旧结果（R139） */
      this.indexGen = 0;
      /** doc/tree 直接使用容器根；notebook 模式选择笔记本根下第一个文档作为写入父块。 */
      /** 写入文档解析缓存（按索引代数失效）：批量导入时不再每条一次 listDocsByPath 往返（R140） */
      this.writeDocCache = null;
      this.options = options;
    }
    notifyItemsChanged(itemIds) {
      if (itemIds.length === 0 || !this.options.onItemsChanged) return;
      try {
        this.options.onItemsChanged([...new Set(itemIds)]);
      } catch {
      }
    }
    rememberReceipt(cache, key, receipt) {
      cache.set(key, receipt);
      while (cache.size > 256) {
        const oldest = cache.keys().next().value;
        if (!oldest) break;
        cache.delete(oldest);
      }
    }
    withWriteLock(key, action) {
      var _a;
      const previous = (_a = this.writeLocks.get(key)) != null ? _a : Promise.resolve();
      const current = previous.then(action);
      const tail = current.then(() => void 0, () => void 0);
      this.writeLocks.set(key, tail);
      return current.finally(() => {
        if (this.writeLocks.get(key) === tail) this.writeLocks.delete(key);
      });
    }
    getConfig() {
      return this.config ? { ...this.config } : null;
    }
    setConfig(config) {
      this.config = { ...config };
      this.createdLogicalIds.clear();
      this.idempotencyReceipts.clear();
      this.updateReceipts.clear();
      this.removeReceipts.clear();
      this.appendReceipts.clear();
      this.libraryDocReceipts.clear();
      this.invalidateIndex();
    }
    /** 使索引缓存失效（公开供宿主 onDataChanged 使用：外部同步/数据变更后下次打开重建，R148） */
    invalidateIndex() {
      this.indexGen++;
      this.index = null;
    }
    async ensureIndex(maxAgeMs) {
      const gen = this.indexGen;
      if (this.index) {
        const fresh = typeof maxAgeMs !== "number" || Date.now() - this.index.builtAt <= maxAgeMs;
        if (fresh) return this.index;
      }
      if (!this.buildingPromise) {
        this.buildingPromise = this.buildIndex().finally(() => {
          this.buildingPromise = null;
        });
      }
      const result = await this.buildingPromise;
      if (gen === this.indexGen) {
        this.index = result;
        return result;
      }
      return this.ensureIndex(maxAgeMs);
    }
    /** 当前缓存索引（可能为 null；调用方据此展示 loading 态） */
    getIndex() {
      return this.index;
    }
    async reindex(options = {}) {
      const gen = this.indexGen;
      const result = await this.buildIndex(LIMITS.maxItems, options);
      if (result.stopped) {
        this.index = null;
        return result;
      }
      if (gen === this.indexGen) {
        this.index = result;
        return result;
      }
      return this.ensureIndex();
    }
    // ---- 库发现与首次设置 ----
    async listNotebooks() {
      try {
        const data = await this.kernel.request("lsNotebooks", {});
        const raw = Array.isArray(data) ? data : Array.isArray(data == null ? void 0 : data.notebooks) ? data.notebooks : [];
        const list = raw.filter((n) => typeof (n == null ? void 0 : n.id) === "string" && typeof (n == null ? void 0 : n.name) === "string" && n.closed !== true && !n.name.startsWith("&nbsp;")).map((n) => ({ id: n.id, name: n.name }));
        return ok(list);
      } catch (err) {
        return toFailureReceipt(err);
      }
    }
    /** 创建库文档（首次引导；UI 层负责先向用户确认）。返回新文档 ID。 */
    async createLibraryDoc(notebookId, title, options = {}) {
      if (!notebookId || !title.trim()) return fail("invalid-input", "notebook/title required");
      const normalizedTitle = title.trim();
      const idempotencyKey = typeof options.idempotencyKey === "string" && options.idempotencyKey.length >= 8 && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
      const receiptKey = idempotencyKey ? `${notebookId}:${idempotencyKey}` : "";
      const key = `library-doc:${notebookId}:${normalizedTitle}`;
      const action = async () => {
        if (receiptKey) {
          const previous = this.libraryDocReceipts.get(receiptKey);
          if (previous) return previous;
        }
        try {
          const docId = parseDocId(await this.kernel.request("createDocWithMd", {
            notebook: notebookId,
            path: "/" + normalizedTitle.replace(/\//g, "-"),
            markdown: `# ${normalizedTitle}

`
          }, { idempotencyKey: idempotencyKey || void 0, maxRetries: 0 }));
          if (!docId) return fail("kernel-error", "createDocWithMd returned no id");
          const receipt = ok({ docId });
          if (receiptKey) this.libraryDocReceipts.set(receiptKey, receipt);
          return receipt;
        } catch (err) {
          return toFailureReceipt(err);
        }
      };
      return this.withWriteLock(key, action);
    }
    /** 列出笔记本根下的一级文档，供首跑校验真实可写落点。 */
    async listNotebookDocs(notebookId) {
      if (!notebookId) return fail("invalid-input", "notebook required");
      try {
        const data = await this.kernel.request("listDocsByPath", { notebook: notebookId, path: "/" });
        const files = Array.isArray(data == null ? void 0 : data.files) ? data.files : [];
        const docs = files.filter((f) => !!f && typeof f.id === "string" && isBlockId(f.id)).map((f) => ({ id: f.id, name: typeof f.name === "string" ? f.name : f.id }));
        return ok(docs);
      } catch (err) {
        return toFailureReceipt(err);
      }
    }
    /** 按关键词搜文档（文档选择器用；ID 从 .sy path 解析，解析失败条目丢弃） */
    async searchDocs(keyword) {
      const k = keyword.trim().slice(0, 96);
      if (!k) return ok([]);
      try {
        return ok(parseDocSearch(await this.kernel.request("searchDocs", { k }, {
          latest: true,
          raceKey: "library.searchDocs"
        })));
      } catch (err) {
        return toFailureReceipt(err);
      }
    }
    /** 当前文档完整路径（{{xlc:path}} 占位符用） */
    async getDocPath(docId) {
      if (!isBlockId(docId)) return "";
      try {
        return parseString(await this.kernel.request("getFullHPathByID", { id: docId }));
      } catch {
        return "";
      }
    }
    /** 追加内容到指定文档（「插入到指定文档」用；官方 appendBlock）。
     * 默认允许用户有意重复插入；调用方可传稳定幂等键保护网络重试/双击。
     * 同一文档的写入串行，避免宿主并发追加时顺序和失败反馈不确定。
     */
    async appendToDoc(markdown, docId, options = {}) {
      if (!markdown.trim()) return false;
      if (!isBlockId(docId)) return false;
      const idempotencyKey = typeof options.idempotencyKey === "string" && options.idempotencyKey.length >= 8 && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
      const receiptKey = idempotencyKey ? `${docId}:${idempotencyKey}` : "";
      if (receiptKey && this.appendReceipts.has(receiptKey)) return true;
      const action = async () => {
        if (receiptKey && this.appendReceipts.has(receiptKey)) return true;
        try {
          await this.kernel.request("appendBlock", {
            data: markdown.slice(0, LIMITS.contentChars),
            dataType: "markdown",
            parentID: docId
          }, { idempotencyKey: idempotencyKey || void 0, maxRetries: 0 });
          if (idempotencyKey) {
            this.appendReceipts.set(receiptKey, true);
            while (this.appendReceipts.size > 256) {
              const oldest = this.appendReceipts.keys().next().value;
              if (!oldest) break;
              this.appendReceipts.delete(oldest);
            }
          }
          return true;
        } catch {
          return false;
        }
      };
      return this.withWriteLock(`append:${docId}`, action);
    }
    /** 整文档导出为 Markdown（「捕获当前文档」用） */
    async exportDocContent(docId) {
      if (!isBlockId(docId)) return fail("invalid-input", "docId invalid");
      try {
        const data = await this.kernel.request("exportMdContent", { id: docId });
        const content = typeof (data == null ? void 0 : data.content) === "string" ? data.content : "";
        if (!content) return fail("not-found", "doc content unavailable");
        return ok({ hPath: typeof (data == null ? void 0 : data.hPath) === "string" ? data.hPath : "", content: content.slice(0, LIMITS.contentChars) });
      } catch (err) {
        return toFailureReceipt(err);
      }
    }
    // ---- 索引构建 ----
    async resolveDocIds(options = {}) {
      var _a, _b, _c, _d, _e, _f;
      const config = this.config;
      if (!config) return { docIds: [], errors: ["no-library"], stopped: false };
      if (config.mode === "notebook") {
        const docIds2 = [];
        const errors2 = [];
        for (const notebookId of config.notebookIds.slice(0, 16)) {
          if ((_a = options.shouldStop) == null ? void 0 : _a.call(options)) return { docIds: docIds2, errors: errors2, stopped: true };
          try {
            const data = await this.kernel.request("listDocsByPath", { notebook: notebookId, path: "/" });
            const files = Array.isArray(data == null ? void 0 : data.files) ? data.files : [];
            for (const f of files) {
              const id = f.id;
              if (typeof id === "string" && isBlockId(id)) docIds2.push(id);
            }
          } catch (err) {
            errors2.push(`notebook ${notebookId}: ${err.message}`);
          }
        }
        return { docIds: docIds2, errors: errors2, stopped: ((_b = options.shouldStop) == null ? void 0 : _b.call(options)) === true };
      }
      if (config.mode === "doc") {
        return { docIds: Array.from(new Set(config.containerDocIds)).slice(0, LIMITS.maxDocs), errors: [], stopped: ((_c = options.shouldStop) == null ? void 0 : _c.call(options)) === true };
      }
      const docIds = [];
      const errors = [];
      const treeCap = LIMITS.maxDocs;
      const queue = [];
      for (const root of config.containerDocIds.slice(0, treeCap)) {
        if ((_d = options.shouldStop) == null ? void 0 : _d.call(options)) return { docIds: Array.from(new Set(docIds)), errors, stopped: true };
        docIds.push(root);
        try {
          const info = await this.kernel.request("getBlockInfo", { id: root });
          const box = typeof (info == null ? void 0 : info.box) === "string" ? info.box : "";
          const path = typeof (info == null ? void 0 : info.path) === "string" ? info.path : "";
          if (box && path) queue.push({ box, path });
        } catch (err) {
          errors.push(`tree ${root}: ${err.message}`);
        }
      }
      const TREE_MAX_DEPTH = 3;
      let depth = 0;
      while (queue.length > 0 && depth < TREE_MAX_DEPTH && docIds.length < treeCap) {
        const level = queue.splice(0, queue.length);
        for (const node of level) {
          if ((_e = options.shouldStop) == null ? void 0 : _e.call(options)) return { docIds: Array.from(new Set(docIds)), errors, stopped: true };
          if (docIds.length >= treeCap) break;
          try {
            const data = await this.kernel.request("listDocsByPath", { notebook: node.box, path: node.path });
            const files = Array.isArray(data == null ? void 0 : data.files) ? data.files : [];
            for (const f of files) {
              if (docIds.length >= treeCap) {
                errors.push("tree truncated: document count reached cap");
                break;
              }
              const id = f.id;
              const childPath = f.path;
              if (typeof id === "string" && isBlockId(id)) {
                docIds.push(id);
                if (typeof childPath === "string" && childPath) queue.push({ box: node.box, path: childPath });
              }
            }
          } catch (err) {
            errors.push(`tree ${node.path}: ${err.message}`);
          }
        }
        depth++;
      }
      return { docIds: Array.from(new Set(docIds)), errors, stopped: ((_f = options.shouldStop) == null ? void 0 : _f.call(options)) === true };
    }
    async buildIndex(maxItems = LIMITS.maxItems, options = {}) {
      var _a, _b, _c, _d;
      const resolved = await this.resolveDocIds(options);
      const { docIds, errors } = resolved;
      const items = /* @__PURE__ */ new Map();
      const entries = [];
      const searchEntryById = /* @__PURE__ */ new Map();
      const referenceItems = [];
      let stopped = resolved.stopped;
      let truncated = stopped;
      let docsScanned = 0;
      const perDoc = docIds.map(() => []);
      let cursor = 0;
      const workerCount = Math.min(4, Math.max(1, docIds.length));
      const worker = async () => {
        var _a2, _b2;
        while (cursor < docIds.length) {
          if ((_a2 = options.shouldStop) == null ? void 0 : _a2.call(options)) {
            stopped = true;
            truncated = true;
            return;
          }
          const index = cursor++;
          const docId = docIds[index];
          docsScanned++;
          let children;
          try {
            children = parseChildBlocks(await this.kernel.request("getChildBlocks", { id: docId }));
          } catch (err) {
            errors.push(`doc ${docId}: ${err.message}`);
            continue;
          }
          if ((_b2 = options.shouldStop) == null ? void 0 : _b2.call(options)) {
            stopped = true;
            truncated = true;
            return;
          }
          if (children.length === 0) continue;
          let attrsByBlock = {};
          try {
            attrsByBlock = parseBatchAttrs(await this.kernel.request("batchGetBlockAttrs", {
              ids: children.map((c) => c.id)
            }));
          } catch (err) {
            errors.push(`attrs ${docId}: ${err.message}`);
            continue;
          }
          perDoc[index] = children.map((child) => {
            var _a3;
            return { child, attrs: (_a3 = attrsByBlock[child.id]) != null ? _a3 : {} };
          });
        }
      };
      if (!stopped) await Promise.all(Array.from({ length: workerCount }, () => worker()));
      outer: for (let d = 0; d < perDoc.length && !stopped; d++) {
        for (const { child, attrs } of (_a = perDoc[d]) != null ? _a : []) {
          if ((_b = options.shouldStop) == null ? void 0 : _b.call(options)) {
            stopped = true;
            truncated = true;
            break outer;
          }
          if (items.size >= maxItems) {
            truncated = true;
            break outer;
          }
          if (!attrs[ATTR.id]) continue;
          let kramdown = "";
          try {
            const body = parseKramdown(await this.kernel.request("getBlockKramdown", { id: child.id }));
            kramdown = (_c = body == null ? void 0 : body.kramdown) != null ? _c : "";
          } catch (err) {
            errors.push(`block ${child.id}: ${err.message}`);
          }
          if ((_d = options.shouldStop) == null ? void 0 : _d.call(options)) {
            stopped = true;
            truncated = true;
            break outer;
          }
          const item = normalizeCommonItem({
            blockId: child.id,
            libraryDocId: docIds[d],
            attrs,
            blockType: child.type,
            subtype: child.subtype,
            kramdown
          });
          if (!item) continue;
          const targetBlockId = resolveBlockRefTarget(item);
          if (item.itemType === "blockref") {
            item.summary = "";
            item.varCount = 0;
            if (targetBlockId && targetBlockId !== child.id) referenceItems.push(item);
          }
          const searchEntry = toSearchEntry(item);
          const adapter = getPinyinAdapter();
          if (adapter.capabilities.initials) {
            const anno = adapter.annotate({ title: item.title, alias: item.alias });
            if (anno) {
              searchEntry.py = anno.py;
              searchEntry.pyi = anno.pyi;
            }
          }
          items.set(item.id, item);
          entries.push(searchEntry);
          searchEntryById.set(item.id, searchEntry);
        }
      }
      const referenceTargetIds = Array.from(new Set(referenceItems.map(resolveBlockRefTarget).filter(Boolean)));
      if (referenceTargetIds.length) {
        try {
          const raw = await this.kernel.request("getBlockKramdowns", { ids: referenceTargetIds, mode: "md" });
          const bodies = parseBatchKramdowns(raw);
          let missing = 0;
          for (const item of referenceItems) {
            const body = bodies[resolveBlockRefTarget(item)];
            if (typeof body !== "string") {
              missing++;
              continue;
            }
            item.summary = deriveSummary(body);
            item.varCount = countAskFields(body);
            const entry = searchEntryById.get(item.id);
            if (entry) {
              entry.summary = item.summary;
              entry.varCount = item.varCount;
            }
          }
          if (missing) errors.push(`blockref targets unavailable: ${missing}`);
        } catch (err) {
          errors.push(`blockref targets: ${err.message}`);
        }
      }
      return { entries, items, truncated, ...stopped ? { stopped: true } : {}, docsScanned, errors, builtAt: Date.now() };
    }
    // ---- 单条目读取 ----
    async getItem(itemId) {
      const idx = await this.ensureIndex();
      const known = idx.items.get(itemId);
      if (!known) return fail("not-found", `item ${itemId} not in index`);
      const refreshed = await this.loadItemByBlockId(known.blockId, known.libraryDocId);
      if (!refreshed) return fail("not-found", `block ${known.blockId} no longer carries item attrs`);
      return ok(refreshed);
    }
    async getItemByBlockId(blockId, libraryDocId) {
      return this.loadItemByBlockId(blockId, libraryDocId);
    }
    async loadItemByBlockId(blockId, libraryDocId) {
      let attrs;
      try {
        attrs = parseAttrs(await this.kernel.request("getBlockAttrs", { id: blockId }));
      } catch {
        return null;
      }
      return normalizeCommonItem({ blockId, libraryDocId, attrs });
    }
    /** 现场取条目内容（kramdown）。禁止用索引摘要充当正文。 */
    /** F5 片段嵌套：展开 {{xlc:snippet:标题}} 引用（插入语义；ask 变量保留给填充卡）。
     *  深度 ≤3；按条目标题精确匹配（重名取索引首个）；已见条目不重复展开（防环，兄弟引用允许）；
     *  标题缺失 / 成环 / 超深 → 替换为 __片段：标题__（可见可改，不静默丢）。 */
    /** F5 片段嵌套：展开 {{xlc:snippet:标题}} 引用（插入语义；ask 变量保留给填充卡）。
     *  maxDepth = 引用层数上限（默认 3）；按条目标题精确匹配（重名取索引首个）；
     *  已见条目不重复展开（防环，兄弟引用允许）；标题缺失 / 成环 / 超出层数 →
     *  替换为 __片段：标题__（可见可改，不静默丢）。 */
    async expandSnippetRefs(text, opts) {
      var _a;
      const maxDepth = (_a = opts == null ? void 0 : opts.maxDepth) != null ? _a : 3;
      if (!text || !text.includes("{{xlc:snippet:")) return text;
      const idx = await this.ensureIndex();
      const byTitle = /* @__PURE__ */ new Map();
      for (const item of idx.items.values()) {
        if (item.title && !byTitle.has(item.title)) byTitle.set(item.title, item);
      }
      const expand = async (input, level, seen) => {
        var _a2;
        if (!input || !input.includes("{{xlc:snippet:")) return input;
        let out = input;
        for (const match of input.matchAll(SNIPPET_PATTERN)) {
          const token = match[0];
          const title = ((_a2 = match[1]) != null ? _a2 : "").trim().slice(0, LIMITS.title);
          const marker = `__\u7247\u6BB5\uFF1A${title || "?"}__`;
          let replacement = marker;
          if (level <= maxDepth) {
            const target = title ? byTitle.get(title) : void 0;
            if (target && !seen.has(target.id)) {
              seen.add(target.id);
              try {
                const kd = await this.getItemKramdown(target);
                if (kd.ok) {
                  replacement = await expand(kd.data, level + 1, seen);
                }
              } finally {
                seen.delete(target.id);
              }
            }
          }
          out = out.split(token).join(replacement);
        }
        return out;
      };
      return expand(text, 1, /* @__PURE__ */ new Set());
    }
    /** 读取条目在专用库中的物理正文（编辑、导出、撤销恢复使用）。 */
    async getStoredItemKramdown(item) {
      try {
        const data = parseKramdown(await this.kernel.request("getBlockKramdown", { id: item.blockId }));
        if (!data) return fail("not-found", `block ${item.blockId} kramdown unavailable`);
        return ok(data.kramdown);
      } catch (err) {
        return toFailureReceipt(err);
      }
    }
    /** 读取条目当前有效正文；引用入口永远跟随目标源块，不读取 marker。 */
    async getItemKramdown(item) {
      if (item.itemType !== "blockref") return this.getStoredItemKramdown(item);
      const target = resolveBlockRefTarget(item);
      if (!target) return fail("invalid-input", "blockref target is missing or invalid");
      try {
        const data = parseKramdown(await this.kernel.request("getBlockKramdown", { id: target }));
        if (!data) return fail("not-found", `target block ${target} kramdown unavailable`);
        return ok(normalizeKramdownIal(data.kramdown));
      } catch (err) {
        return toFailureReceipt(err);
      }
    }
    // ---- 失效检测 ----
    /** 来源块 / 来源文档 / 资源三态检测。检查失败时如实返回 unknown=false 侧并附错误。 */
    async checkSourceHealth(item) {
      var _a, _b;
      const health = { blockMissing: false, docMissing: false, assetMissing: false };
      try {
        const docCandidate = item.source.sourceDocId || "";
        const blockCandidate = item.itemType === "blockref" ? resolveBlockRefTarget(item) : item.source.sourceBlockId || "";
        const ids = [docCandidate, blockCandidate].filter((id) => isBlockId(id));
        if (ids.length > 0) {
          const existMap = parseExistingMap(await this.kernel.request("checkBlocksExist", { ids }));
          if (docCandidate && existMap[docCandidate] === false) health.docMissing = true;
          if (blockCandidate && existMap[blockCandidate] === false) health.blockMissing = true;
        }
        if (item.itemType === "image" || item.itemType === "asset") {
          const kramdown = await this.getItemKramdown(item);
          if (kramdown.ok) {
            const path = (_b = (_a = kramdown.data.match(/\]\((assets\/[^)\s]+)[^)]*\)/)) == null ? void 0 : _a[1]) != null ? _b : "";
            if (!path) {
              health.assetMissing = true;
            } else if (this.options.probeAsset) {
              try {
                health.assetMissing = !await this.options.probeAsset(path);
              } catch {
                health.assetMissing = true;
              }
            } else {
              health.assetMissing = false;
            }
          }
        }
        return ok(health);
      } catch (err) {
        return toFailureReceipt(err);
      }
    }
    // ---- CRUD ----
    async createItem(input, libraryDocId, options = {}) {
      const logicalKey = typeof input.logicalId === "string" && isLogicalId(input.logicalId) ? `item:${input.logicalId}` : "";
      const idempotencyKey = typeof options.idempotencyKey === "string" && options.idempotencyKey.length >= 8 && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
      if (idempotencyKey) {
        const previous = this.idempotencyReceipts.get(idempotencyKey);
        if (previous) return previous;
      }
      const key = idempotencyKey ? `idempotency:${idempotencyKey}` : logicalKey;
      const action = async () => {
        if (idempotencyKey) {
          const completed = this.idempotencyReceipts.get(idempotencyKey);
          if (completed) return completed;
        }
        const receipt = await this.createItemUnlocked(input, libraryDocId, options);
        if (idempotencyKey && receipt.ok) {
          this.rememberReceipt(this.idempotencyReceipts, idempotencyKey, receipt);
        }
        return receipt;
      };
      return key ? this.withWriteLock(key, action) : action();
    }
    async createItemUnlocked(input, libraryDocId, options = {}) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      const targetDoc = libraryDocId != null ? libraryDocId : await this.resolveWriteDoc();
      if (!targetDoc || !isBlockId(targetDoc)) return fail("invalid-input", "no library doc");
      const now = Date.now();
      let logicalId = (_a = input.logicalId) != null ? _a : newLogicalId(now);
      if (!/^xlc-[0-9a-z]{10,40}$/.test(logicalId)) logicalId = newLogicalId(now);
      if (this.createdLogicalIds.has(logicalId) || ((_b = this.index) == null ? void 0 : _b.items.has(logicalId))) {
        return fail("conflict", `logical id already exists: ${logicalId}`);
      }
      const attrs = {
        [ATTR.id]: logicalId,
        [ATTR.type]: input.itemType,
        [ATTR.created]: String(now),
        [ATTR.updated]: String(now)
      };
      if (input.title) attrs[ATTR.title] = input.title.slice(0, LIMITS.title);
      if (input.alias) attrs[ATTR.alias] = input.alias.slice(0, LIMITS.alias);
      if ((_c = input.tags) == null ? void 0 : _c.length) attrs[ATTR.tags] = input.tags.slice(0, LIMITS.tags).join(",");
      if (input.category) attrs[ATTR.category] = input.category.slice(0, LIMITS.category);
      if (input.url) {
        if (!isSafeHttpUrl(input.url)) return fail("invalid-input", "url must use http or https");
        attrs[ATTR.url] = input.url.trim().slice(0, 2048);
      }
      if (input.targetBlockId && isBlockId(input.targetBlockId)) attrs[ATTR.target] = input.targetBlockId;
      if (((_d = input.source) == null ? void 0 : _d.sourceDocId) && isBlockId(input.source.sourceDocId)) attrs[ATTR.srcDoc] = input.source.sourceDocId;
      if (((_e = input.source) == null ? void 0 : _e.sourceBlockId) && isBlockId(input.source.sourceBlockId)) attrs[ATTR.srcBlock] = input.source.sourceBlockId;
      if (((_f = input.source) == null ? void 0 : _f.sourceType) && isSourceType(input.source.sourceType)) attrs[ATTR.srcType] = input.source.sourceType;
      const varCount = input.itemType === "code" ? 0 : countAskFields(input.markdown);
      if (varCount > 0) attrs[ATTR.vars] = String(Math.min(varCount, LIMITS.maxAskFields));
      let insertResp;
      try {
        insertResp = await this.kernel.request("appendBlock", {
          data: input.markdown.slice(0, LIMITS.contentChars),
          dataType: "markdown",
          parentID: targetDoc
        }, { idempotencyKey: options.idempotencyKey, maxRetries: 0 });
      } catch (err) {
        return toFailureReceipt(err);
      }
      const ops = Array.isArray(insertResp) ? insertResp : [];
      const newBlockId = (_i = (_h = (_g = ops[0]) == null ? void 0 : _g.doOperations) == null ? void 0 : _h[0]) == null ? void 0 : _i.id;
      if (typeof newBlockId !== "string" || !isBlockId(newBlockId)) {
        return fail("kernel-error", "appendBlock returned no block id");
      }
      try {
        await this.kernel.request("setBlockAttrs", { id: newBlockId, attrs });
      } catch (err) {
        try {
          await this.kernel.request("deleteBlock", { id: newBlockId });
        } catch {
          return fail("kernel-error", `attrs write failed AND rollback failed; orphan block ${newBlockId}`);
        }
        return toFailureReceipt(err);
      }
      const item = normalizeCommonItem({
        blockId: newBlockId,
        libraryDocId: targetDoc,
        attrs,
        blockType: input.itemType === "code" ? "c" : input.itemType === "structure" ? "super" : "p"
      });
      if (!item) return fail("kernel-error", "created item failed normalization");
      this.createdLogicalIds.add(logicalId);
      if (typeof options.batchToken === "string" && options.batchToken.length >= 16 && options.batchToken.length <= 128) {
        this.conditionalDeleteGrants.set(item, {
          batchToken: options.batchToken,
          item: { ...item, tags: [...item.tags], source: { ...item.source }, droppedFields: [...item.droppedFields] },
          attrs: { ...attrs },
          markdown: input.markdown.slice(0, LIMITS.contentChars)
        });
      }
      this.invalidateIndex();
      this.notifyItemsChanged([item.id]);
      return ok({ item });
    }
    async resolveWriteDoc() {
      const config = this.config;
      if (!config) return void 0;
      if (config.mode !== "notebook") return config.containerDocIds[0];
      if (this.writeDocCache && this.writeDocCache.gen === this.indexGen) return this.writeDocCache.docId;
      let resolved;
      for (const notebookId of config.notebookIds.slice(0, 16)) {
        try {
          const data = await this.kernel.request("listDocsByPath", { notebook: notebookId, path: "/" });
          const files = Array.isArray(data == null ? void 0 : data.files) ? data.files : [];
          const first = files.find((f) => typeof (f == null ? void 0 : f.id) === "string" && isBlockId(f.id));
          if (first && typeof first.id === "string") {
            resolved = first.id;
            break;
          }
        } catch {
        }
      }
      this.writeDocCache = { gen: this.indexGen, docId: resolved };
      return resolved;
    }
    async updateItem(itemId, patch, options = {}) {
      const idempotencyKey = options.idempotencyKey && options.idempotencyKey.length >= 8 && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
      const receiptKey = idempotencyKey ? `${itemId}:${idempotencyKey}` : "";
      const key = receiptKey ? `idempotency:${receiptKey}` : `item:${itemId}`;
      const action = async () => {
        if (receiptKey) {
          const previous = this.updateReceipts.get(receiptKey);
          if (previous) return previous;
        }
        const receipt = await this.updateItemUnlocked(itemId, patch, options);
        if (receiptKey && receipt.ok) this.rememberReceipt(this.updateReceipts, receiptKey, receipt);
        return receipt;
      };
      return this.withWriteLock(key, action);
    }
    async updateItemUnlocked(itemId, patch, options = {}) {
      var _a;
      const got = await this.getItem(itemId);
      if (!got.ok) return { ok: false, reason: got.reason, message: got.message };
      const item = got.data;
      const attrs = {
        [ATTR.updated]: String(Date.now())
      };
      if (patch.title !== void 0) attrs[ATTR.title] = patch.title.slice(0, LIMITS.title);
      if (patch.alias !== void 0) attrs[ATTR.alias] = patch.alias.slice(0, LIMITS.alias);
      if (patch.tags !== void 0) attrs[ATTR.tags] = patch.tags.slice(0, LIMITS.tags).join(",");
      if (patch.category !== void 0) attrs[ATTR.category] = patch.category.slice(0, LIMITS.category);
      if (patch.url !== void 0) {
        if (patch.url && !isSafeHttpUrl(patch.url)) return fail("invalid-input", "url must use http or https");
        attrs[ATTR.url] = patch.url.trim().slice(0, 2048);
      }
      if (patch.targetBlockId !== void 0) {
        if (patch.targetBlockId && !isBlockId(patch.targetBlockId)) return fail("invalid-input", "targetBlockId invalid");
        attrs[ATTR.target] = patch.targetBlockId;
      }
      if (typeof patch.markdown === "string" && patch.markdown) {
        const varCount = item.itemType === "code" ? 0 : countAskFields(patch.markdown);
        attrs[ATTR.vars] = varCount > 0 ? String(Math.min(varCount, LIMITS.maxAskFields)) : "";
      }
      let oldAttrs = null;
      let oldMarkdown;
      try {
        oldAttrs = parseAttrs(await this.kernel.request("getBlockAttrs", { id: item.blockId }));
        if (typeof patch.markdown === "string" && patch.markdown) {
          oldMarkdown = (_a = parseKramdown(await this.kernel.request("getBlockKramdown", { id: item.blockId }))) == null ? void 0 : _a.kramdown;
        }
        await this.kernel.request("setBlockAttrs", { id: item.blockId, attrs }, { idempotencyKey: options.idempotencyKey, maxRetries: 0 });
        if (typeof patch.markdown === "string" && patch.markdown) {
          await this.kernel.request("updateBlock", {
            data: patch.markdown.slice(0, LIMITS.contentChars),
            dataType: "markdown",
            id: item.blockId
          }, { idempotencyKey: options.idempotencyKey ? `${options.idempotencyKey}:body` : void 0, maxRetries: 0 });
        }
      } catch (err) {
        let rollbackFailed = false;
        if (oldAttrs) {
          try {
            await this.kernel.request("setBlockAttrs", { id: item.blockId, attrs: oldAttrs }, { maxRetries: 0 });
          } catch {
            rollbackFailed = true;
          }
        }
        if (oldMarkdown !== void 0) {
          try {
            await this.kernel.request("updateBlock", { data: oldMarkdown, dataType: "markdown", id: item.blockId }, { maxRetries: 0 });
          } catch {
            rollbackFailed = true;
          }
        }
        if (rollbackFailed) {
          return fail("kernel-error", `${(err == null ? void 0 : err.message) || String(err)}; rollback failed and item state may be partially updated`);
        }
        return toFailureReceipt(err);
      }
      this.invalidateIndex();
      this.notifyItemsChanged([itemId]);
      const refreshed = await this.getItem(itemId);
      return refreshed.ok ? ok({ item: refreshed.data }) : { ok: false, reason: refreshed.reason, message: refreshed.message };
    }
    async removeItem(itemId, options = {}) {
      const idempotencyKey = options.idempotencyKey && options.idempotencyKey.length >= 8 && options.idempotencyKey.length <= 128 ? options.idempotencyKey : "";
      const receiptKey = idempotencyKey ? `${itemId}:${idempotencyKey}` : "";
      const key = receiptKey ? `idempotency:${receiptKey}` : `item:${itemId}`;
      const action = async () => {
        if (receiptKey) {
          const previous = this.removeReceipts.get(receiptKey);
          if (previous) return previous;
        }
        const receipt = await this.removeItemUnlocked(itemId, options);
        if (receiptKey && receipt.ok) this.rememberReceipt(this.removeReceipts, receiptKey, receipt);
        return receipt;
      };
      return this.withWriteLock(key, action);
    }
    async removeItemUnlocked(itemId, options = {}) {
      const got = await this.getItem(itemId);
      if (!got.ok) return got;
      try {
        await this.kernel.request("deleteBlock", { id: got.data.blockId }, { idempotencyKey: options.idempotencyKey, maxRetries: 0 });
      } catch (err) {
        return toFailureReceipt(err);
      }
      this.createdLogicalIds.delete(got.data.id);
      this.invalidateIndex();
      this.notifyItemsChanged([got.data.id]);
      return ok({ blockId: got.data.blockId });
    }
    /**
     * Undo only blocks that still match the exact item snapshot created by discovery.
     * The fresh index proves the block remains inside the configured library; live attributes
     * and body are read twice immediately before deletion to avoid removing later edits.
     */
    async removeItemsIfUnchanged(batchToken, inputs) {
      return this.withWriteLock(`batch:${batchToken}`, () => this.removeItemsIfUnchangedUnlocked(batchToken, inputs));
    }
    async removeItemsIfUnchangedUnlocked(batchToken, inputs) {
      var _a, _b, _c, _d;
      if (typeof batchToken !== "string" || batchToken.length < 16 || batchToken.length > 128 || !Array.isArray(inputs) || inputs.length > LIMITS.maxItems) {
        return fail("invalid-input", "conditional delete batch exceeds the supported limit");
      }
      const unique = /* @__PURE__ */ new Set();
      for (const input of inputs) {
        if (!input || !input.item || !isLogicalId(input.item.id) || !isBlockId(input.item.blockId) || !isBlockId(input.item.libraryDocId) || typeof input.markdown !== "string") {
          return fail("invalid-input", "conditional delete batch contains an invalid item");
        }
        const grant = this.conditionalDeleteGrants.get(input.item);
        if (!grant || grant.batchToken !== batchToken || !sameManagedItem(input.item, grant.item) || normalizeConditionalMarkdown(input.markdown) !== normalizeConditionalMarkdown(grant.markdown)) {
          return fail("invalid-input", "conditional delete item was not created in this batch");
        }
        if (unique.has(input.item.id) || unique.has(input.item.blockId)) {
          return fail("invalid-input", "conditional delete batch contains duplicate item identities");
        }
        unique.add(input.item.id);
        unique.add(input.item.blockId);
      }
      if (inputs.length === 0) return ok([]);
      let index;
      try {
        index = await this.reindex();
      } catch (err) {
        return toFailureReceipt(err);
      }
      if (index.truncated || index.errors.length > 0) {
        return ok(inputs.map(({ item }) => ({
          status: "skipped",
          itemId: item.id,
          blockId: item.blockId,
          reason: "library-unverified"
        })));
      }
      const outcomes = [];
      let deletedAny = false;
      for (const input of inputs) {
        const { item, markdown } = input;
        const indexed = index.items.get(item.id);
        if (!indexed) {
          outcomes.push({ status: "skipped", itemId: item.id, blockId: item.blockId, reason: "not-found" });
          continue;
        }
        if (indexed.blockId !== item.blockId || indexed.libraryDocId !== item.libraryDocId) {
          outcomes.push({ status: "skipped", itemId: item.id, blockId: item.blockId, reason: "identity-changed" });
          continue;
        }
        try {
          const first = await this.readConditionalDeleteState(item);
          if (!first) {
            outcomes.push({ status: "skipped", itemId: item.id, blockId: item.blockId, reason: "identity-changed" });
            continue;
          }
          if (!sameManagedItem(first.item, item) || !sameCustomAttrs(first.attrs, (_b = (_a = this.conditionalDeleteGrants.get(item)) == null ? void 0 : _a.attrs) != null ? _b : {}) || normalizeConditionalMarkdown(first.markdown) !== normalizeConditionalMarkdown(markdown)) {
            outcomes.push({ status: "skipped", itemId: item.id, blockId: item.blockId, reason: "edited" });
            continue;
          }
          const second = await this.readConditionalDeleteState(item);
          if (!second) {
            outcomes.push({ status: "skipped", itemId: item.id, blockId: item.blockId, reason: "identity-changed" });
            continue;
          }
          if (!sameManagedItem(second.item, item) || !sameCustomAttrs(second.attrs, (_d = (_c = this.conditionalDeleteGrants.get(item)) == null ? void 0 : _c.attrs) != null ? _d : {}) || normalizeConditionalMarkdown(second.markdown) !== normalizeConditionalMarkdown(markdown)) {
            outcomes.push({ status: "skipped", itemId: item.id, blockId: item.blockId, reason: "edited" });
            continue;
          }
          await this.kernel.request("deleteBlock", { id: item.blockId });
          deletedAny = true;
          this.conditionalDeleteGrants.delete(item);
          outcomes.push({ status: "deleted", itemId: item.id, blockId: item.blockId });
        } catch (err) {
          outcomes.push({
            status: "failed",
            itemId: item.id,
            blockId: item.blockId,
            message: (err == null ? void 0 : err.message) || String(err)
          });
        }
      }
      if (deletedAny) {
        this.invalidateIndex();
        this.notifyItemsChanged(outcomes.filter((outcome) => outcome.status === "deleted").map((outcome) => outcome.itemId));
      }
      return ok(outcomes);
    }
    async readConditionalDeleteState(expected) {
      const attrs = parseAttrs(await this.kernel.request("getBlockAttrs", { id: expected.blockId }));
      const body = parseKramdown(await this.kernel.request("getBlockKramdown", { id: expected.blockId }));
      if (!body || body.id !== expected.blockId) return null;
      const item = normalizeCommonItem({
        blockId: expected.blockId,
        libraryDocId: expected.libraryDocId,
        attrs,
        kramdown: body.kramdown
      });
      return item ? { item, attrs, markdown: body.kramdown } : null;
    }
    /** 清除来源引用（用户显式操作；空串删除自定义属性，条目本体不受影响） */
    async clearSource(itemId) {
      return this.withWriteLock(`item:${itemId}`, () => this.clearSourceUnlocked(itemId));
    }
    async clearSourceUnlocked(itemId) {
      const got = await this.getItem(itemId);
      if (!got.ok) return { ok: false, reason: got.reason, message: got.message };
      try {
        await this.kernel.request("setBlockAttrs", {
          id: got.data.blockId,
          attrs: { [ATTR.srcDoc]: "", [ATTR.srcBlock]: "" }
        });
      } catch (err) {
        return toFailureReceipt(err);
      }
      this.invalidateIndex();
      this.notifyItemsChanged([itemId]);
      const refreshed = await this.getItem(itemId);
      return refreshed.ok ? ok({ item: refreshed.data }) : { ok: false, reason: refreshed.reason, message: refreshed.message };
    }
    /** 恢复来源：把指定文档/块设为条目新来源（用户显式操作，非自动改写）。
     *  未提供 sourceBlockId 时显式清空旧块引用（防止残留指向旧位置的失效 src-block）。 */
    async relinkSource(itemId, source) {
      return this.withWriteLock(`item:${itemId}`, () => this.relinkSourceUnlocked(itemId, source));
    }
    async relinkSourceUnlocked(itemId, source) {
      if (!isBlockId(source.sourceDocId)) return fail("invalid-input", "sourceDocId invalid");
      const got = await this.getItem(itemId);
      if (!got.ok) return { ok: false, reason: got.reason, message: got.message };
      const attrs = {
        [ATTR.srcDoc]: source.sourceDocId,
        // 显式置空：思源空串删属性语义；避免旧 src-block 残留指向错误位置
        [ATTR.srcBlock]: source.sourceBlockId && isBlockId(source.sourceBlockId) ? source.sourceBlockId : "",
        [ATTR.updated]: String(Date.now())
      };
      try {
        await this.kernel.request("setBlockAttrs", { id: got.data.blockId, attrs });
      } catch (err) {
        return toFailureReceipt(err);
      }
      this.invalidateIndex();
      this.notifyItemsChanged([itemId]);
      const refreshed = await this.getItem(itemId);
      return refreshed.ok ? ok({ item: refreshed.data }) : { ok: false, reason: refreshed.reason, message: refreshed.message };
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
  var LARGE_ENTRIES = Array.from({ length: 100 }, (_, index) => {
    const base = ENTRIES[index % ENTRIES.length];
    return {
      ...base,
      id: `xlc-window-${String(index + 1).padStart(3, "0")}`,
      blockId: `2024010113${String(index).padStart(4, "0")}-window`,
      title: `\u7A97\u53E3\u6D4B\u8BD5\u6761\u76EE ${String(index + 1).padStart(3, "0")}`,
      alias: "",
      category: "",
      summary: `\u7528\u4E8E\u865A\u62DF\u5217\u8868\u952E\u76D8\u56DE\u5F52\u7684\u7B2C ${index + 1} \u6761\u7ED3\u679C`,
      sourceBlockId: `2024010114${String(index).padStart(4, "0")}-window`,
      varCount: 0
    };
  });
  var discoveryController = null;
  var captureCreatedItems = [];
  var captureAiTidyCalls = [];
  var captureAiDraftCalls = [];
  var deferredTidyResponse = null;
  var lastSearchDialog = null;
  var savedDiscoveryViews = [];
  var T = (key, ...args) => {
    var _a;
    const map = {
      pluginName: "\u5C0F\u9A74\u5E38\u7528\uFF08\u5185\u6D4B\u7248\uFF09",
      settingsIntro: "\u7BA1\u7406\u5185\u5BB9\u5E93\u3001\u590D\u7528\u504F\u597D\u548C\u6570\u636E\u3002\u5E93\u5185\u5185\u5BB9\u4F1A\u4FDD\u7559\u5728\u601D\u6E90\u6587\u6863\u4E2D\uFF0C\u5E76\u53EF\u7EE7\u7EED\u7F16\u8F91\u3002",
      captureIntro: "\u5148\u653E\u5165\u60F3\u8981\u590D\u7528\u7684\u5185\u5BB9\uFF0C\u518D\u8865\u5145\u6807\u9898\u548C\u5206\u7C7B\uFF0C\u4E4B\u540E\u53EF\u4EE5\u66F4\u5FEB\u627E\u5230\u5B83\u3002",
      discoveryTitle: "\u4ECE\u5F53\u524D\u6587\u6863\u53D1\u73B0",
      discoveryTitleNotebook: "\u4ECE\u5F53\u524D\u7B14\u8BB0\u672C\u53D1\u73B0",
      discoveryTitleGeneral: "\u53D1\u73B0\u5DF2\u6709\u5185\u5BB9",
      discoveryTitleTree: "\u4ECE\u6B64\u6587\u6863\u53D1\u73B0\u5E38\u7528\u8BED",
      discoveryScope: "\u626B\u63CF\u8303\u56F4",
      discoveryScopeDocument: "\u5F53\u524D\u6587\u6863",
      discoveryScopeNotebook: "\u5F53\u524D\u7B14\u8BB0\u672C",
      discoveryScopeTree: "\u6307\u5B9A\u6587\u6863\u6811",
      discoveryScopeSelectedNotebook: "\u6307\u5B9A\u7B14\u8BB0\u672C",
      discoveryScopeAllNotebooks: "\u5168\u90E8\u7B14\u8BB0\u672C\uFF08\u9AD8\u7EA7\uFF09",
      discoveryScopeTreeHint: "\u626B\u63CF\u6240\u9009\u6839\u6587\u6863\u53CA\u5176\u4E0B\u7EA7\u6587\u6863\u9876\u5C42\u5757\uFF1B\u786E\u8BA4\u540E\u52A0\u5165\u5E38\u7528\u5E93\uFF1B\u6E90\u6587\u6863\u4E0D\u53D8\uFF0C\u52A0\u5165\u65B9\u5F0F\u89C1\u4E0B\u65B9\u3002",
      discoveryScopeSelectedNotebookHint: "\u626B\u63CF\u6240\u9009\u7B14\u8BB0\u672C\u7684\u6587\u6863\u9876\u5C42\u5757\uFF1B\u786E\u8BA4\u540E\u52A0\u5165\u5E38\u7528\u5E93\uFF1B\u6E90\u6587\u6863\u4E0D\u53D8\uFF0C\u52A0\u5165\u65B9\u5F0F\u89C1\u4E0B\u65B9\u3002",
      discoverySelectTree: "\u8F93\u5165\u5173\u952E\u8BCD\u67E5\u627E\u6587\u6863\u6811\u6839\u6587\u6863",
      discoverySelectNotebook: "\u9009\u62E9\u8981\u626B\u63CF\u7684\u7B14\u8BB0\u672C",
      discoverySearch: "\u641C\u7D22",
      discoveryFromTreeMenu: "\u4ECE\u6B64\u6587\u6863\u53D1\u73B0\u5E38\u7528\u8BED",
      discoverySelectTreeRoot: "\u8BF7\u9009\u62E9\u6587\u6863\u6811\u6839\u6587\u6863",
      discoverySearchingDocs: "\u6B63\u5728\u641C\u7D22\u6587\u6863\u2026",
      discoveryNoDocsFound: "\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u6587\u6863",
      discoveryNoNotebooks: "\u5F53\u524D\u6CA1\u6709\u53EF\u626B\u63CF\u7684\u7B14\u8BB0\u672C",
      discoveryNotebookLoading: "\u6B63\u5728\u8BFB\u53D6\u7B14\u8BB0\u672C\u5217\u8868\u2026",
      discoveryRetryNotebooks: "\u91CD\u8BD5\u52A0\u8F7D\u7B14\u8BB0\u672C",
      discoveryAllWarning: "\u4E0A\u9650\uFF1A%s \u4E2A\u7B14\u8BB0\u672C\u3001%s \u7BC7\u6587\u6863\u3001%s \u5C42\u76EE\u5F55\u3001%s \u4E2A\u5757\u3001%s \u4E2A\u5019\u9009\u3001\u5355\u5757 %s \u5B57\u7B26\u3001\u5019\u9009\u6587\u672C\u7D2F\u8BA1 %s \u5B57\u7B26\u3001%s \u79D2\u3002\u6587\u6863\u548C\u5757\u6309\u987A\u5E8F\u8BFB\u53D6\uFF1B\u8DEF\u5F84\u67E5\u8BE2\u4E0E\u91CD\u590D\u6838\u9A8C\u6700\u591A 4 \u8DEF\u5E76\u53D1\u3002\u53EA\u8BFB\u626B\u63CF\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u6536\u5F55\u3002",
      discoveryConfirmAll: "\u6211\u786E\u8BA4\u5F00\u59CB\u626B\u63CF\u6240\u6709\u53EF\u641C\u7D22\u7B14\u8BB0\u672C",
      discoveryTargetRequired: "\u8BF7\u5148\u9009\u62E9\u6216\u786E\u8BA4\u626B\u63CF\u76EE\u6807",
      discoverySearchFailed: "\u6587\u6863\u641C\u7D22\u5931\u8D25\uFF1A%s",
      discoveryNotebookLoadFailed: "\u7B14\u8BB0\u672C\u5217\u8868\u52A0\u8F7D\u5931\u8D25\uFF1A%s",
      discoveryErrors: "\u626B\u63CF\u6216\u5185\u5BB9\u5E93\u91CD\u590D\u6838\u9A8C\u5931\u8D25 %s \u5904\uFF0C\u5DF2\u4FDD\u7559\u5176\u4ED6\u7ED3\u679C",
      discoverySkippedLong: "\u8DF3\u8FC7\u8D85\u957F\u5757 %s \u4E2A",
      discoveryLimitScope: "\u8303\u56F4/\u6DF1\u5EA6\u4E0A\u9650",
      discoveryLimitNotebooks: "\u7B14\u8BB0\u672C\u6570\u4E0A\u9650",
      discoveryLimitDocuments: "\u6587\u6863\u6570\u4E0A\u9650",
      discoveryLimitBlocks: "\u5757\u6570\u4E0A\u9650",
      discoveryLimitCandidates: "\u5019\u9009\u6570\u4E0A\u9650",
      discoveryLimitCharacters: "\u6587\u672C\u5B57\u7B26\u4E0A\u9650",
      discoveryLimitTime: "\u626B\u63CF\u65F6\u95F4\u4E0A\u9650",
      discoveryResultsPage: "\u7B2C %s / %s \u9875",
      discoveryPreviousPage: "\u4E0A\u4E00\u9875",
      discoveryNextPage: "\u4E0B\u4E00\u9875",
      discoveryRescanKeepsUndo: "\u8BF7\u5148\u64A4\u9500\u6216\u5173\u95ED\u672C\u6279\u6B21\uFF0C\u518D\u91CD\u65B0\u626B\u63CF\u3002",
      discoveryCloseKeepsUndo: "\u5173\u95ED\u4F1A\u4E22\u5931\u64A4\u9500\u5165\u53E3\uFF1B\u4ECD\u8981\u5173\u95ED\u5417\uFF1F",
      discoveryScopeHintDocument: "\u53EA\u8BFB\u53D6\u5F53\u524D\u6587\u6863\u7684\u9876\u5C42\u5757\uFF1B\u6536\u5F55\u524D\u53EF\u9884\u89C8\uFF0C\u539F\u6587\u4E0D\u4F1A\u88AB\u4FEE\u6539\u3002",
      discoveryScopeHintNotebook: "\u626B\u63CF\u5F53\u524D\u6587\u6863\u6240\u5C5E\u7B14\u8BB0\u672C\u7684\u6587\u6863\u9876\u5C42\u5757\uFF1B\u5019\u9009\u663E\u793A\u5404\u81EA\u6765\u6E90\uFF0C\u6536\u5F55\u53EA\u590D\u5236\u5230\u4E13\u7528\u5E93\u3002",
      discoveryNotebookUnavailable: "\u5F53\u524D\u7248\u672C\u6682\u4E0D\u652F\u6301\u7B14\u8BB0\u672C\u8303\u56F4\u53D1\u73B0",
      discoveryScanningDocument: "\u6B63\u5728\u626B\u63CF\u5F53\u524D\u6587\u6863\u2026",
      discoveryScanningNotebook: "\u6B63\u5728\u626B\u63CF\u5F53\u524D\u7B14\u8BB0\u672C\u2026",
      discoveryScanningTree: "\u6B63\u5728\u626B\u63CF\u6240\u9009\u6587\u6863\u6811\u2026",
      discoveryScanningSelectedNotebook: "\u6B63\u5728\u626B\u63CF\u6240\u9009\u7B14\u8BB0\u672C\u2026",
      discoveryScanningAllNotebooks: "\u6B63\u5728\u626B\u63CF\u5168\u90E8\u7B14\u8BB0\u672C\u2026",
      discoveryCancelPending: "\u5DF2\u8BF7\u6C42\u505C\u6B62\uFF1B\u5F53\u524D\u5DF2\u53D1\u51FA\u7684\u5185\u6838\u8BF7\u6C42\u7ED3\u675F\u540E\u4E0D\u518D\u542F\u52A8\u540E\u7EED\u8BF7\u6C42\uFF0C\u5E76\u4FDD\u7559\u5DF2\u5B8C\u6210\u90E8\u5206\u4F9B\u4F60\u9009\u62E9\u6536\u5F55\u3002",
      discoveryStopping: "\u6B63\u5728\u7B49\u5F85\u5DF2\u53D1\u51FA\u7684\u5185\u6838\u8BF7\u6C42\u7ED3\u675F\u2026",
      discoveryStopped: "\u5DF2\u505C\u6B62\u626B\u63CF\uFF0C\u4FDD\u7559 %s \u6761\u5019\u9009\uFF1B\u6CA1\u6709\u81EA\u52A8\u6536\u5F55\uFF0C\u5F85\u786E\u8BA4\u91CD\u590D\u72B6\u6001\u7684\u5019\u9009\u4F1A\u5728\u6536\u5F55\u524D\u590D\u67E5\u3002",
      discoveryStoppedNoResults: "\u5DF2\u505C\u6B62\u3002\u4E13\u7528\u5E93\u8FB9\u754C\u5C1A\u672A\u6838\u5B9E\uFF0C\u56E0\u6B64\u6CA1\u6709\u7EE7\u7EED\u626B\u63CF\u6216\u4FDD\u7559\u5019\u9009\uFF1B\u53EF\u4EE5\u91CD\u65B0\u5F00\u59CB\u3002",
      discoveryNotebookProgress: "\u626B\u63CF\u6587\u6863 %s / %s\uFF0C\u5DF2\u8BFB\u53D6 %s \u4E2A\u5757\u2026",
      discoveryNotebookEnumerating: "\u6B63\u5728\u67E5\u627E\u6587\u6863\uFF0C\u5DF2\u53D1\u73B0 %s \u4E2A\u2026",
      discoveryUndoBatch: "\u64A4\u9500\u672C\u6279\u65B0\u589E",
      discoveryUndoing: "\u6B63\u5728\u5B89\u5168\u68C0\u67E5\u5E76\u64A4\u9500\u2026",
      discoveryUndoReceiptTitle: "\u64A4\u9500\u56DE\u6267",
      discoveryUndoDone: "\u5DF2\u64A4\u9500\u65B0\u589E %s \u6761\uFF1B\u5DF2\u8DF3\u8FC7 %s \u6761\uFF0C\u5931\u8D25 %s \u6761\u3002\u91CD\u65B0\u626B\u63CF\u53EF\u5237\u65B0\u5019\u9009\u72B6\u6001\u3002",
      discoveryUndoAlreadyDone: "\u8FD9\u6279\u65B0\u589E\u5DF2\u64A4\u9500\u3002\u91CD\u65B0\u626B\u63CF\u53EF\u5237\u65B0\u5019\u9009\u72B6\u6001\u3002",
      discoveryUndoSkipNotFound: "\u6761\u76EE\u5DF2\u5220\u9664",
      discoveryUndoSkipIdentityChanged: "\u6761\u76EE\u8EAB\u4EFD\u6216\u5185\u5BB9\u5E93\u8303\u56F4\u5DF2\u53D8\u5316",
      discoveryUndoSkipEdited: "\u6761\u76EE\u5DF2\u88AB\u7F16\u8F91",
      discoveryUndoSkipLibraryUnverified: "\u5185\u5BB9\u5E93\u7D22\u5F15\u4E0D\u5B8C\u6574\uFF0C\u65E0\u6CD5\u5B89\u5168\u6838\u5BF9",
      discoveryUndoDeleteFailed: "\u5220\u9664\u5931\u8D25\uFF1A%s",
      discoveryScanned: "\u5DF2\u626B\u63CF %s \u4E2A\u5757\uFF0C\u53D1\u73B0 %s \u4E2A\u5019\u9009",
      discoveryScannedDocs: "\u626B\u63CF\u6587\u6863 %s \u4E2A",
      discoveryScannedNotebooks: "\u81F3\u5C11\u6709\u4E00\u6B21\u76EE\u5F55\u8BFB\u53D6\u6210\u529F\u7684\u7B14\u8BB0\u672C %s \u4E2A",
      discoverySkipped: "\u8DF3\u8FC7\u7A7A\u5757 %s \u4E2A",
      discoveryTruncated: "\u5DF2\u8FBE\u5230\u626B\u63CF\u4E0A\u9650\uFF0C\u7ED3\u679C\u53EF\u80FD\u4E0D\u5B8C\u6574",
      discoveryCancelScan: "\u505C\u6B62\u626B\u63CF",
      discoveryRetry: "\u91CD\u65B0\u626B\u63CF",
      discoveryFilter: "\u7B5B\u9009",
      discoveryFilterAll: "\u5168\u90E8\u72B6\u6001",
      discoveryFilterCandidate: "\u5F85\u6536\u5F55",
      discoveryFilterUnverified: "\u91CD\u590D\u5F85\u786E\u8BA4",
      discoveryFilterSameContent: "\u5185\u5BB9\u76F8\u540C",
      discoveryFilterAlready: "\u5DF2\u5728\u5E93\u4E2D",
      discoveryFilterAdded: "\u5DF2\u6536\u5F55",
      discoveryTypeAll: "\u5168\u90E8\u7C7B\u578B",
      discoverySearchPlaceholder: "\u7B5B\u9009\u6807\u9898\u3001\u6458\u8981\u6216\u6765\u6E90",
      discoveryTagFilterPlaceholder: "\u6309\u6807\u7B7E\u7B5B\u9009",
      discoveryNoCandidates: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u5019\u9009",
      discoveryPreviewTitle: "\u5019\u9009\u9884\u89C8",
      discoveryPreviewEmpty: "\u9009\u62E9\u5DE6\u4FA7\u5019\u9009\u540E\u67E5\u770B\u6B63\u6587\uFF1B\u6536\u5F55\u524D\u4F1A\u518D\u6B21\u6821\u9A8C\u6765\u6E90\u3002",
      discoveryPreviewLoading: "\u6B63\u5728\u8BFB\u53D6\u5019\u9009\u6B63\u6587\u2026",
      discoveryAdd: "\u52A0\u5165\u5E38\u7528\u5E93",
      discoveryAddSelected: "\u52A0\u5165\u9009\u4E2D\u9879",
      discoverySyncView: "\u540C\u6B65\u5230\u5E38\u7528\u5E93",
      discoveryAddMode: "\u52A0\u5165\u65B9\u5F0F",
      discoveryAddModeReference: "\u5EFA\u7ACB\u5F15\u7528\u5165\u53E3\uFF08\u6E90\u5757\u4E0D\u52A8\uFF09",
      discoveryAddModeCopy: "\u590D\u5236\u5230\u5E38\u7528\u5E93\uFF08\u72EC\u7ACB\u526F\u672C\uFF09",
      discoveryAddModeHint: "\u5F15\u7528\u5165\u53E3\u53EA\u4FDD\u5B58\u6765\u6E90\u5757 ID \u548C\u5143\u6570\u636E\uFF0C\u8C03\u7528\u65F6\u8BFB\u53D6\u6E90\u5757\u6700\u65B0\u6B63\u6587\u3002",
      discoveryDefaultCategory: "\u9ED8\u8BA4\u5206\u7C7B",
      discoveryTagFacets: "\u5019\u9009\u6807\u7B7E",
      discoveryTagFacetApply: "\u6309\u6807\u7B7E\u300C%s\u300D\u7B5B\u9009\uFF0C\u5171 %s \u6761",
      discoverySaveView: "\u4FDD\u5B58\u89C6\u56FE",
      discoverySaveViewPrompt: "\u4E3A\u5F53\u524D\u6807\u7B7E\u89C6\u56FE\u547D\u540D\uFF1A",
      discoverySaveViewInvalid: "\u89C6\u56FE\u540D\u79F0\u6216\u626B\u63CF\u76EE\u6807\u65E0\u6548\uFF0C\u672A\u4FDD\u5B58\u3002",
      discoverySaveViewDone: "\u5DF2\u4FDD\u5B58\u89C6\u56FE\u300C%s\u300D",
      savedViewsSection: "\u5E38\u7528\u89C6\u56FE",
      savedViewsEmpty: "\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u89C6\u56FE\u3002\u53EF\u5728\u53D1\u73B0\u9762\u677F\u8F93\u5165\u6807\u7B7E\u540E\u4FDD\u5B58\u3002",
      savedViewsOpen: "\u6253\u5F00",
      savedViewsDelete: "\u5220\u9664",
      savedViewsDeleteConfirm: "\u5220\u9664\u89C6\u56FE\u300C%s\u300D\uFF1F\u53EA\u4F1A\u5220\u9664\u5FEB\u6377\u914D\u7F6E\uFF0C\u4E0D\u4F1A\u5220\u9664\u6E90\u5757\u6216\u5DF2\u6709\u5F15\u7528\u3002",
      discoveryUnsortedCategory: "\u5F85\u6574\u7406",
      discoveryDefaultCategoryHint: "\u65B0\u6536\u5F55\u9879\u9ED8\u8BA4\u4F7F\u7528\u6B64\u5206\u7C7B\uFF1B\u9884\u89C8\u4E2D\u53EF\u5355\u72EC\u4FEE\u6539\u5F53\u524D\u6761\u76EE\u3002",
      discoveryCandidateCategory: "\u672C\u6761\u5206\u7C7B",
      discoveryUseDefaultCategory: "\u6062\u590D\u9ED8\u8BA4",
      discoveryForceSameContent: "\u5141\u8BB8\u6536\u5F55\u5185\u5BB9\u76F8\u540C\u7684\u5019\u9009",
      discoverySelected: "\u5DF2\u9009 %s \u9879",
      discoveryClose: "\u5173\u95ED",
      discoveryReceiptTitle: "\u6536\u5F55\u56DE\u6267",
      discoveryClosePendingWrites: "\u6709\u6536\u5F55\u6B63\u5728\u5199\u5165\u5185\u5BB9\u5E93\u3002\u8BF7\u7B49\u5F85\u6536\u5F55\u56DE\u6267\uFF0C\u5FC5\u8981\u65F6\u5148\u64A4\u9500\u672C\u6279\u65B0\u589E\uFF0C\u518D\u5173\u95ED\u6B64\u7A97\u53E3\u3002",
      discoveryReceiptAdded: "\u5DF2\u590D\u5236\u5230\u5E38\u7528\u5E93\uFF1A%s\uFF1B\u539F\u7B14\u8BB0\u672A\u4FEE\u6539\uFF0C\u4E4B\u540E\u4E0D\u4F1A\u81EA\u52A8\u540C\u6B65\u3002",
      discoveryReceiptSameContent: "\u5185\u5BB9\u4E0E\u300C%s\u300D\u76F8\u540C\uFF0C\u672A\u81EA\u52A8\u6536\u5F55\uFF1B\u5982\u4ECD\u8981\u6536\u5F55\uFF0C\u8BF7\u660E\u786E\u786E\u8BA4\u3002",
      discoveryReceiptAlready: "\u5DF2\u5728\u5E38\u7528\u5E93\u4E2D\uFF1A%s",
      discoveryReceiptFailed: "\u6536\u5F55\u5931\u8D25\uFF1A%s",
      discoveryReceiptBatch: "\u6279\u91CF\u6536\u5F55\u5B8C\u6210\uFF1A\u65B0\u589E %s\uFF0C\u8DF3\u8FC7 %s\uFF0C\u5931\u8D25 %s",
      discoverySessionExpired: "\u53D1\u73B0\u4F1A\u8BDD\u5DF2\u5931\u6548\uFF0C\u5019\u9009\u6B63\u6587\u5DF2\u91CA\u653E\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF\u3002",
      discoveryScanFailed: "\u626B\u63CF\u5931\u8D25\uFF1A%s",
      discoveryUnknown: "\u672A\u77E5\u9519\u8BEF",
      discoveryStatusCandidate: "\u5F85\u6536\u5F55",
      discoveryStatusAlready: "\u5DF2\u5728\u5E93\u4E2D",
      discoveryStatusSameContent: "\u5185\u5BB9\u76F8\u540C",
      discoveryStatusUnverified: "\u91CD\u590D\u5F85\u786E\u8BA4",
      discoveryStatusAdded: "\u5DF2\u6536\u5F55",
      discoveryType: "\u7C7B\u578B",
      discoverySource: "\u6765\u6E90",
      discoveryStats: "\u7EDF\u8BA1",
      discoveryNotConfigured: "\u5C1A\u672A\u914D\u7F6E\u5E38\u7528\u5185\u5BB9\u5E93\uFF0C\u65E0\u6CD5\u6536\u5F55\u5019\u9009\u3002",
      searchPlaceholder: "\u641C\u7D22\u6807\u9898\u3001\u522B\u540D\u3001\u6807\u7B7E\u3001\u5206\u7C7B\u548C\u6B63\u6587\u6458\u8981",
      searchHint: "\u8F93\u5165 ? \u52A0\u63CF\u8FF0\uFF0C\u6309\u542B\u4E49\u641C\u7D22\uFF08\u9700\u5728\u672C\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u542F\u7528 AI\uFF09",
      kernelAuthRequired: "\u601D\u6E90\u62D2\u7EDD\u4E86\u5F53\u524D\u8BF7\u6C42\uFF0C\u767B\u5F55\u72B6\u6001\u53EF\u80FD\u5DF2\u5931\u6548\u3002\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5\uFF1B\u5F53\u524D\u641C\u7D22\u6761\u4EF6\u5DF2\u4FDD\u7559\u3002",
      kernelPermissionDenied: "\u5F53\u524D\u64CD\u4F5C\u65E0\u6743\u8BBF\u95EE\u6240\u9009\u5185\u5BB9\u3002\u8BF7\u68C0\u67E5\u6743\u9650\u540E\u91CD\u8BD5\uFF1B\u5F53\u524D\u641C\u7D22\u6761\u4EF6\u5DF2\u4FDD\u7559\u3002",
      kernelAuthStatus: "\u767B\u5F55\u72B6\u6001\u5931\u6548",
      kernelPermissionStatus: "\u8BBF\u95EE\u6743\u9650\u4E0D\u8DB3",
      type: "\u7C7B\u578B",
      tags: "\u6807\u7B7E",
      tagsHint: "\u9017\u53F7\u5206\u9694",
      title: "\u6807\u9898",
      alias: "\u522B\u540D",
      category: "\u5206\u7C7B",
      contentLabel: "\u5185\u5BB9\uFF08Markdown\uFF09",
      filterAll: "\u5168\u90E8\u7C7B\u578B",
      filterAllType: "\u7C7B\u578B\uFF1A\u5168\u90E8",
      filterAllTags: "\u6807\u7B7E\uFF1A\u5168\u90E8",
      filterByThisTag: "\u70B9\u51FB\u6309\u6B64\u6807\u7B7E\u7B5B\u9009\uFF1A%s",
      clearThisTagFilter: "\u70B9\u51FB\u53D6\u6D88\u6807\u7B7E\u7B5B\u9009\uFF1A%s",
      filterAllCategories: "\u5206\u7C7B\uFF1A\u5168\u90E8",
      "type.text": "\u7EAF\u6587\u672C",
      "type.markdown": "Markdown",
      "type.url": "\u7F51\u5740",
      "type.code": "\u4EE3\u7801",
      "type.image": "\u56FE\u7247",
      "type.asset": "\u9644\u4EF6",
      "type.blockref": "\u5757\u5F15\u7528",
      "type.structure": "\u5757\u7ED3\u6784",
      filterFavorites: "\u53EA\u770B\u6536\u85CF",
      filterRecent: "\u6700\u8FD1\u4F7F\u7528",
      empty: "\u6CA1\u6709\u627E\u5230\u5339\u914D\u5185\u5BB9",
      usageHint: "\u2191 \u2193 \u9009\u62E9 \xB7 Enter \u63D2\u5165 \xB7 Ctrl/\u2318 + Enter \u590D\u5236 \xB7 Alt + 1-9 \u5FEB\u901F\u63D2\u5165 \xB7 Esc \u5173\u95ED",
      ordinalShortcutHint: "Alt+%s \u63D2\u5165 \xB7 Alt+Shift+%s \u590D\u5236",
      usageHintMobile: "\u70B9\u6309\u9009\u62E9\u6761\u76EE\uFF0C\u518D\u70B9\u5E95\u90E8\u4E3B\u6309\u94AE\u4F7F\u7528 \xB7 \u957F\u6309\u67E5\u770B\u64CD\u4F5C",
      usageGuideBtn: "\u4F7F\u7528\u5E2E\u52A9",
      usageGuideTitle: "\u5C0F\u9A74\u5E38\u7528\u600E\u4E48\u7528",
      usageGuideIntro: "\u628A\u5E38\u7528\u5185\u5BB9\u4FDD\u5B58\u5728\u601D\u6E90\u6587\u6863\u4E2D\uFF0C\u4E4B\u540E\u641C\u7D22\u3001\u9884\u89C8\uFF0C\u518D\u63D2\u5165\u6216\u590D\u5236\u3002",
      usageGuideAdd: "\u65B0\u589E\uFF1A\u70B9\u300C\uFF0B \u65B0\u5EFA\u6761\u76EE\u300D\uFF0C\u6216\u4ECE\u9009\u533A\u3001\u5F53\u524D\u5757\u3001\u526A\u8D34\u677F\u548C\u53F3\u952E\u83DC\u5355\u4FDD\u5B58\u3002",
      usageGuideSearch: "\u67E5\u627E\uFF1A\u641C\u7D22\u6807\u9898\u3001\u522B\u540D\u3001\u6458\u8981\u3001\u6807\u7B7E\u548C\u5206\u7C7B\uFF1B\u4E5F\u53EF\u4EE5\u7528\u62FC\u97F3\u3001\u6536\u85CF\u3001\u6700\u8FD1\u4F7F\u7528\u548C\u5E38\u7528\u6392\u5E8F\u3002",
      usageGuideInsert: "\u4F7F\u7528\uFF1AEnter \u63D2\u5165\uFF0CCtrl/\u2318 + Enter \u590D\u5236\uFF1BAlt/\u2325 + 1-9 \u76F4\u8FBE\u63D2\u5165\uFF0CAlt/\u2325 + Shift + 1-9 \u76F4\u8FBE\u590D\u5236\uFF1BTab \u53EF\u5728\u641C\u7D22\u6846\u4E0E\u64CD\u4F5C\u533A\u6D41\u8F6C\uFF1B\u957F\u6309\u6761\u76EE\u53EF\u6253\u5F00\u66F4\u591A\u64CD\u4F5C\u3002",
      usageGuideInsertMobile: "\u4F7F\u7528\uFF1A\u70B9\u6309\u53EA\u9009\u62E9\u6761\u76EE\uFF0C\u518D\u70B9\u5E95\u90E8\u4E3B\u6309\u94AE\u4F7F\u7528\uFF1B\u6CA1\u6709\u6307\u5B9A\u76EE\u6807\u65F6\u590D\u5236\u5230\u526A\u8D34\u677F\u3002\u79FB\u52A8\u7AEF\u76F4\u63A5\u63D2\u5165\u5C1A\u672A\u5728\u771F\u5B9E\u5BA2\u6237\u7AEF\u9A8C\u8BC1\uFF1B\u957F\u6309\u6761\u76EE\u53EF\u6253\u5F00\u66F4\u591A\u64CD\u4F5C\u3002",
      emptyFiltered: "\u5F53\u524D\u7B5B\u9009\u4E0B\u6CA1\u6709\u5339\u914D\u6761\u76EE",
      clearFilters: "\u6E05\u9664\u7B5B\u9009",
      usageGuideOrganize: "\u6574\u7406\uFF1A\u7ED9\u6761\u76EE\u8865\u4E0A\u6E05\u695A\u7684\u6807\u9898\u3001\u6807\u7B7E\u548C\u5206\u7C7B\uFF1B\u8BBE\u7F6E \u2192 \u6570\u636E\u4E0E\u6A21\u677F\u53EF\u5BFC\u5165\u5F00\u7968\u3001\u9000\u6362\u3001\u90AE\u7BB1\u3001\u5730\u5740\u548C\u8054\u7CFB\u65B9\u5F0F\u7B49\u793A\u4F8B\u3002",
      usageGuideVariables: "\u6A21\u677F\u4E0E\u6CE8\u91CA\u89C4\u5219\uFF1A{{xlc:ask:\u5B57\u6BB5}} \u63D2\u5165\u524D\u8BE2\u95EE\uFF0C\u652F\u6301 {{xlc:ask:\u5B57\u6BB5|\u9009\u9879A,\u9009\u9879B}} \u4E0B\u62C9\u9009\u62E9\uFF1B{{xlc:date}}\u3001{{xlc:clipboard}} \u7B49\u5360\u4F4D\u7B26\u4EC5\u4F7F\u7528\u65F6\u5C55\u5F00\uFF1B\u6761\u76EE\u522B\u540D\u53EF\u4F5C\u573A\u666F\u6CE8\u91CA\uFF0C\u6B63\u6587\u5185\u53EF\u7528\u5F15\u7528\u5757\u300C> \u{1F4A1} \u63D0\u793A\uFF1A...\u300D\u8BB0\u5F55\u586B\u5199\u63D0\u9192\u3002AI \u9ED8\u8BA4\u5173\u95ED\u3002",
      insert: "\u63D2\u5165",
      copy: "\u590D\u5236",
      openSource: "\u6253\u5F00\u6765\u6E90",
      edit: "\u7F16\u8F91",
      delete: "\u5220\u9664",
      favorite: "\u6536\u85CF",
      unfavorite: "\u53D6\u6D88\u6536\u85CF",
      insertRef: "\u63D2\u5165\u5F15\u7528",
      insertEmbed: "\u63D2\u5165\u5D4C\u5165",
      insertCopy: "\u590D\u5236\u5185\u5BB9",
      sourceMissing: "\u6765\u6E90\u5931\u6548",
      sourceGone: "\u539F\u5185\u5BB9\u5757\u5DF2\u79FB\u52A8\u6216\u5220\u9664\u3002\u53EF\u7F16\u8F91\u6B64\u6761\u76EE\u5E76\u91CD\u65B0\u6307\u5B9A\u6765\u6E90\u3002",
      previewUnavailable: "\u6682\u65E0\u9884\u89C8",
      previewNoResult: "\u9009\u62E9\u5DE6\u4FA7\u6761\u76EE\u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u9884\u89C8",
      mediaContentHint: "\u56FE\u7247\u548C\u9644\u4EF6\u663E\u793A Markdown \u539F\u6587\uFF1B\u590D\u5236\u5F97\u5230\u94FE\u63A5\u6587\u672C\u3002\u67E5\u770B\u539F\u6587\u4EF6\u8BF7\u7528\u300C\u6253\u5F00\u6765\u6E90\u300D\u3002\u4E0D\u652F\u6301\u590D\u5236\u56FE\u7247\u4F4D\u56FE\u6216\u6587\u4EF6\u672C\u4F53\u3002",
      usageGuideMedia: "\u56FE\u7247\u548C\u9644\u4EF6\uFF1A\u5148\u5C06\u8D44\u6E90\u6DFB\u52A0\u5230\u601D\u6E90\uFF0C\u518D\u4ECE\u56FE\u7247\u6216\u9644\u4EF6\u7684\u53F3\u952E\u83DC\u5355\u4FDD\u5B58\u3002\u9884\u89C8\u663E\u793A Markdown \u539F\u6587\uFF0C\u590D\u5236\u5F97\u5230\u94FE\u63A5\u6587\u672C\uFF1B\u67E5\u770B\u539F\u6587\u4EF6\u8BF7\u7528\u300C\u6253\u5F00\u6765\u6E90\u300D\u3002\u4E0D\u652F\u6301\u590D\u5236\u56FE\u7247\u4F4D\u56FE\u6216\u6587\u4EF6\u672C\u4F53\u3002",
      aiFound: "AI \u8BED\u4E49\u641C\u7D22",
      aiWorking: "AI \u5904\u7406\u4E2D\u2026",
      aiOriginalPreserved: "\u539F\u6587\u672A\u88AB\u4FEE\u6539",
      aiTransport: "AI \u8C03\u7528\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u6A21\u578B\u914D\u7F6E\u6216\u8FDE\u63A5\u540E\u91CD\u8BD5\u3002",
      insertNoEditor: "\u5F53\u524D\u6CA1\u6709\u6D3B\u52A8\u7F16\u8F91\u5668\uFF0C\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF0C\u53EF\u624B\u52A8\u7C98\u8D34",
      insertFailed: "\u63D2\u5165\u5931\u8D25",
      insertToDocFailed: "\u76EE\u6807\u6587\u6863\u63D2\u5165\u5931\u8D25",
      insertNoEditorBanner: "\u5F53\u524D\u6CA1\u6709\u6D3B\u52A8\u7F16\u8F91\u5668\uFF0C\u4E3B\u64CD\u4F5C\u4F1A\u590D\u5236\u5230\u526A\u8D34\u677F",
      insertCurrentEditorBanner: "\u63D2\u5165\u5230\u6253\u5F00\u5F39\u7A97\u65F6\u7684\u5149\u6807\u4F4D\u7F6E",
      insertTargetUnavailableBanner: "\u539F\u63D2\u5165\u4F4D\u7F6E\u4E0D\u53EF\u7528\uFF0C\u4E3B\u64CD\u4F5C\u4F1A\u590D\u5236\u5230\u526A\u8D34\u677F",
      insertTargetUnavailableCopied: "\u539F\u63D2\u5165\u4F4D\u7F6E\u5DF2\u5931\u6548\uFF0C\u5185\u5BB9\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF1B\u8BF7\u624B\u52A8\u7C98\u8D34",
      insertMobileActionHint: "\u79FB\u52A8\u7AEF\u76F4\u63A5\u63D2\u5165\u5C1A\u672A\u9A8C\u8BC1\uFF0C\u5F53\u524D\u64CD\u4F5C\u4F1A\u590D\u5236\u5230\u526A\u8D34\u677F",
      kernelError: "\u601D\u6E90\u63A5\u53E3\u8C03\u7528\u5931\u8D25\uFF1A%s",
      "tf.polish": "\u6DA6\u8272",
      "tf.shorten": "\u7F29\u77ED",
      "tf.formal": "\u6B63\u5F0F\u5316",
      "tf.translate-en": "\u8BD1\u4E3A\u82F1\u6587",
      "tf.bulletize": "\u5217\u8868\u5316",
      more: "\u8FD4\u56DE\u52A8\u4F5C",
      dropToAdd: "\u677E\u5F00\u9F20\u6807\u4EE5\u6DFB\u52A0\u5E38\u7528\u6761\u76EE",
      newItem: "\u65B0\u5EFA\u6761\u76EE",
      newItemAction: "\uFF0B \u65B0\u5EFA\u6761\u76EE",
      save: "\u4FDD\u5B58",
      saving: "\u4FDD\u5B58\u4E2D\u2026",
      cancel: "\u53D6\u6D88",
      confirm: "\u786E\u5B9A",
      invalidItem: "\u6761\u76EE\u6570\u636E\u65E0\u6548",
      captureContentRequired: "\u8BF7\u586B\u5199\u8981\u4FDD\u5B58\u7684\u5185\u5BB9\u3002",
      captureUrlInvalid: "\u8BF7\u8F93\u5165\u6709\u6548\u7684 http \u6216 https \u94FE\u63A5\u3002",
      aiTidy: "AI \u6574\u7406",
      aiDraft: "AI \u8349\u7A3F",
      aiDraftDesc: "\u63CF\u8FF0\u4F60\u60F3\u8981\u7684\u5185\u5BB9\uFF0CAI \u751F\u6210\u8349\u7A3F",
      aiDraftNeedDescription: "\u8BF7\u5148\u63CF\u8FF0\u60F3\u751F\u6210\u7684\u5185\u5BB9",
      aiApplied: "\u5DF2\u5E94\u7528 AI \u5EFA\u8BAE",
      aiTransform: "AI \u53D8\u6362",
      saved: "\u5DF2\u4FDD\u5B58\uFF1A%s",
      dataTruth: "\u4FDD\u5B58\u5230\u601D\u6E90\u6587\u6863\uFF1B\u6765\u6E90\u79FB\u52A8\u6216\u5220\u9664\u65F6\u4F1A\u63D0\u793A",
      dataTruthHint: "\u5185\u5BB9\u4EE5\u601D\u6E90\u5757\u4FDD\u5B58\u5728\u6240\u9009\u5185\u5BB9\u5E93\u6587\u6863\uFF0C\u6761\u76EE\u548C\u6765\u6E90\u4ECD\u53EF\u5728\u601D\u6E90\u4E2D\u7F16\u8F91\u3002",
      adoptAll: "\u5168\u90E8\u91C7\u7EB3",
      actionsNoun: "\u52A8\u4F5C",
      semanticSuggestion: "\u6CA1\u6709\u627E\u5230\u5339\u914D\u5185\u5BB9",
      aiSemanticHint: "\u8F93\u5165 ? \u52A0\u63CF\u8FF0\uFF0C\u4F8B\u5982\u300C?\u7ED9\u5BA2\u6237\u7684\u9053\u6B49\u56DE\u590D\u300D\u3002AI \u4F9D\u636E\u6807\u9898\u3001\u522B\u540D\u3001\u6807\u7B7E\u3001\u5206\u7C7B\u548C\u6458\u8981\u63A8\u8350\u6761\u76EE\uFF0C\u4E0D\u8BFB\u53D6\u5B8C\u6574\u6B63\u6587\u3002",
      varCountBadge: "%s \u53D8\u91CF",
      paneVarsLabel: "\u63D2\u5165\u65F6\u5C06\u8BE2\u95EE %s \u4E2A\u53D8\u91CF\uFF1A",
      insertVariable: "\u63D2\u5165\u53D8\u91CF\uFF1A",
      varFormTitle: "\u586B\u5199\u53D8\u91CF",
      varFormSub: "\u672C\u6761\u76EE\u542B %s \u4E2A\u53D8\u91CF\uFF0C\u586B\u5199\u540E\u4E00\u6B21\u6027\u63D2\u5165\uFF1B\u586B\u5199\u503C\u4EC5\u7528\u4E8E\u672C\u6B21\uFF0C\u4E0D\u56DE\u5199\u5E93\u3002",
      varFormHint: "Tab \u4E0B\u4E00\u9879 \xB7 Enter \u63D2\u5165",
      groupFavorites: "\u6536\u85CF",
      groupAll: "\u5168\u90E8",
      groupUncategorized: "\u65E0\u5206\u7C7B",
      insertSection: "\u53D8\u91CF\u4E0E\u63D2\u5165",
      promptVariablesToggle: "\u63D2\u5165\u524D\u8BE2\u95EE\u53D8\u91CF",
      promptVariablesSub: "\u542B {{xlc:ask:\u2026}} \u7684\u6761\u76EE\u63D2\u5165\u524D\u5F39\u51FA\u586B\u5145\u5361\u7247",
      recordUsageToggle: "\u8BB0\u5F55\u4F7F\u7528\u6B21\u6570",
      recordUsageSub: "\u4EC5\u672C\u5730\u5B58\u50A8\uFF0C\u53EF\u4E00\u952E\u6E05\u9664\uFF1B\u7528\u4E8E\u300C\u5E38\u7528\u300D\u6392\u5E8F\u3002\u5173\u95ED\u540E\u4F1A\u4FDD\u7559\u5DF2\u6709\u7EDF\u8BA1\u3002",
      usageStatsHint: "\u4F7F\u7528\u7EDF\u8BA1\u4EC5\u4FDD\u5B58\u5728\u672C\u673A",
      clearUsageBtn: "\u6E05\u7A7A\u4F7F\u7528\u7EDF\u8BA1",
      clearUsageEmpty: "\u6682\u65E0\u4F7F\u7528\u7EDF\u8BA1",
      clearUsageConfirm: "\u6E05\u7A7A\u5168\u90E8\u4F7F\u7528\u8BA1\u6570\uFF1F",
      clearUsageDone: "\u5DF2\u6E05\u7A7A\u4F7F\u7528\u7EDF\u8BA1",
      resetItemUsage: "\u91CD\u7F6E\u4F7F\u7528\u9891\u6B21\uFF08\u5F53\u524D %s \u6B21\uFF09",
      resetItemUsageDone: "\u5DF2\u91CD\u7F6E\u300C%s\u300D\u7684\u4F7F\u7528\u9891\u6B21",
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
      setupSummaryNotebook: "\u7D22\u5F15\u7B14\u8BB0\u672C\u6839\u76EE\u5F55\u4E0B\u4E00\u7EA7\u6587\u6863\uFF0C\u5E76\u5199\u5165\u7B2C\u4E00\u4E2A\u6587\u6863",
      setupSummaryTree: "\u7D22\u5F15\u6240\u9009\u6587\u6863\u53CA\u6700\u591A 3 \u5C42\u5B50\u6587\u6863\uFF0C\u65B0\u589E\u6761\u76EE\u5199\u5165\u6240\u9009\u6839\u6587\u6863",
      create: "\u521B\u5EFA",
      retry: "\u91CD\u8BD5",
      useCount: "%s \u6B21",
      quickNew: "\uFF0B \u65B0\u5EFA\u6761\u76EE",
      quickInsertSelected: "\u63D2\u5165\u9009\u4E2D",
      packBtn: "\u5BFC\u51FA\u6A21\u677F\u5305",
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
      "sort.manual": "\u9ED8\u8BA4\u6392\u5E8F\uFF08\u6536\u85CF\u4F18\u5148\uFF09",
      "sort.recent": "\u6700\u8FD1\u4F7F\u7528\u5728\u524D",
      "sort.title": "\u6309\u6807\u9898\u6392\u5E8F",
      "sort.frequent": "\u4F7F\u7528\u9891\u6B21",
      sort: "\u6392\u5E8F",
      totalItems: "\u5E93\u5185\u6761\u76EE\uFF1A%s \u6761",
      resultCount: "%s \u6761\u7ED3\u679C",
      aiResultCount: "AI \u63A8\u8350\uFF1A%s \u6761",
      "sortHint.manual": "\u6536\u85CF\u6761\u76EE\u4F18\u5148\u663E\u793A\uFF1B\u5176\u4F59\u6761\u76EE\u6309\u6700\u8FD1\u4F7F\u7528\u548C\u66F4\u65B0\u65F6\u95F4\u6392\u5217",
      "sortHint.recent": "\u6700\u8FD1\u63D2\u5165\u6216\u590D\u5236\u8FC7\u7684\u6761\u76EE\u6392\u5728\u524D\u9762",
      "sortHint.title": "\u6D4F\u89C8\u5217\u8868\u65F6\u6309\u6807\u9898\u6392\u5E8F\uFF1B\u641C\u7D22\u65F6\u4ECD\u6309\u5339\u914D\u7A0B\u5EA6\u6392\u5E8F",
      "sortHint.frequent": "\u4F7F\u7528\u6B21\u6570\u8F83\u591A\u7684\u6761\u76EE\u6392\u5728\u524D\u9762\uFF1B\u6B21\u6570\u76F8\u540C\u5219\u6700\u8FD1\u4F7F\u7528\u7684\u4F18\u5148",
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
      providerSection: "\u5176\u4ED6\u63D2\u4EF6\u5185\u5BB9",
      providerInsert: "\u63D2\u5165\u5176\u4ED6\u63D2\u4EF6\u5185\u5BB9",
      providerCopy: "\u590D\u5236\u5176\u4ED6\u63D2\u4EF6\u5185\u5BB9",
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
      shortcutLabel: "\u64CD\u4F5C\u63D0\u793A",
      searchAllScopeAction: "\u5728\u5168\u90E8\u5185\u5BB9\u4E2D\u641C\u7D22\u300C%s\u300D",
      newItemActionWithQuery: "\uFF0B \u65B0\u5EFA\u300C%s\u300D",
      newItemWithTitle: "\u5C06\u300C%s\u300D\u9884\u586B\u4E3A\u6807\u9898\u5E76\u65B0\u5EFA\u6761\u76EE",
      emptyQueryHint: "\u65B0\u5EFA\u65F6\u4F1A\u628A\u5F53\u524D\u641C\u7D22\u8BCD\u586B\u5165\u6807\u9898\uFF0C\u4F60\u53EF\u4EE5\u7EE7\u7EED\u4FEE\u6539\u3002",
      semanticEmptyHint: "AI \u641C\u7D22\u6CA1\u6709\u627E\u5230\u76F8\u5173\u6761\u76EE\u3002\u53EF\u8C03\u6574\u63CF\u8FF0\uFF0C\u6216\u65B0\u5EFA\u6761\u76EE\u540E\u81EA\u884C\u586B\u5199\u6807\u9898\u548C\u5185\u5BB9\u3002",
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
      promptPackBtn: "\u5BFC\u5165\u5185\u7F6E\u5206\u7C7B\u6A21\u677F",
      promptPackHint: "\u5185\u7F6E\u6A21\u677F\u4F1A\u4EE5\u5206\u7C7B\u5C5E\u6027\u4FDD\u5B58\u5728\u5F53\u524D\u5E93\u6587\u6863\u4E2D",
      dataSection: "\u6570\u636E\u4E0E\u6A21\u677F\uFF08\u5BFC\u51FA / \u5BFC\u5165\uFF09",
      librarySection: "\u5F53\u524D\u5185\u5BB9\u5E93",
      libraryNone: "\u672A\u914D\u7F6E",
      reindexBtn: "\u91CD\u5EFA\u7D22\u5F15",
      clearRecents: "\u6E05\u7A7A\u6700\u8FD1\u4F7F\u7528",
      clearRecentsEmpty: "\u6682\u65E0\u6700\u8FD1\u4F7F\u7528",
      clearRecentsConfirm: "\u6E05\u7A7A\u6700\u8FD1\u4F7F\u7528\u8BB0\u5F55\uFF1F",
      exportBtn: "\u5BFC\u51FA\u5168\u90E8\u6761\u76EE (JSON)",
      importBtn: "\u5BFC\u5165 JSON",
      exportMdBtn: "\u5BFC\u51FA Markdown \u5305\uFF08\u542B\u8D44\u6E90\uFF09",
      tagAuditBtn: "AI \u6807\u7B7E\u4F53\u68C0",
      setupTitle: "\u9009\u62E9\u5E38\u7528\u5185\u5BB9\u5E93",
      setupHint: "\u6761\u76EE\u4FDD\u5B58\u4E3A\u601D\u6E90\u6587\u6863\uFF0C\u53EF\u7EE7\u7EED\u7F16\u8F91\u3002\u521B\u5EFA\u65B0\u6587\u6863\u524D\u4F1A\u660E\u786E\u786E\u8BA4\u3002",
      setupUsageGuide: "\u5F00\u59CB\u4F7F\u7528\uFF1A\u4ECE\u9762\u677F\u65B0\u5EFA\uFF0C\u6216\u4ECE\u526A\u8D34\u677F\u6355\u83B7\uFF1B\u641C\u7D22\u540E\u9009\u62E9\u6761\u76EE\uFF0C\u518D\u7528\u64CD\u4F5C\u533A\u63D2\u5165\u6216\u590D\u5236\u3002\u6A21\u677F\u53D8\u91CF {{xlc:ask:\u5B57\u6BB5}} \u4F1A\u5728\u4F7F\u7528\u524D\u8BE2\u95EE\u3002",
      setupRecommendation: "\u63A8\u8350\u65B0\u5EFA\u4E00\u4E2A\u4E13\u7528\u5E93\u6587\u6863\uFF1B\u5B83\u4F1A\u653E\u5165\u4F60\u9009\u62E9\u7684\u5DF2\u6709\u7B14\u8BB0\u672C\uFF08\u4E0D\u4F1A\u65B0\u5EFA\u7B14\u8BB0\u672C\uFF09\u3002\u5206\u7C7B\u4F1A\u4FDD\u5B58\u5728\u6BCF\u6761\u5185\u5BB9\u4E0A\uFF0C\u6A21\u677F\u7531\u4F60\u786E\u8BA4\u540E\u5BFC\u5165\u5230\u8BE5\u6587\u6863\u3002",
      setupQuickStartTitle: "\u914D\u7F6E\u5B8C\u6210\u540E\u8FD9\u6837\u5F00\u59CB",
      setupQuickStart1Title: "\u5148\u653E\u4E00\u6761\u5185\u5BB9",
      setupQuickStart1Desc: "\u5728\u9762\u677F\u70B9\u300C\u65B0\u5EFA\u6761\u76EE\u300D\uFF0C\u6216\u4ECE\u9009\u533A\u3001\u526A\u8D34\u677F\u548C\u53F3\u952E\u83DC\u5355\u4FDD\u5B58\u3002",
      setupQuickStart2Title: "\u518D\u627E\u5230\u5B83",
      setupQuickStart2Desc: "\u8F93\u5165\u6807\u9898\u3001\u6807\u7B7E\u6216\u5206\u7C7B\u641C\u7D22\uFF1B\u70B9\u9009\u6761\u76EE\u5373\u53EF\u67E5\u770B\u9884\u89C8\u3002",
      setupQuickStart3Title: "\u6700\u540E\u4F7F\u7528",
      setupQuickStart3Desc: "\u6309 Enter \u63D2\u5165\uFF0C\u6216\u590D\u5236\u540E\u7C98\u8D34\uFF1B\u8BBE\u7F6E\u4E2D\u7684\u6A21\u677F\u53EF\u5728\u4F7F\u7528\u65F6\u586B\u5199\u53D8\u91CF\u3002",
      setupCreateNewDoc: "\u65B0\u5EFA\u4E13\u7528\u5E93\u6587\u6863\uFF08\u63A8\u8350\uFF09",
      setupPickDoc: "\u9009\u62E9\u73B0\u6709\u6587\u6863",
      setupNotebook: "\u6309\u7B14\u8BB0\u672C",
      setupCreateNotebook: "\u9009\u62E9\u5DF2\u6709\u7B14\u8BB0\u672C\uFF08\u4E0D\u4F1A\u65B0\u5EFA\u7B14\u8BB0\u672C\uFF09",
      setupChooseNotebook: "\u8BF7\u9009\u62E9\u7B14\u8BB0\u672C",
      setupNotebookLoading: "\u6B63\u5728\u8BFB\u53D6\u53EF\u7528\u7B14\u8BB0\u672C\u2026",
      setupNotebookReady: "\u53EF\u7528\u7B14\u8BB0\u672C\u5DF2\u52A0\u8F7D",
      setupNotebookNeedsDocsCheck: "\u9009\u62E9\u7B14\u8BB0\u672C\u540E\uFF0C\u4E0B\u4E00\u6B65\u4F1A\u68C0\u67E5\u6839\u76EE\u5F55\u6587\u6863",
      setupNotebookDocsReady: "\u6839\u76EE\u5F55\u6587\u6863\u5DF2\u68C0\u67E5\uFF0C\u53EF\u4EE5\u7EE7\u7EED\u8BBE\u7F6E\u5185\u5BB9\u5E93",
      setupNotebookEmpty: "\u6CA1\u6709\u53EF\u7528\u7B14\u8BB0\u672C\u3002\u8BF7\u5148\u5728\u601D\u6E90\u65B0\u5EFA\u7B14\u8BB0\u672C\uFF0C\u6216\u5207\u6362\u4E3A\u9009\u62E9\u73B0\u6709\u6587\u6863\u3002",
      setupNotebookLoadFailed: "\u7B14\u8BB0\u672C\u8BFB\u53D6\u5931\u8D25",
      setupNotebookNotReady: "\u7B14\u8BB0\u672C\u5C1A\u672A\u52A0\u8F7D\u5B8C\u6210",
      setupNotebookNoDocs: "\u8BE5\u7B14\u8BB0\u672C\u6839\u76EE\u5F55\u6CA1\u6709\u6587\u6863",
      setupNotebookDocsChecking: "\u6B63\u5728\u68C0\u67E5\u7B14\u8BB0\u672C\u6839\u76EE\u5F55\u6587\u6863\u2026",
      setupNotebookDocsCheckFailed: "\u68C0\u67E5\u7B14\u8BB0\u672C\u6839\u76EE\u5F55\u5931\u8D25\uFF0C\u53EF\u91CD\u8BD5",
      setupNewDoc: "\u521B\u5EFA\u65B0\u5E93\u6587\u6863",
      setupNewDocName: "\u5E38\u7528\u5185\u5BB9\u5E93",
      docPicker: "\u9009\u62E9\u5E93\u6587\u6863",
      docPickerEmpty: "\u6CA1\u6709\u5339\u914D\u7684\u6587\u6863",
      captureHint: "\u6761\u76EE\u5C06\u4FDD\u5B58\u4E3A\u771F\u5B9E\u601D\u6E90\u5757 \xB7 \u53D8\u91CF\u5728\u63D2\u5165\u65F6\u8BE2\u95EE",
      captureHintLib: "\u5E93\uFF1A%s",
      docCount: "%s \u4E2A\u6587\u6863",
      emptyLibrary: "\u8FD8\u6CA1\u6709\u5E38\u7528\u5185\u5BB9",
      emptyLibrarySub: "\u5148\u65B0\u5EFA\u4E00\u6761\uFF0C\u6216\u4ECE\u9009\u533A\u3001\u526A\u8D34\u677F\u548C\u53F3\u952E\u83DC\u5355\u4FDD\u5B58\uFF1B\u5185\u5BB9\u4F1A\u4FDD\u5B58\u5728\u5F53\u524D\u5185\u5BB9\u5E93",
      updatedAtLabel: "\u66F4\u65B0\u4E8E %s",
      // R138 键集（缺失时 T 回落键名，截图/断言会看到裸键）
      keyboardHelp: "\u952E\u76D8\u5FEB\u6377\u64CD\u4F5C",
      kbdNav: "\u5207\u6362\u9009\u4E2D\u6761\u76EE",
      kbdEnter: "\u63D2\u5165\u9009\u4E2D\u6761\u76EE",
      kbdCopy: "\u590D\u5236\u9009\u4E2D\u6761\u76EE",
      kbdAltDirect: "%s + 1-9 \u5FEB\u901F\u63D2\u5165",
      kbdEsc: "\u5173\u95ED",
      kbdQuickInsert: "\u5FEB\u901F\u63D2\u5165\u5BF9\u5E94\u6761\u76EE",
      kbdQuickCopy: "\u5FEB\u901F\u590D\u5236\u5BF9\u5E94\u6761\u76EE",
      kbdTabActions: "\u5207\u6362\u5230\u64CD\u4F5C\u533A",
      kbdFavorite: "\u6536\u85CF/\u53D6\u6D88\u6536\u85CF",
      kbdClose: "\u5173\u95ED\u9762\u677F",
      loading: "\u52A0\u8F7D\u4E2D\u2026",
      truncatedHint: "\u6761\u76EE\u8D85\u51FA\u7D22\u5F15\u4E0A\u9650\uFF0C\u5DF2\u622A\u65AD\u663E\u793A\uFF1B\u6570\u636E\u4ECD\u5B89\u5168\u5728\u5E93\u4E2D",
      copyFailed: "\u590D\u5236\u5931\u8D25\uFF1A\u65E0\u6CD5\u5199\u5165\u526A\u8D34\u677F",
      libModeNotebook: "\u7B14\u8BB0\u672C \xD7 %s",
      libModeDoc: "\u6587\u6863\u5E93 \xB7 %s \u4E2A\u6587\u6863",
      libModeTree: "\u6587\u6863\u6811 \xB7 %s \u4E2A\u6839\u6587\u6863",
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
    var _a, _b;
    const aiOn = (_a = overrides.aiEnabled) != null ? _a : true;
    let activeFilters = { ...(_b = overrides.filters) != null ? _b : { type: "", tag: "", category: "" } };
    const favorites = /* @__PURE__ */ new Set(["xlc-demo0000001"]);
    const recents = /* @__PURE__ */ new Set(["xlc-demo0000001", "xlc-demo0000002"]);
    const realItem = {
      id: "xlc-demo0000001",
      blockId: "20240101120000-aaaaaaa",
      libraryDocId: "20240101120001-hijklmn",
      itemType: "markdown",
      title: "\u9879\u76EE\u5EF6\u671F\u9053\u6B49\u4E0E\u8865\u507F\u65B9\u6848",
      alias: "\u5EF6\u671F\u9053\u6B49",
      tags: ["\u5BA2\u6237\u6C9F\u901A", "\u6A21\u677F"],
      category: "\u5BA2\u670D",
      summary: "\u5C0A\u656C\u7684\u738B\u603B\uFF1A\u5173\u4E8E\u672C\u671F\u4EA4\u4ED8\u5EF6\u671F\u2026\u2026",
      varCount: 0,
      source: { sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120002-bbbbbbb", sourceType: "manual" },
      url: "",
      targetBlockId: "",
      createdAt: 1,
      updatedAt: 1,
      droppedFields: []
    };
    let realExecutor = null;
    let realTarget = null;
    if (overrides.realExecutor) {
      const library = new LibraryService({ request: async (endpoint) => {
        if (endpoint === "getBlockKramdown") return { id: realItem.blockId, kramdown: "\u771F\u5B9E\u6267\u884C\u5668\u6B63\u6587" };
        if (endpoint === "checkBlocksExist") return { "20240101120001-hijklmn": true, "20240101120002-bbbbbbb": true };
        if (endpoint === "getBlockAttrs") return {};
        return null;
      } });
      const patched = library;
      patched.ensureIndex = async () => ({ entries: [ENTRIES[0]], items: /* @__PURE__ */ new Map([[realItem.id, realItem]]), truncated: false, docsScanned: 1, errors: [], builtAt: 1 });
      patched.getItemKramdown = async () => ({ ok: true, data: "\u771F\u5B9E\u6267\u884C\u5668\u6B63\u6587" });
      patched.checkSourceHealth = async () => ({ ok: true, data: { blockMissing: false, docMissing: false, assetMissing: false } });
      patched.expandSnippetRefs = async (text) => text;
      realTarget = { editor: overrides.activeEditor === false ? null : {}, handle: {}, docId: realItem.source.sourceDocId };
      const host = {
        isMobile: () => false,
        hasActiveEditor: () => {
          var _a2;
          document.body.dataset.xlcRealHasEditorCalls = String(Number((_a2 = document.body.dataset.xlcRealHasEditorCalls) != null ? _a2 : 0) + 1);
          return overrides.activeEditor !== false;
        },
        insertMarkdown: (text) => {
          var _a2;
          document.body.dataset.xlcRealInsertCalls = String(Number((_a2 = document.body.dataset.xlcRealInsertCalls) != null ? _a2 : 0) + 1);
          document.body.dataset.xlcRealInsertedText = text;
          return true;
        },
        captureInsertTarget: () => realTarget,
        canInsertAtTarget: () => overrides.insertTargetAvailable !== false && overrides.activeEditor !== false,
        releaseInsertTarget: () => {
        },
        writeClipboard: async (text) => {
          document.body.dataset.xlcRealClipboardText = text;
          return overrides.realClipboardAvailable !== false;
        },
        openDoc: () => true,
        openAsset: () => true,
        openExternal: () => true,
        currentDocId: () => realItem.source.sourceDocId
      };
      document.body.dataset.xlcRealHostHasEditor = String(overrides.activeEditor !== false);
      realExecutor = new ActionExecutor(library, host, () => {
      });
    }
    const runRealAction = async (_itemId, mode) => {
      const receipt = await realExecutor.run(realItem, mode, { editorTarget: realTarget });
      document.body.dataset.xlcRealRequestedMode = mode;
      document.body.dataset.xlcRealReceipt = JSON.stringify({ ok: receipt.ok, message: receipt.message, downgraded: receipt.downgraded });
      return { ok: receipt.ok, message: receipt.message };
    };
    return {
      t: (key, ...args) => key === "newItemAction" && overrides.newItemAction ? overrides.newItemAction : T(key, ...args),
      search: async (query) => {
        var _a2, _b2, _c;
        const w = window;
        w.__xlcSearchCalls = ((_a2 = w.__xlcSearchCalls) != null ? _a2 : 0) + 1;
        const q = typeof query === "string" ? { text: query } : query;
        const queries = (_b2 = window.__xlcQueries) != null ? _b2 : [];
        queries.push({ ...q });
        window.__xlcQueries = queries;
        if (overrides.empty) return { entries: [], truncated: false, total: 0 };
        const sourceEntries = overrides.largeResults ? LARGE_ENTRIES : ENTRIES;
        const text = typeof query === "string" ? query : (_c = query == null ? void 0 : query.text) != null ? _c : "";
        const searchText = text.trim();
        let entries = !searchText || searchText.startsWith("?") ? sourceEntries : sourceEntries.filter((e) => {
          var _a3;
          const hay = [e.title, e.alias, e.summary, e.category, ...(_a3 = e.tags) != null ? _a3 : []].join(" ").toLowerCase();
          return hay.includes(searchText.toLowerCase());
        });
        if (typeof query !== "string") {
          if (query.scope === "favorites") entries = entries.filter((entry) => favorites.has(entry.id));
          if (query.scope === "recent") entries = entries.filter((entry) => recents.has(entry.id));
          if (query.itemType) entries = entries.filter((entry) => entry.itemType === query.itemType);
          if (query.tag) entries = entries.filter((entry) => {
            var _a3, _b3;
            return (_b3 = entry.tags) == null ? void 0 : _b3.includes((_a3 = query.tag) != null ? _a3 : "");
          });
          if (query.category) entries = entries.filter((entry) => entry.category === query.category);
        }
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
        if (realExecutor) return runRealAction(itemId, mode);
        const w = window;
        const observedMode = overrides.mobile && !overrides.insertTarget ? "copy" : mode;
        ((_a2 = w.__xlcActions) != null ? _a2 : w.__xlcActions = []).push({ id: itemId, mode: observedMode });
        if (overrides.actionDelayMs) await new Promise((resolve) => setTimeout(resolve, overrides.actionDelayMs));
        return { ok: true, message: "inserted" };
      },
      runActionWithFills: async (_itemId, _mode, fills) => {
        window.__xlcLastFills = fills;
        return { ok: true, message: "inserted" };
      },
      openSource: async (itemId) => {
        var _a2;
        const w = window;
        ((_a2 = w.__xlcOpenedSources) != null ? _a2 : w.__xlcOpenedSources = []).push(itemId);
        return { ok: true, message: "opened" };
      },
      editItem: async (itemId) => {
        var _a2;
        const w = window;
        ((_a2 = w.__xlcEditedItems) != null ? _a2 : w.__xlcEditedItems = []).push(itemId);
      },
      deleteItem: async (itemId) => {
        var _a2;
        const w = window;
        ((_a2 = w.__xlcDeletedItems) != null ? _a2 : w.__xlcDeletedItems = []).push(itemId);
      },
      toggleFavorite: (itemId) => {
        var _a2;
        const w = window;
        ((_a2 = w.__xlcFavoriteToggles) != null ? _a2 : w.__xlcFavoriteToggles = []).push(itemId);
        if (favorites.has(itemId)) favorites.delete(itemId);
        else favorites.add(itemId);
        return favorites.has(itemId);
      },
      isFavorite: (id) => favorites.has(id),
      insertRaw: async () => true,
      copyText: async (text) => {
        window.__xlcCopied = text;
        return true;
      },
      getSort: () => "manual",
      setSort: () => {
      },
      searchDocs: async (k) => k ? [{ id: "20240101120001-hijklmn", hPath: "/\u5E38\u7528\u5185\u5BB9\u5E93", name: "\u5E38\u7528\u5185\u5BB9\u5E93" }] : [],
      insertToDoc: async (itemId, docId, hPath) => {
        var _a2;
        const w = window;
        ((_a2 = w.__xlcDocActions) != null ? _a2 : w.__xlcDocActions = []).push({ id: itemId, docId, hPath });
        return true;
      },
      duplicateItem: async (itemId) => {
        var _a2;
        const w = window;
        ((_a2 = w.__xlcDuplicatedItems) != null ? _a2 : w.__xlcDuplicatedItems = []).push(itemId);
      },
      saveTransformed: async () => {
      },
      getFilters: () => ({ ...activeFilters }),
      getLibraryName: async () => "/\u5E38\u7528\u5185\u5BB9\u5E93",
      setFilters: (filters) => {
        var _a2;
        activeFilters = { ...filters };
        const w = window;
        ((_a2 = w.__xlcSetFilters) != null ? _a2 : w.__xlcSetFilters = []).push({ ...filters });
      },
      getLastQuery: () => "",
      setLastQuery: () => {
      },
      getRecentQueries: () => {
        var _a2;
        return (_a2 = window.__xlcRecentQueries) != null ? _a2 : ["\u53D1\u7968\u8D44\u6599", "\u5EF6\u671F\u9053\u6B49"];
      },
      addRecentQuery: (q) => {
        var _a2;
        const w = window;
        const current = (_a2 = w.__xlcRecentQueries) != null ? _a2 : ["\u53D1\u7968\u8D44\u6599", "\u5EF6\u671F\u9053\u6B49"];
        w.__xlcRecentQueries = [q, ...current.filter((x) => x !== q)].slice(0, 10);
      },
      insertTarget: null,
      openSetup: () => window.XlcHarness.openSettings(),
      promptVariables: () => {
        var _a2;
        return (_a2 = overrides.promptVariables) != null ? _a2 : true;
      },
      getUsage: () => ({
        "xlc-demo0000001": { count: 32, lastAt: 400 },
        "xlc-demo0000002": { count: 18, lastAt: 300 },
        "xlc-demo0000003": { count: 11, lastAt: 200 },
        "xlc-demo0000005": { count: 4, lastAt: 100 }
      }),
      resetItemUsage: (itemId) => {
        var _a2;
        const w = window;
        ((_a2 = w.__xlcResetUsageItems) != null ? _a2 : w.__xlcResetUsageItems = []).push(itemId);
        return true;
      },
      newItem: (titleCandidate) => {
        var _a2;
        document.body.dataset.xlcNewItemTitle = titleCandidate != null ? titleCandidate : "";
        document.body.dataset.xlcNewItemCalls = String(Number((_a2 = document.body.dataset.xlcNewItemCalls) != null ? _a2 : 0) + 1);
        window.XlcHarness.openCapture();
      },
      newWithContent: (content, options) => {
        var _a2, _b2, _c;
        const w = window;
        ((_a2 = w.__xlcNewWithContentCalls) != null ? _a2 : w.__xlcNewWithContentCalls = []).push({ content, title: options == null ? void 0 : options.title });
        document.body.dataset.xlcNewItemTitle = (_b2 = options == null ? void 0 : options.title) != null ? _b2 : "";
        document.body.dataset.xlcNewWithContentCalls = String(Number((_c = document.body.dataset.xlcNewWithContentCalls) != null ? _c : 0) + 1);
        window.XlcHarness.openCapture();
      },
      providerSearch: async (query) => query.includes("\u5DE5\u4F5C\u53F0") ? [
        { virtualId: "pv:xiaolv-speed-switch:1", providerId: "xiaolv-speed-switch", providerName: "\u5C0F\u9A74\u96F7\u5207", title: "\u5F53\u524D\u5DE5\u4F5C\u53F0", payload: "\u5FEB\u901F\u56DE\u5230\u5DE5\u4F5C\u53F0\u5E03\u5C40\uFF08\u63D0\u4F9B\u65B9\u6F14\u793A\u6570\u636E\uFF09" },
        { virtualId: "pv:xiaolv-checkin:1", providerId: "xiaolv-checkin", providerName: "\u5C0F\u9A74\u6253\u5361", title: "\u4ECA\u65E5\u6253\u5361\u72B6\u6001", payload: "\u5DF2\u5B8C\u6210 3/4 \u9879\u4E60\u60EF\u6253\u5361\uFF08\u63D0\u4F9B\u65B9\u6F14\u793A\u6570\u636E\uFF09" }
      ] : [],
      insertProviderPayload: async () => true,
      copyProviderPayload: async () => true,
      aiSemantic: async (desc) => ({ ok: true, entries: desc === "\u7A7A\u7ED3\u679C" ? [] : ENTRIES.slice(0, 3) }),
      aiTransform: async (_itemId, kind) => ({
        ok: true,
        text: kind === "translate-en" ? 'Dear Mr. Wang:\n\nWe sincerely apologize for the delay of the "Membership System" delivery. Root cause: third-party payment integration overrun. Integration is 92% complete; launch postponed by 2 business days.\n\nCompensation: 5% fee reduction; 48h dedicated support after launch; priority scheduling next iteration.' : "\u5C0A\u656C\u7684\u738B\u603B\uFF1A\n\n\u672C\u671F\u300C\u4F1A\u5458\u7CFB\u7EDF\u300D\u56E0\u7B2C\u4E09\u65B9\u652F\u4ED8\u8054\u8C03\u8D85\u671F\u800C\u5EF6\u671F\uFF0C\u6211\u4EEC\u6DF1\u8868\u6B49\u610F\u3002\u8054\u8C03\u5DF2\u5B8C\u6210 92%\uFF0C\u9884\u8BA1\u63A8\u8FDF 2 \u4E2A\u5DE5\u4F5C\u65E5\u4E0A\u7EBF\u3002\n\n\u8865\u507F\u65B9\u6848\uFF1A\u672C\u671F\u670D\u52A1\u8D39\u51CF\u514D 5%\uFF1B\u4E0A\u7EBF\u540E 48 \u5C0F\u65F6\u4E13\u5C5E\u503C\u5B88\uFF1B\u4E0B\u671F\u9700\u6C42\u4F18\u5148\u6392\u671F\u3002"
      }),
      listCustomTransforms: () => [{ id: "xltf-demo00001", name: "\u5BA2\u670D\u8BDD\u672F" }],
      aiTransformCustom: async () => ({ ok: true, text: "\u5BA2\u670D\u8BDD\u672F\u7ED3\u679C\u793A\u4F8B" }),
      aiEnabled: () => aiOn,
      hasActiveEditor: () => overrides.activeEditor !== false,
      hasInsertTarget: () => {
        var _a2;
        return (_a2 = overrides.insertTargetAvailable) != null ? _a2 : overrides.activeEditor !== false;
      },
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
      lastSearchDialog = dialog;
      if (overrides == null ? void 0 : overrides.insertTarget) dialog.insertTarget = overrides.insertTarget;
      dialog.open();
      const input = document.querySelector(".xlc-search-input");
      if (input) {
        input.value = (_a = overrides == null ? void 0 : overrides.query) != null ? _a : "?\u7ED9\u5BA2\u6237\u5EF6\u671F\u4E0A\u7EBF\u7684\u9053\u6B49\u56DE\u590D";
        input.dispatchEvent(new Event("input"));
      }
      return dialog;
    },
    triggerAccessIssue(kind = "auth") {
      const key = kind === "auth" ? "kernelAuthRequired" : "kernelPermissionDenied";
      lastSearchDialog == null ? void 0 : lastSearchDialog.showKernelAccessIssue(kind, T(key));
    },
    openSettings(mode = "doc") {
      savedDiscoveryViews = [{
        id: "xlc-view-settings01",
        name: "\u5BA2\u670D\u8BDD\u672F",
        tag: "\u5BA2\u670D",
        scope: "document",
        targetDocId: "20240101120001-hijklmn",
        targetNotebookId: "",
        pathLabel: "/\u9879\u76EE\u7B14\u8BB0",
        defaultCategory: "\u5BA2\u670D"
      }];
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
        getConfig: () => ({ configVersion: 1, mode, notebookIds: mode === "notebook" ? ["20240101"] : [], containerDocIds: mode === "notebook" ? [] : ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1 }),
        library: {
          listNotebooks: async () => ({ ok: true, data: [{ id: "20240101", name: "\u7B14\u8BB0" }] }),
          listNotebookDocs: async () => ({ ok: true, data: [{ id: "20240101120001-hijklmn", name: "\u5E38\u7528\u5185\u5BB9\u5E93" }] }),
          createLibraryDoc: async () => ({ ok: true, data: { docId: "20240101120001-hijklmn" } }),
          searchDocs: async (k) => k ? { ok: true, data: [{ id: "20240101120001-hijklmn", hPath: "/\u5E38\u7528\u5185\u5BB9\u5E93", box: "nb", name: "\u5E38\u7528\u5185\u5BB9\u5E93" }] } : { ok: true, data: [] },
          getDocPath: async () => "/\u5E38\u7528\u5185\u5BB9\u5E93",
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
        },
        getSavedDiscoveryViews: () => savedDiscoveryViews,
        openSavedDiscoveryView: (view) => {
          document.body.dataset.xlcSavedViewOpened = view.id;
        },
        deleteSavedDiscoveryView: (id) => {
          savedDiscoveryViews = savedDiscoveryViews.filter((view) => view.id !== id);
        }
      };
      openSettingsDialog(ctx);
    },
    openSetup(options) {
      let notebookRequests = 0;
      let notebookDocRequests = 0;
      let docSearchRequests = 0;
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
        getConfig: () => (options == null ? void 0 : options.existingMode) === "notebook" ? { configVersion: 1, mode: "notebook", notebookIds: ["20240101"], containerDocIds: [], createdDocIds: [], configuredAt: 1 } : (options == null ? void 0 : options.existingMode) ? { configVersion: 1, mode: options.existingMode, notebookIds: [], containerDocIds: ["20240101120001-hijklmn"], createdDocIds: [], configuredAt: 1 } : null,
        library: {
          listNotebooks: async () => {
            notebookRequests++;
            return (options == null ? void 0 : options.notebookLoadError) && notebookRequests === 1 ? { ok: false, reason: "kernel-error", message: "offline" } : { ok: true, data: [{ id: "20240101", name: "\u7B14\u8BB0" }] };
          },
          listNotebookDocs: async () => {
            notebookDocRequests++;
            if (options == null ? void 0 : options.notebookDocsDelayMs) await new Promise((resolve) => setTimeout(resolve, options.notebookDocsDelayMs));
            if ((options == null ? void 0 : options.notebookDocsCheckError) && notebookDocRequests === 1) return { ok: false, reason: "kernel-error", message: "offline" };
            return { ok: true, data: (options == null ? void 0 : options.emptyNotebook) ? [] : [{ id: "20240101120001-hijklmn", name: "\u5E38\u7528\u5185\u5BB9\u5E93" }] };
          },
          createLibraryDoc: async () => ({ ok: true, data: { docId: "20240101120001-hijklmn" } }),
          searchDocs: async (k) => {
            var _a, _b, _c, _d, _e;
            docSearchRequests++;
            const delay = (_c = (_b = (_a = options == null ? void 0 : options.docSearchDelayByKeyword) == null ? void 0 : _a[k]) != null ? _b : options == null ? void 0 : options.docSearchDelayMs) != null ? _c : 0;
            if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
            if ((options == null ? void 0 : options.docSearchErrorOnce) && docSearchRequests === 1) return { ok: false, reason: "kernel-error", message: "offline" };
            return k ? { ok: true, data: [{ id: "20240101120001-hijklmn", hPath: (_e = (_d = options == null ? void 0 : options.docSearchPathByKeyword) == null ? void 0 : _d[k]) != null ? _e : "/\u5E38\u7528\u5185\u5BB9\u5E93", box: "nb", name: "\u5E38\u7528\u5185\u5BB9\u5E93" }] } : { ok: true, data: [] };
          },
          getDocPath: async () => "/\u5E38\u7528\u5185\u5BB9\u5E93",
          reindex: async () => ({ entries: [], items: /* @__PURE__ */ new Map(), truncated: false, docsScanned: 0, errors: [], builtAt: 1 })
        },
        ai: { updateSettings: () => {
        }, getSettings: () => ({ enabled: false, shareContent: false }) },
        registry: { list: () => [], listExecutable: () => [] },
        notify: (_kind, message) => {
          document.body.dataset.xlcSetupNotice = message;
        },
        applyConfig: (config) => {
          document.body.dataset.xlcSetupConfig = JSON.stringify(config);
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
    openCapture(aiOn = true, aiDelayMs = 0, options) {
      let tidyCall = 0;
      let draftCall = 0;
      const capture = new CaptureDialog({
        t: T,
        getSelectionText: () => ({ text: "", blockId: null }),
        currentDocId: () => "20240101120001-hijklmn",
        readClipboardText: async () => "",
        createItem: async (input) => {
          var _a;
          captureCreatedItems.push(input);
          document.body.dataset.xlcCaptureCreatedItems = JSON.stringify(captureCreatedItems);
          return { ok: true, message: (_a = input.title) != null ? _a : "item", itemId: "xlc-new000000001" };
        },
        notify: () => {
        },
        getBlockKramdown: async () => "\u5757\u5185\u5BB9",
        exportDocContent: async () => ({ hPath: "/\u5E38\u7528\u5185\u5BB9\u5E93", content: "# \u5185\u5BB9" }),
        aiEnabled: () => aiOn,
        aiTidy: async (content) => {
          tidyCall++;
          if (options == null ? void 0 : options.deferTidy) {
            return await new Promise((resolve) => {
              deferredTidyResponse = resolve;
              document.body.dataset.xlcDeferredTidyPending = "true";
            });
          }
          if (aiDelayMs) await new Promise((resolve) => setTimeout(resolve, aiDelayMs));
          captureAiTidyCalls.push(content);
          document.body.dataset.xlcCaptureAiTidyCalls = JSON.stringify(captureAiTidyCalls);
          if ((options == null ? void 0 : options.tidyFailureCall) === tidyCall) {
            if (options.tidyFailureKind === "throw") throw new Error("AI \u6574\u7406\u8BF7\u6C42\u6682\u65F6\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002");
            return { ok: false, message: "AI \u6574\u7406\u8BF7\u6C42\u6682\u65F6\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002" };
          }
          return { ok: true, title: "AI \u5EFA\u8BAE " + content.slice(0, 6), alias: "AI \u522B\u540D", tags: ["AI", "\u6A21\u677F"], category: "AI \u6A21\u677F" };
        },
        aiDraft: async (desc) => {
          draftCall++;
          if (aiDelayMs) await new Promise((resolve) => setTimeout(resolve, aiDelayMs));
          captureAiDraftCalls.push(desc);
          document.body.dataset.xlcCaptureAiDraftCalls = JSON.stringify(captureAiDraftCalls);
          if ((options == null ? void 0 : options.draftFailureCall) === draftCall) {
            if (options.draftFailureKind === "throw") throw new Error("AI \u8349\u7A3F\u8BF7\u6C42\u6682\u65F6\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002");
            return { ok: false, message: "AI \u8349\u7A3F\u8BF7\u6C42\u6682\u65F6\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002" };
          }
          return { ok: true, text: "\u8349\u7A3F\uFF08" + desc + "\uFF09" };
        },
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
    },
    openDiscovery(options) {
      let sessionId = "discovery-harness";
      let stopRequested = false;
      let notebookRequests = 0;
      let treeSearchRequests = 0;
      const sampleCandidates = [
        { key: "candidate-1", sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120002-bbbbbbb", sourcePath: "/\u9879\u76EE\u7B14\u8BB0", itemType: "markdown", title: "\u5BA2\u6237\u5EF6\u671F\u56DE\u590D", summary: "\u5173\u4E8E\u4EA4\u4ED8\u5EF6\u671F\u7684\u8BF4\u660E", tags: ["\u5BA2\u670D", "\u5EF6\u671F"], status: "candidate" },
        { key: "candidate-2", sourceDocId: "20240101120001-hijklmn", sourceBlockId: "20240101120003-ccccccc", sourcePath: "/\u9879\u76EE\u7B14\u8BB0", itemType: "text", title: "\u6536\u4EF6\u5730\u5740", summary: "\u90AE\u5BC4\u5730\u5740\u6A21\u677F", tags: ["\u5BA2\u670D", "\u5730\u5740"], status: "same-content", match: { itemId: "xlc-existing0001", title: "\u5DF2\u6709\u6536\u4EF6\u5730\u5740" } }
      ];
      if (options == null ? void 0 : options.longTag) sampleCandidates[0].tags.push(options.longTag);
      const candidates = (options == null ? void 0 : options.candidateCount) ? Array.from({ length: options.candidateCount }, (_, index) => ({
        key: `page-candidate-${String(index + 1).padStart(4, "0")}`,
        sourceDocId: "20240101120001-hijklmn",
        sourceBlockId: `2024010112${String(index + 2).padStart(4, "0")}-bbbbbbb`,
        sourcePath: "/\u9879\u76EE\u7B14\u8BB0",
        itemType: "markdown",
        title: `\u5206\u9875\u5019\u9009 ${String(index + 1).padStart(3, "0")}`,
        summary: "\u7528\u4E8E\u9A8C\u8BC1\u5019\u9009\u5206\u9875\u4E0E\u952E\u76D8\u7126\u70B9\u6062\u590D\u3002",
        tags: [],
        status: "candidate"
      })) : sampleCandidates;
      const makeView = (scope, stopped = false) => ({ id: sessionId, scope, sourceDocId: "20240101120001-hijklmn", sourceNotebookId: (options == null ? void 0 : options.unknownSourceNotebook) ? void 0 : "20240101120000-notebk1", sourcePath: "/\u9879\u76EE\u7B14\u8BB0", candidates: candidates.map((candidate) => ({ ...candidate })), scannedBlocks: 4, scannedDocs: 1, scannedNotebooks: scope === "all-notebooks" ? 2 : 1, skippedEmpty: 1, skippedLong: 0, truncated: stopped, stopped, truncationReasons: stopped ? ["cancelled"] : [], errors: [] });
      const service = {
        discoverCurrentDocument: async () => ({ ok: true, data: makeView("document") }),
        discoverCurrentNotebook: async (_docId, options2) => {
          var _a, _b;
          document.body.dataset.xlcDiscoveryScopeUsed = "current-notebook";
          stopRequested = false;
          (_a = options2 == null ? void 0 : options2.onProgress) == null ? void 0 : _a.call(options2, { phase: "enumerating", scannedDocs: 0, scannedBlocks: 0, discoveredDocs: 3 });
          (_b = options2 == null ? void 0 : options2.onProgress) == null ? void 0 : _b.call(options2, { phase: "scanning", scannedDocs: 1, scannedBlocks: 4, discoveredDocs: 3, totalDocs: 3 });
          await new Promise((resolve) => setTimeout(resolve, 80));
          return { ok: true, data: { ...makeView("notebook", stopRequested), scannedBlocks: 12, scannedDocs: 3, skippedEmpty: 2 } };
        },
        discoverTree: async (docId) => {
          document.body.dataset.xlcDiscoveryScopeUsed = "tree";
          document.body.dataset.xlcDiscoveryTargetDoc = docId;
          return { ok: true, data: makeView("tree") };
        },
        discoverNotebook: async (notebookId) => {
          document.body.dataset.xlcDiscoveryScopeUsed = "selected-notebook";
          document.body.dataset.xlcDiscoveryTargetNotebook = notebookId;
          return { ok: true, data: { ...makeView("notebook"), sourceNotebookId: notebookId } };
        },
        discoverAllNotebooks: async (options2) => {
          document.body.dataset.xlcDiscoveryScopeUsed = (options2 == null ? void 0 : options2.confirmed) ? "all-confirmed" : "all-unconfirmed";
          return (options2 == null ? void 0 : options2.confirmed) ? { ok: true, data: makeView("all-notebooks") } : { ok: false, reason: "invalid-input", message: "confirmation required" };
        },
        previewCandidate: async (_id, key) => {
          var _a;
          const candidate = (_a = candidates.find((item) => item.key === key)) != null ? _a : candidates[0];
          return { ok: true, data: { candidate: { ...candidate }, markdown: key === "candidate-2" ? "\u6536\u4EF6\u4EBA\uFF1A{{xlc:ask:\u6536\u4EF6\u4EBA}}\n\u5730\u5740\uFF1A{{xlc:ask:\u5730\u5740|textarea}}" : "\u60A8\u597D\uFF0C\u5173\u4E8E\u672C\u671F\u4EA4\u4ED8\u5EF6\u671F\uFF0C\u6211\u4EEC\u6DF1\u8868\u6B49\u610F\u3002", contentComparisonComplete: true } };
        },
        addCandidate: async (_id, key, options2) => {
          var _a, _b, _c;
          const recorded = (_a = window.__xlcDiscoveryCategories) != null ? _a : [];
          recorded.push({ key, category: options2 == null ? void 0 : options2.category });
          window.__xlcDiscoveryCategories = recorded;
          const candidate = (_b = candidates.find((item) => item.key === key)) != null ? _b : candidates[0];
          if (candidate.status === "same-content" && !(options2 == null ? void 0 : options2.allowSameContent)) {
            return { ok: true, data: { status: "same-content", itemId: "xlc-existing0001", title: "\u5DF2\u6709\u6536\u4EF6\u5730\u5740" } };
          }
          await new Promise((resolve) => setTimeout(resolve, 120));
          const id = key === "candidate-2" ? "xlc-discovered0002" : "xlc-discovered0001";
          return { ok: true, data: { status: "added", item: { id, title: candidate.title }, batchId: (_c = options2 == null ? void 0 : options2.batchId) != null ? _c : "batch-harness" } };
        },
        beginAddBatch: () => ({ ok: true, data: { batchId: "batch-harness" } }),
        finishAddBatch: (_id, batchId) => ({ ok: true, data: { batchId, added: 2, discarded: false } }),
        undoBatch: async (_id, batchId) => {
          await new Promise((resolve) => setTimeout(resolve, 120));
          return { ok: true, data: {
            batchId,
            deleted: 1,
            alreadyUndone: false,
            deletedItems: [{ itemId: "xlc-discovered0001", title: "\u5BA2\u6237\u5EF6\u671F\u56DE\u590D" }],
            skipped: [{ itemId: "xlc-discovered0002", title: "\u6536\u4EF6\u5730\u5740", reason: "not-found" }],
            failed: []
          } };
        },
        closeSession: () => {
          var _a, _b;
          document.body.dataset.xlcDiscoveryCloseAttempts = String(Number((_a = document.body.dataset.xlcDiscoveryCloseAttempts) != null ? _a : 0) + 1);
          if (document.body.dataset.xlcDiscoveryCloseConflict === "true") {
            return { ok: false, reason: "conflict", message: "write pending" };
          }
          document.body.dataset.xlcDiscoverySessionClosed = "true";
          document.body.dataset.xlcDiscoveryCloseSuccesses = String(Number((_b = document.body.dataset.xlcDiscoveryCloseSuccesses) != null ? _b : 0) + 1);
          return { ok: true, data: { closed: true, activeWrites: 0 } };
        },
        requestScanStop: () => {
          stopRequested = true;
          return true;
        }
      };
      document.body.dataset.xlcDiscoverySaveViewRejected = String((options == null ? void 0 : options.saveViewRejected) === true);
      discoveryController = openDiscoveryDialog({
        t: T,
        service,
        notify: (_kind, message) => {
          document.body.dataset.xlcDiscoveryNotice = message;
        },
        listNotebooks: async () => {
          notebookRequests++;
          if ((options == null ? void 0 : options.notebookLoadErrorOnce) && notebookRequests === 1) throw new Error("offline");
          if (options == null ? void 0 : options.emptyNotebookList) return [];
          return [{ id: "20240101120000-notebk1", name: "\u7B14\u8BB0\u672C\u4E00" }, { id: "20240102120000-notebk2", name: "\u7B14\u8BB0\u672C\u4E8C" }];
        },
        searchDocs: async (keyword) => {
          treeSearchRequests++;
          document.body.dataset.xlcDiscoveryTreeSearchRequests = String(treeSearchRequests);
          if (keyword === "\u65E7\u9879\u76EE") await new Promise((resolve) => setTimeout(resolve, 100));
          if (keyword === "\u9879\u76EE") return [{ id: "20240101120001-hijklmn", hPath: "/\u9879\u76EE\u7B14\u8BB0", box: "20240101120000-notebk1", name: "\u9879\u76EE\u7B14\u8BB0" }];
          if (keyword === "\u65B0\u9879\u76EE") return [{ id: "20240102120001-qrstuvw", hPath: "/\u65B0\u9879\u76EE", box: "20240102120000-notebk2", name: "\u65B0\u9879\u76EE" }];
          return [];
        },
        savedViews: savedDiscoveryViews,
        onSaveView: (view) => {
          var _a;
          document.body.dataset.xlcDiscoverySaveViewCalls = String(Number((_a = document.body.dataset.xlcDiscoverySaveViewCalls) != null ? _a : 0) + 1);
          if (document.body.dataset.xlcDiscoverySaveViewRejected === "true") return false;
          const saved = { id: "xlc-view-harness01", ...view };
          savedDiscoveryViews = [saved, ...savedDiscoveryViews.filter((entry) => entry.id !== saved.id)];
          document.body.dataset.xlcDiscoverySavedView = JSON.stringify(saved);
        }
      }, {
        docId: "20240101120001-hijklmn",
        sourcePath: "/\u9879\u76EE\u7B14\u8BB0",
        scope: (options == null ? void 0 : options.initialNotebookId) ? "notebook" : (options == null ? void 0 : options.initialTreeRoot) ? "tree" : void 0,
        initialTreeRootId: (options == null ? void 0 : options.initialTreeRoot) ? "20240101120001-hijklmn" : void 0,
        initialNotebookId: options == null ? void 0 : options.initialNotebookId,
        title: (options == null ? void 0 : options.initialTreeRoot) ? "\u4ECE\u6B64\u6587\u6863\u53D1\u73B0\u5E38\u7528\u8BED" : void 0,
        initialTag: options == null ? void 0 : options.initialTag,
        autoSelectFiltered: options == null ? void 0 : options.autoSelectFiltered,
        referenceOnly: options == null ? void 0 : options.referenceOnly,
        defaultCategory: options == null ? void 0 : options.defaultCategory
      });
    },
    closeDiscovery(force = false) {
      var _a;
      const closed = (_a = discoveryController == null ? void 0 : discoveryController.close(force)) != null ? _a : true;
      if (closed) discoveryController = null;
      return closed;
    },
    requestCloseDiscovery(callbackKey, force = false) {
      const onClosed = () => {
        var _a, _b;
        const calls = JSON.parse((_a = document.body.dataset.xlcDiscoveryCloseCallbacks) != null ? _a : "{}");
        calls[callbackKey] = ((_b = calls[callbackKey]) != null ? _b : 0) + 1;
        document.body.dataset.xlcDiscoveryCloseCallbacks = JSON.stringify(calls);
      };
      if (!discoveryController) {
        onClosed();
        return true;
      }
      const closed = discoveryController.close(force, onClosed);
      if (closed) discoveryController = null;
      return closed;
    },
    completeDeferredTidy() {
      deferredTidyResponse == null ? void 0 : deferredTidyResponse({ ok: true, title: "\u8FDF\u5230\u7684\u65E7\u5EFA\u8BAE", alias: "\u65E7\u522B\u540D", tags: ["\u65E7\u6807\u7B7E"], category: "\u65E7\u5206\u7C7B" });
      deferredTidyResponse = null;
    }
  };
})();
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 5.4.3 https://github.com/nodeca/js-yaml @license MIT *)
*/
