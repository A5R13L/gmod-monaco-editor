import { autocompletionData } from "./autocompletionData";
import { GluaFunc } from "./luaFunc";
import { GluaEnum } from "./luaEnum";
import { enumPageFromLink, resolveEnumPage } from "./wikiLinks";
import axios from "axios";

type WikiElementExample = {
    code: string;
    description?: string;
    output?: string;
};

type WikiElementDescription = {
    text: string;
    internal?: string;
    deprecated?: string;
};

type WikiElementArgs = {
    text: string;
    name: string;
    type: string;
    default?: string;
};

type WikiElementRets = {
    text: string;
    name: string;
    type: string;
};

type WikiElementArgsWrapper = {
    arg: WikiElementArgs | WikiElementArgs[];
};

type WikiElementRetsWrapper = {
    ret: WikiElementRets | WikiElementRets[];
};

type WikiElement = {
    args?: WikiElementArgs[] | WikiElementArgsWrapper;
    rets?: WikiElementRets[] | WikiElementRetsWrapper;
    description?: string | WikiElementDescription;
    example?: WikiElementExample | WikiElementExample[];
    link?: string;
    [key: string]: unknown;
};

type WikiEnumItem = {
    key?: string;
    items?: unknown;
    description?: WikiElementDescription;
    realm?: string;
    [key: string]: unknown;
};

export type WikiScraperData = {
    realms: string[];
    link?: string;
    function?: WikiElement;
    enum?: WikiEnumItem | WikiEnumItem[];
    example?: WikiElementExample | WikiElementExample[];
    description?: WikiElementDescription;
    realm?: string;
    [key: string]: unknown;
};

function PreprocessGWikiElem(
    elem: WikiElement,
    parentElem: WikiElement | WikiScraperData,
) {
    if (elem.args && !Array.isArray(elem.args) && "arg" in elem.args) {
        const argsWrapper = elem.args as WikiElementArgsWrapper;
        if (Array.isArray(argsWrapper.arg)) elem.args = argsWrapper.arg;
        else elem.args = [argsWrapper.arg];
    } else if (!elem.args || !Array.isArray(elem.args)) {
        elem.args = [];
    }

    if (elem.rets && !Array.isArray(elem.rets) && "ret" in elem.rets) {
        const retsWrapper = elem.rets as WikiElementRetsWrapper;
        if (Array.isArray(retsWrapper.ret)) elem.rets = retsWrapper.ret;
        else elem.rets = [retsWrapper.ret];
    } else if (!elem.rets || !Array.isArray(elem.rets)) {
        elem.rets = [];
    }

    if (typeof elem.description === "string")
        elem.description = { text: elem.description };

    if (elem.description && !elem.description.text) elem.description.text = "";
    else if (!elem.description) elem.description = { text: "" };

    elem.example = elem.example || (parentElem as WikiElement).example;

    if (elem.example) {
        if (!Array.isArray(elem.example)) elem.example = [elem.example];

        const exampleArray = elem.example as WikiElementExample[];
        for (let idx = exampleArray.length - 1; idx >= 0; idx--) {
            if (typeof exampleArray[idx].code !== "string") {
                exampleArray.splice(idx, 1);
            }
        }
        elem.example = exampleArray;
    } else elem.example = [];
}

function addEnum(
    elem: WikiEnumItem | WikiEnumItem[],
    link?: string,
    parentMeta?: { description?: WikiElementDescription; realm?: string },
) {
    if (Array.isArray((elem as { enum?: unknown }).enum)) {
        (elem as { enum: unknown[] }).enum.forEach((element: unknown) => {
            addEnum({ items: element } as WikiEnumItem, link, parentMeta);
        });
        return;
    }

    let enums: WikiEnumItem[];
    let container: WikiEnumItem;

    if (Array.isArray(elem)) {
        enums = elem;
        container = { description: parentMeta?.description };
    } else {
        container = elem as WikiEnumItem;
        if (
            container.items &&
            typeof container.items === "object" &&
            "item" in container.items
        ) {
            const itemsWrapper = container.items as {
                item: WikiEnumItem | WikiEnumItem[];
            };
            enums = Array.isArray(itemsWrapper.item)
                ? itemsWrapper.item
                : [itemsWrapper.item];
        } else {
            enums = [container];
        }
    }

    const wikiPage =
        enumPageFromLink(link) ??
        resolveEnumPage(
            enums
                .map((element) => element.key)
                .filter((key): key is string => typeof key === "string"),
        );

    enums.forEach((element: WikiEnumItem) => {
        if (element.items) {
            addEnum(element, link, {
                description: container.description ?? parentMeta?.description,
                realm: container.realm ?? parentMeta?.realm,
            });

            return;
        }

        const enumObj = new GluaEnum(element);

        if (!enumObj.key) return;
        if (autocompletionData.valuesLookup.has(enumObj.key)) return;

        enumObj.tableDesc =
            container.description ?? parentMeta?.description ?? "";
        enumObj.realm =
            enumObj.realm ??
            container.realm ??
            parentMeta?.realm ??
            "";
        enumObj.wikiPage = wikiPage;
        autocompletionData.valuesLookup.set(enumObj.key, enumObj);
        autocompletionData.enums.push(enumObj);
    });
}

let scrapedWikiData: WikiScraperData[];
const request = axios.create({});

async function FetchGwiki() {
    try {
        scrapedWikiData = (
            await request.get(
                "https://metastruct.github.io/gmod-wiki-scraper/gwiki.json",
            )
        ).data as WikiScraperData[];
    } catch (err) {
        console.error("[wikiScraper] Failed to load gwiki.json:", err);
        scrapedWikiData = [];
    }
}

/** All GM hook names for hook.Add, regardless of Client/Server realm filter. */
function mergeGmHooksFromWiki(): void {
    if (!scrapedWikiData) return;

    const seen = new Set(autocompletionData.hooks.map((hook) => hook.name));

    for (const elem of scrapedWikiData) {
        const funcElem = elem.function;
        if (
            !funcElem ||
            funcElem.type !== "hook" ||
            funcElem.parent !== "GM" ||
            typeof funcElem.name !== "string"
        ) {
            continue;
        }
        if (seen.has(funcElem.name)) continue;

        PreprocessGWikiElem(funcElem, elem);
        funcElem.link = elem.link;

        const func = new GluaFunc(funcElem);
        autocompletionData.hooks.push(func);
        seen.add(func.name);

        if (!autocompletionData.valuesLookup.has(func.name)) {
            autocompletionData.valuesLookup.set(func.name, func);
        }
    }
}

export async function LoadAutocompletionData(currentState: string) {
    if (!scrapedWikiData) await FetchGwiki();

    scrapedWikiData.forEach((elem) => {
        if (currentState == "Shared") {
            if (elem.realms.length == 1 && elem.realms[0] == "Menu") return;
        } else if (elem.realms.indexOf(currentState) === -1) return;

        if (elem.function) {
            const funcElem = elem.function;

            PreprocessGWikiElem(funcElem, elem);

            funcElem.link = elem.link;

            const func = new GluaFunc(funcElem);

            autocompletionData.valuesLookup.set(func.getFullName(), func);

            if (autocompletionData.modules.indexOf(func.parent) === -1)
                autocompletionData.modules.push(func.parent);

            if (func.type === "classfunc" || func.type === "panelfunc") {
                autocompletionData.classmethods.push(func);

                if (autocompletionData.methodsLookup.has(func.name))
                    autocompletionData.methodsLookup.get(func.name)?.push(func);
                else autocompletionData.methodsLookup.set(func.name, [func]);
            } else if (func.type === "hook") {
                autocompletionData.valuesLookup.set(func.name, func);
                autocompletionData.hooks.push(func);
            } else autocompletionData.functions.push(func);
        } else if (elem.enum) {
            addEnum(elem.enum, elem.link, {
                description: elem.description,
                realm: elem.realm,
            });
        }
    });

    mergeGmHooksFromWiki();
    autocompletionData.ClearAutocompleteCache();
}

export function AddCustomData(elems: WikiScraperData[]) {
    elems.forEach((elem) => {
        if (elem.function) {
            const funcElem = elem.function;

            PreprocessGWikiElem(funcElem, elem);

            funcElem.link = elem.link;

            const func = new GluaFunc(funcElem);

            autocompletionData.valuesLookup.set(func.getFullName(), func);

            if (autocompletionData.modules.indexOf(func.parent) === -1)
                autocompletionData.modules.push(func.parent);

            if (func.type === "classfunc" || func.type === "panelfunc") {
                autocompletionData.classmethods.push(func);

                if (autocompletionData.methodsLookup.has(func.name))
                    autocompletionData.methodsLookup.get(func.name)?.push(func);
                else autocompletionData.methodsLookup.set(func.name, [func]);
            } else if (func.type === "hook") {
                autocompletionData.valuesLookup.set(func.name, func);
                autocompletionData.hooks.push(func);
            } else autocompletionData.functions.push(func);
        } else if (elem.enum) {
            addEnum(elem.enum, elem.link, {
                description: elem.description,
                realm: elem.realm,
            });
        }
    });

    mergeGmHooksFromWiki();
    autocompletionData.ClearAutocompleteCache();
}
