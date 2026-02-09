import { autocompletionData } from "./autocompletionData";
import { GluaFunc } from "./luaFunc";
import { GluaEnum } from "./luaEnum";
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
    [key: string]: unknown;
};

type WikiEnumItem = {
    items?: unknown;
    description?: WikiElementDescription;
    [key: string]: unknown;
};

export type WikiScraperData = {
    realms: string[];
    function?: WikiElement;
    enum?: WikiEnumItem | WikiEnumItem[];
    example?: WikiElementExample | WikiElementExample[];
    description?: WikiElementDescription;
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
    parentDescription?: WikiElementDescription,
) {
    if (Array.isArray((elem as { enum?: unknown }).enum)) {
        (elem as { enum: unknown[] }).enum.forEach((element: unknown) => {
            addEnum({ items: element } as WikiEnumItem, parentDescription);
        });
        return;
    }

    let enums: WikiEnumItem[];
    let description: WikiElementDescription | undefined = parentDescription;

    if (Array.isArray(elem)) {
        enums = elem;
    } else {
        const enumItem = elem as WikiEnumItem;
        description = enumItem.description || parentDescription;
        if (
            enumItem.items &&
            typeof enumItem.items === "object" &&
            "item" in enumItem.items
        ) {
            const itemsWrapper = enumItem.items as {
                item: WikiEnumItem | WikiEnumItem[];
            };
            enums = Array.isArray(itemsWrapper.item)
                ? itemsWrapper.item
                : [itemsWrapper.item];
        } else {
            enums = [enumItem];
        }
    }

    enums.forEach((element: WikiEnumItem) => {
        if (element.items) {
            addEnum(element, description);

            return;
        }

        const enumObj = new GluaEnum(element);

        if (autocompletionData.valuesLookup.has(enumObj.key)) return;

        enumObj.tableDesc = description?.text || "";
        autocompletionData.valuesLookup.set(enumObj.key, enumObj);
        autocompletionData.enums.push(enumObj);
    });
}

let scrapedWikiData: WikiScraperData[];
const request = axios.create({});

async function FetchGwiki() {
    scrapedWikiData = (
        await request.get(
            "https://metastruct.github.io/gmod-wiki-scraper/gwiki.json",
        )
    ).data as WikiScraperData[];
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
        } else if (elem.enum) addEnum(elem.enum);
    });

    autocompletionData.ClearAutocompleteCache();
}

export function AddCustomData(elems: WikiScraperData[]) {
    elems.forEach((elem) => {
        if (elem.function) {
            const funcElem = elem.function;

            PreprocessGWikiElem(funcElem, elem);

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
        } else if (elem.enum) addEnum(elem.enum);
    });

    autocompletionData.ClearAutocompleteCache();
}
