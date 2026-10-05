// 测试专用单一入口：所有被测模块打进同一个 bundle，保证模块实例唯一
// （如 pinyin.ts 的模块级适配器状态在 search 与测试间共享）。
import * as item from "../src/model/item";
import * as storage from "../src/model/storage";
import * as protocol from "../src/model/protocol";
import * as actions from "../src/model/actions";
import * as search from "../src/model/search";
import * as pinyin from "../src/model/pinyin";
import * as transfer from "../src/model/transfer";
import * as client from "../src/kernel/client";
import * as lru from "../src/model/lru";
import * as pinyin from "../src/model/pinyin";
import * as pinyinTiny from "../src/model/pinyin-tiny";
import * as library from "../src/service/library";
import * as commands from "../src/service/commands";
import * as providers from "../src/service/providers";
import * as service from "../src/service/service";
import * as ai from "../src/service/ai";

export {
    item,
    storage,
    protocol,
    actions,
    search,
    pinyin,
    pinyinTiny,
    transfer,
    client,
    lru,
    library,
    commands,
    providers,
    service,
    ai,
};
