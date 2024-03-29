import { autocompletionData } from "./autocompletionData";
import { GluaFunc } from "./luaFunc";
import { GluaEnum } from "./luaEnum";
import axios from "axios";

function PreprocessGWikiElem(elem: any, parentElem: any) {
    if (elem.args && elem.args.arg) {
        if (Array.isArray(elem.args.arg)) elem.args = elem.args.arg;
        else elem.args = [elem.args.arg];
    } else elem.args = [];

    if (elem.rets && elem.rets.ret) {
        if (Array.isArray(elem.rets.ret)) elem.rets = elem.rets.ret;
        else elem.rets = [elem.rets.ret];
    } else elem.rets = [];

    if (typeof elem.description === "string")
        elem.description = { text: elem.description };

    if (elem.description && !elem.description.text) elem.description.text = "";
    else if (!elem.description) elem.description = { text: "" };

    elem.example = elem.example || parentElem.example;

    if (elem.example) {
        if (Array.isArray(elem.example)) elem.example = elem.example;
        else elem.example = [elem.example];

        elem.example.forEach((element: { code: any }, idx: any) => {
            if (typeof element.code !== "string") {
                elem.example.splice(idx, 1);
            }
        });
    } else elem.example = [];
}

function addEnum(elem: any) {
    if (Array.isArray(elem.enum)) {
        elem.enum.forEach((element: any) => {
            addEnum({ items: element });
        });
        return;
    }

    let enums;

    if (Array.isArray(elem)) enums = elem;
    else enums = elem.items.item;

    enums.forEach((element: { items: any }) => {
        if (element.items) {
            addEnum(element);

            return;
        }

        const enumObj = new GluaEnum(element);

        if (autocompletionData.valuesLookup.has(enumObj.key)) return;

        enumObj.tableDesc = elem.description;
        autocompletionData.valuesLookup.set(enumObj.key, enumObj);
        autocompletionData.enums.push(enumObj);
    });
}

export let gwikiData: any[];
const request = axios.create();

export async function FetchGwiki() {
    gwikiData = (
        await request(
            "https://metastruct.github.io/gmod-wiki-scraper/gwiki.json",
        )
    ).data;
}

export async function LoadAutocompletionData(currentState: string) {
    if (!gwikiData) await FetchGwiki();

    gwikiData.forEach((elem) => {
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

export function AddCustomData(elems: any[]) {
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
