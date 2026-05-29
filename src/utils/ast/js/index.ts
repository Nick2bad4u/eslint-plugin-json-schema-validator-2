// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair -- ignore
/* eslint-disable @typescript-eslint/no-explicit-any -- ignore */
import type { AST } from "vue-eslint-parser";

import { arrayAt, arrayFirst, isPresent, keyIn } from "ts-extras";

import type { RuleContext, SourceCode } from "../../../types.ts";

import {
    findInitNode,
    getStaticPropertyName,
    getStaticValue,
} from "./utils.ts";

const UNKNOWN: unique symbol = Symbol("unknown value");
type TUnknown = typeof UNKNOWN;
const EMPTY_MAP = Object.freeze(new Map());
const UNKNOWN_PATH_DATA: SubPathData = { children: EMPTY_MAP, data: UNKNOWN };
const UNKNOWN_STRING_PATH_DATA: SubPathData = {
    children: EMPTY_MAP,
    data: "UNKNOWN",
};
export interface AnalyzedJsAST {
    object: unknown;
    pathData: PathData;
}

export interface PathData {
    children: Readonly<Map<string, PathData | TUnknown>>;
    data: unknown;
    key:
        | ((sourceCode: SourceCode) => [number, number] | null)
        | [number, number]
        | null;
}
type BinaryOperator =
    | "!="
    | "!=="
    | "%"
    | "&"
    | "*"
    | "**"
    | "+"
    | "-"
    | "/"
    | "<"
    | "<<"
    | "<="
    | "=="
    | "==="
    | ">"
    | ">="
    | ">>"
    | ">>>"
    | "^"
    | "in"
    | "instanceof"
    | "|";

type SubPathData = Pick<PathData, "children" | "data">;

type UnaryOperator = "!" | "+" | "-" | "delete" | "typeof" | "void" | "~";
/**
 * Analyze JavaScript AST
 */
export function analyzeJsAST(
    node: AST.ESLintExpression,
    rootRange: [number, number],
    context: RuleContext
): AnalyzedJsAST | null {
    const data = getPathData(node, context);
    if (data.data === UNKNOWN) {
        return null;
    }
    const pathData: PathData = {
        key: rootRange,
        ...data,
    };
    const result: AnalyzedJsAST = {
        object: data.data,
        pathData,
    };

    return result;
}
const CALC_UNARY: Record<UnaryOperator, ((v: any) => unknown) | null> = {
    "!": (v) => !v,
    "+": Number,
    "-": (v) => -v,
    delete: null,
    typeof: (v) => typeof v,
    void: () => undefined,
    "~": (v) => ~v,
};
const CALC_BINARY: Record<
    BinaryOperator,
    ((v1: any, v2: any) => unknown) | null
> = {
    "!=": (v1, v2) => v1 != v2,

    "!==": (v1, v2) => v1 !== v2,
    "%": (v1, v2) => v1 % v2,
    "&": (v1, v2) => v1 & v2,
    "*": (v1, v2) => v1 * v2,
    "**": (v1, v2) => v1 ** v2,
    "+": (v1, v2) => v1 + v2,
    "-": (v1, v2) => v1 - v2,
    "/": (v1, v2) => v1 / v2,
    "<": (v1, v2) => v1 < v2,
    "<<": (v1, v2) => v1 << v2,
    "<=": (v1, v2) => v1 <= v2,
    "==": (v1, v2) => v1 == v2,
    "===": (v1, v2) => v1 === v2,
    ">": (v1, v2) => v1 > v2,
    ">=": (v1, v2) => v1 >= v2,
    ">>": (v1, v2) => v1 >> v2,
    ">>>": (v1, v2) => v1 >>> v2,
    "^": (v1, v2) => v1 ^ v2,
    in: (v1, v2) => keyIn(v2, v1),
    instanceof: (v1, v2) => v1 instanceof v2,
    "|": (v1, v2) => v1 | v2,
};

const VISITORS = {
    ArrayExpression(
        node: AST.ESLintArrayExpression,
        context: RuleContext
    ): SubPathData {
        const data: any[] = [];
        const children: SubPathData["children"] = new Map();
        for (let index = 0; index < node.elements.length; index++) {
            const element = node.elements[index];
            if (element) {
                if (element.type !== "SpreadElement") {
                    const propData = getPathData(element, context);
                    if (propData.data === UNKNOWN) {
                        data[index] = UNKNOWN;
                        children.set(String(index), UNKNOWN);
                    } else {
                        data[index] = propData.data;
                        children.set(String(index), {
                            key: element.range,
                            ...propData,
                        });
                    }
                }
            } else {
                data[index] = undefined;
                children.set(String(index), {
                    children: EMPTY_MAP,
                    data: undefined,
                    key: (sourceCode) => {
                        const before = node.elements
                            .slice(0, index)
                            .reverse()
                            .find((n) => isPresent(n));
                        let tokenIndex = before
                            ? node.elements.indexOf(before)
                            : -1;
                        let token = before
                            ? sourceCode.getTokenAfter(before)!
                            : sourceCode.getFirstToken(node);
                        while (tokenIndex < index) {
                            tokenIndex++;
                            token = sourceCode.getTokenAfter(token)!;
                        }

                        return [
                            sourceCode.getTokenBefore(token)!.range![1],
                            arrayFirst(token.range!),
                        ];
                    },
                });
            }
        }

        return {
            children,
            data,
        };
    },
    ArrowFunctionExpression() {
        return UNKNOWN_PATH_DATA;
    },
    AssignmentExpression(
        node: AST.ESLintAssignmentExpression,
        context: RuleContext
    ): SubPathData {
        const rightData = getPathData(node.right, context);
        return rightData;
    },
    AwaitExpression() {
        return UNKNOWN_PATH_DATA;
    },
    BinaryExpression(
        node: AST.ESLintBinaryExpression,
        context: RuleContext
    ): SubPathData {
        if (node.left.type === "PrivateIdentifier") {
            return UNKNOWN_PATH_DATA;
        }
        const leftData = getPathData(node.left, context);
        if (leftData.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }
        const rightData = getPathData(node.right, context);
        if (rightData.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }
        const calc = CALC_BINARY[node.operator];
        if (!calc) {
            return UNKNOWN_PATH_DATA;
        }
        const data: unknown = calc(leftData.data, rightData.data);

        return {
            children: EMPTY_MAP,
            data,
        };
    },
    CallExpression(
        node: AST.ESLintCallExpression,
        context: RuleContext
    ): SubPathData {
        const evalData = getStaticValue(context, node);
        if (!evalData) {
            if (
                node.callee.type === "MemberExpression" &&
                node.callee.object.type === "Identifier" &&
                node.callee.object.name === "require" &&
                getStaticPropertyName(node.callee, context) === "resolve"
            ) {
                return UNKNOWN_STRING_PATH_DATA;
            }
            return UNKNOWN_PATH_DATA;
        }
        return {
            children: EMPTY_MAP,
            data: evalData.value,
        };
    },
    ChainExpression() {
        return UNKNOWN_PATH_DATA;
    },
    ClassExpression() {
        return UNKNOWN_PATH_DATA;
    },
    ConditionalExpression(
        node: AST.ESLintConditionalExpression,
        context: RuleContext
    ): SubPathData {
        const testData = getPathData(node.test, context);
        if (testData.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }
        if (testData.data) {
            return getPathData(node.consequent, context);
        }
        return getPathData(node.alternate, context);
    },
    FunctionExpression() {
        return UNKNOWN_PATH_DATA;
    },
    Identifier(node: AST.ESLintIdentifier, context: RuleContext): SubPathData {
        const init = findInitNode(context, node);
        if (init == null) {
            const evalData = getStaticValue(context, node);
            if (evalData != null) {
                return {
                    children: EMPTY_MAP,
                    data: evalData.value,
                };
            }

            return UNKNOWN_PATH_DATA;
        }
        const data = getPathData(init.node, context);
        if (typeof data.data === "object" && data.data != null) {
            for (const readId of init.reads) {
                const props = getWriteProps(readId);
                if (props == null) {
                    continue;
                }
                let objData = data;
                let obj: Record<string, any> = data.data;
                while (props.length > 0) {
                    const prop = props.shift()!;
                    const child = objData.children.get(prop);
                    if (child) {
                        if (child === UNKNOWN) {
                            break;
                        }
                        const nextObj = obj[prop];
                        if (typeof nextObj === "object" && nextObj != null) {
                            objData = child;
                            obj = obj[prop];
                        } else {
                            break;
                        }
                    } else {
                        obj[prop] = UNKNOWN;
                        objData.children.set(prop, UNKNOWN);
                        break;
                    }
                }
            }
        }
        /**
         * Get write properties from given Identifier
         */
        function getWriteProps(id: AST.ESLintIdentifier) {
            if (
                id.parent?.type !== "MemberExpression" ||
                id.parent.object !== id
            ) {
                return null;
            }
            const results: string[] = [];
            let mem = id.parent;
            while (mem) {
                const name = getStaticPropertyName(mem, context);
                if (name == null) {
                    break;
                }
                results.push(name);
                if (
                    mem.parent?.type !== "MemberExpression" ||
                    mem.parent.object !== mem
                ) {
                    break;
                }
                mem = mem.parent;
            }
            if (mem.parent?.type !== "AssignmentExpression") {
                return null;
            }
            return results;
        }
        return data;
    },
    Literal(node: AST.ESLintLiteral, _context: RuleContext): SubPathData {
        return {
            children: EMPTY_MAP,
            data: node.value,
        };
    },
    LogicalExpression(
        node: AST.ESLintLogicalExpression,
        context: RuleContext
    ): SubPathData {
        const leftData = getPathData(node.left, context);
        if (leftData.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }
        const operator: "&&" | "??" | "||" = node.operator;
        switch (operator) {
            case "&&": {
                if (!leftData.data) {
                    return leftData;
                }

                break;
            }
            case "??": {
                if (leftData.data != null) {
                    return leftData;
                }

                break;
            }
            case "||": {
                if (leftData.data) {
                    return leftData;
                }

                break;
            }
            default: {
                return UNKNOWN_PATH_DATA;
            }
        }
        const rightData = getPathData(node.right, context);
        return rightData;
    },
    MemberExpression(
        node: AST.ESLintMemberExpression,
        context: RuleContext
    ): SubPathData {
        if (node.object.type === "Super") {
            return UNKNOWN_PATH_DATA;
        }
        const objectData = getPathData(node.object, context);
        if (objectData.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }

        const propName = getStaticPropertyName(node, context);
        if (propName == null) {
            return UNKNOWN_PATH_DATA;
        }

        const define = objectData.children.get(propName);
        if (define && define !== UNKNOWN) {
            return define;
        }
        if (objectData.data != null) {
            return {
                children: EMPTY_MAP,
                data: (objectData.data as any)[propName],
            };
        }

        return UNKNOWN_PATH_DATA;
    },
    MetaProperty() {
        return UNKNOWN_PATH_DATA;
    },
    NewExpression(
        node: AST.ESLintNewExpression,
        context: RuleContext
    ): SubPathData {
        const evalData = getStaticValue(context, node);
        if (!evalData) {
            return UNKNOWN_PATH_DATA;
        }
        return {
            children: EMPTY_MAP,
            data: evalData.value,
        };
    },
    ObjectExpression(
        node: AST.ESLintObjectExpression,
        context: RuleContext
    ): SubPathData {
        const data: Record<string, any> = {};
        const children: SubPathData["children"] = new Map();
        for (const prop of node.properties) {
            if (prop.type === "Property") {
                const keyName = getStaticPropertyName(prop, context);
                if (keyName != null) {
                    const propData = getPathData(
                        prop.value as AST.ESLintExpression,
                        context
                    );
                    if (propData.data === UNKNOWN) {
                        data[keyName] = UNKNOWN;
                        children.set(keyName, UNKNOWN);
                    } else {
                        data[keyName] = propData.data;
                        children.set(keyName, {
                            key: prop.key.range,
                            ...propData,
                        });
                    }
                }
            } else if (prop.type === "SpreadElement") {
                const propData = getPathData(prop.argument, context);
                for (const [key, val] of propData.children.entries()) {
                    data[key] = (propData.data as any)[key];
                    children.set(key, val);
                }
            }
        }

        return {
            children,
            data,
        };
    },
    SequenceExpression(
        node: AST.ESLintSequenceExpression,
        context: RuleContext
    ): SubPathData {
        const last = arrayAt(node.expressions, -1);
        if (!last) {
            return UNKNOWN_PATH_DATA;
        }
        return getPathData(last, context);
    },
    TaggedTemplateExpression(
        node: AST.ESLintTaggedTemplateExpression,
        context: RuleContext
    ): SubPathData {
        const tag = getPathData(node.tag, context);
        if (tag.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }
        if (tag.data !== String.raw) {
            return UNKNOWN_PATH_DATA;
        }
        const expressions = [];
        for (const e of node.quasi.expressions) {
            const data = getPathData(e, context);
            if (data.data === UNKNOWN) {
                return UNKNOWN_PATH_DATA;
            }
            expressions.push(data.data);
        }

        const strings = node.quasi.quasis.map((q) => q.value.cooked);
        (strings as any).raw = node.quasi.quasis.map((q) => q.value.raw);

        const data = String.raw(strings as never, ...expressions);

        return {
            children: EMPTY_MAP,
            data,
        };
    },
    TemplateLiteral(
        node: AST.ESLintTemplateLiteral,
        context: RuleContext
    ): SubPathData {
        const expressions = [];
        for (const e of node.expressions) {
            const data = getPathData(e, context);
            if (data.data === UNKNOWN) {
                return UNKNOWN_STRING_PATH_DATA;
            }
            expressions.push(data.data);
        }
        const firstQuasi = arrayFirst(node.quasis);
        if (!firstQuasi) {
            return UNKNOWN_STRING_PATH_DATA;
        }
        let data = firstQuasi.value.cooked ?? firstQuasi.value.raw;
        for (const [i, expression] of expressions.entries()) {
            const quasi = node.quasis[i + 1];
            if (!quasi) {
                return UNKNOWN_STRING_PATH_DATA;
            }
            data += String(expression);
            data += quasi.value.cooked ?? quasi.value.raw;
        }
        return { children: EMPTY_MAP, data };
    },
    ThisExpression() {
        return UNKNOWN_PATH_DATA;
    },
    UnaryExpression(
        node: AST.ESLintUnaryExpression,
        context: RuleContext
    ): SubPathData {
        const argData = getPathData(node.argument, context);
        if (argData.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }
        const calc = CALC_UNARY[node.operator];
        if (!calc) {
            return UNKNOWN_PATH_DATA;
        }
        const data: unknown = calc(argData.data);

        return {
            children: EMPTY_MAP,
            data,
        };
    },
    UpdateExpression() {
        return UNKNOWN_PATH_DATA;
    },
    YieldExpression() {
        return UNKNOWN_PATH_DATA;
    },
};

/**
 * Get path data
 */
function getPathData(
    node: AST.ESLintExpression,
    context: RuleContext
): SubPathData {
    const visitor = VISITORS[node.type];
    if (visitor) {
        return visitor(node as any, context);
    }
    return UNKNOWN_PATH_DATA;
}
