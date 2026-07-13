import type { ArrayElement, UnknownRecord } from "type-fest";
import type { AST } from "vue-eslint-parser";

import {
    arrayAt,
    arrayFirst,
    isPresent,
    keyIn,
    objectAssign,
    setHas,
} from "ts-extras";

import type { RuleContext, SourceCode } from "../../../types.js";

import {
    findInitNode,
    getStaticPropertyName,
    getStaticValue,
} from "./utils.js";

const UNKNOWN: unique symbol = Symbol("unknown value");
type TUnknown = typeof UNKNOWN;
const EMPTY_MAP = Object.freeze(new Map());
const UNKNOWN_PATH_DATA: SubPathData = { children: EMPTY_MAP, data: UNKNOWN };
const UNKNOWN_STRING_PATH_DATA: SubPathData = {
    children: EMPTY_MAP,
    data: "UNKNOWN",
};
const PATTERN_ONLY_TYPES: ReadonlySet<AST.ESLintPattern["type"]> = new Set<
    AST.ESLintPattern["type"]
>([
    "ArrayPattern",
    "AssignmentPattern",
    "ExperimentalRestProperty",
    "ObjectPattern",
    "RestElement",
    "RestProperty",
]);
/** Result of evaluating a JavaScript expression into schema-checkable data. */
export interface AnalyzedJsAST {
    object: unknown;
    pathData: PathData;
}

/** Evaluated value metadata keyed by JSON-schema-style property paths. */
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

type BitwiseOperands =
    | { kind: "bigint"; left: bigint; right: bigint }
    | { kind: "number"; left: number; right: number };
type ObjectExpressionProperty = ArrayElement<
    AST.ESLintObjectExpression["properties"]
>;
type StaticObject = UnknownRecord;

type SubPathData = Pick<PathData, "children" | "data">;

type UnaryOperator =
    | "!"
    | "+"
    | "-"
    | "delete"
    | "typeof"
    | "void"
    | "~";
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
    return {
        object: data.data,
        pathData,
    };
}
const CALC_UNARY: Record<UnaryOperator, ((v: unknown) => unknown) | null> = {
    "!": (v) => !isTruthy(v),
    "+": Number,
    "-": negateValue,
    delete: null,
    typeof: (v) => typeof v,
    void: () => undefined,
    "~": bitwiseNotValue,
};

const VISITORS = {
    ArrayExpression(
        node: AST.ESLintArrayExpression,
        context: RuleContext
    ): SubPathData {
        const data: unknown[] = [];
        const children: SubPathData["children"] = new Map();
        for (const index of node.elements.keys()) {
            const element = arrayAt(node.elements, index);
            if (isPresent(element)) {
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
                    key: (sourceCode): [number, number] => {
                        const before = node.elements
                            .slice(0, index)
                            .toReversed()
                            .find((n) => isPresent(n));
                        let tokenIndex = before
                            ? node.elements.indexOf(before)
                            : -1;
                        let token = before
                            ? sourceCode.getTokenAfter(before)
                            : sourceCode.getFirstToken(node);
                        while (tokenIndex < index) {
                            tokenIndex += 1;
                            token = sourceCode.getTokenAfter(
                                getRequiredToken(token, "array element")
                            );
                        }
                        const currentToken = getRequiredToken(
                            token,
                            "array element"
                        );
                        const previousToken = getRequiredToken(
                            sourceCode.getTokenBefore(currentToken),
                            "array element"
                        );

                        const previousRange = getRequiredRange(
                            previousToken,
                            "array element"
                        );
                        const currentRange = getRequiredRange(
                            currentToken,
                            "array element"
                        );

                        return [previousRange[1], arrayFirst(currentRange)];
                    },
                });
            }
        }

        return {
            children,
            data,
        };
    },
    ArrowFunctionExpression: () => UNKNOWN_PATH_DATA,
    AssignmentExpression: (
        node: AST.ESLintAssignmentExpression,
        context: RuleContext
    ): SubPathData => getPathData(node.right, context),
    AwaitExpression: () => UNKNOWN_PATH_DATA,
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
        const data = calcBinaryExpression(
            node.operator,
            leftData.data,
            rightData.data
        );

        return data === UNKNOWN
            ? UNKNOWN_PATH_DATA
            : {
                  children: EMPTY_MAP,
                  data,
              };
    },
    CallExpression(
        node: AST.ESLintCallExpression,
        context: RuleContext
    ): SubPathData {
        const evalData = getStaticValue(context, node);
        if (!isPresent(evalData)) {
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
    ChainExpression: () => UNKNOWN_PATH_DATA,
    ClassExpression: () => UNKNOWN_PATH_DATA,
    ConditionalExpression(
        node: AST.ESLintConditionalExpression,
        context: RuleContext
    ): SubPathData {
        const testData = getPathData(node.test, context);
        if (testData.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }
        if (isTruthy(testData.data)) {
            return getPathData(node.consequent, context);
        }
        return getPathData(node.alternate, context);
    },
    FunctionExpression: () => UNKNOWN_PATH_DATA,
    Identifier(node: AST.ESLintIdentifier, context: RuleContext): SubPathData {
        const init = findInitNode(context, node);
        if (!isPresent(init)) {
            const evalData = getStaticValue(context, node);
            if (isPresent(evalData)) {
                return {
                    children: EMPTY_MAP,
                    data: evalData.value,
                };
            }

            return UNKNOWN_PATH_DATA;
        }
        const data = getPathData(init.node, context);
        if (isStaticObject(data.data)) {
            for (const readId of init.reads) {
                const props = getWriteProps(readId);
                if (isPresent(props)) {
                    applyWriteProps(data, props);
                }
            }
        }
        /**
         * Get write properties from given Identifier
         */
        function getWriteProps(id: AST.ESLintIdentifier): null | string[] {
            if (
                id.parent?.type !== "MemberExpression" ||
                id.parent.object !== id
            ) {
                return null;
            }
            const results: string[] = [];
            let mem = id.parent;
            for (;;) {
                const name = getStaticPropertyName(mem, context);
                if (!isPresent(name)) {
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
    Literal: (node: AST.ESLintLiteral): SubPathData => ({
        children: EMPTY_MAP,
        data: node.value,
    }),
    LogicalExpression(
        node: AST.ESLintLogicalExpression,
        context: RuleContext
    ): SubPathData {
        const leftData = getPathData(node.left, context);
        if (leftData.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }
        const operator:
            | "&&"
            | "??"
            | "||" = node.operator;
        switch (operator) {
            case "&&": {
                if (!isTruthy(leftData.data)) {
                    return leftData;
                }

                break;
            }
            case "??": {
                if (isPresent(leftData.data)) {
                    return leftData;
                }

                break;
            }
            case "||": {
                if (isTruthy(leftData.data)) {
                    return leftData;
                }

                break;
            }
            default: {
                return UNKNOWN_PATH_DATA;
            }
        }
        return getPathData(node.right, context);
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
        if (!isPresent(propName)) {
            return UNKNOWN_PATH_DATA;
        }

        const define = objectData.children.get(propName);
        if (isPresent(define) && define !== UNKNOWN) {
            return define;
        }
        if (isPresent(objectData.data)) {
            return {
                children: EMPTY_MAP,
                data: getPropertyValue(objectData.data, propName),
            };
        }

        return UNKNOWN_PATH_DATA;
    },
    MetaProperty: () => UNKNOWN_PATH_DATA,
    NewExpression(
        node: AST.ESLintNewExpression,
        context: RuleContext
    ): SubPathData {
        const evalData = getStaticValue(context, node);
        if (!isPresent(evalData)) {
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
        const data: StaticObject = {};
        const children: SubPathData["children"] = new Map();
        for (const prop of node.properties) {
            addObjectExpressionProperty(data, children, prop, context);
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
        if (!isPresent(last)) {
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

        const strings = objectAssign(
            node.quasi.quasis.map((q) => q.value.cooked ?? q.value.raw),
            { raw: node.quasi.quasis.map((q) => q.value.raw) }
        ) as TemplateStringsArray;

        const data = String.raw(strings, ...expressions);

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
        if (!isPresent(firstQuasi)) {
            return UNKNOWN_STRING_PATH_DATA;
        }
        let data = firstQuasi.value.cooked ?? firstQuasi.value.raw;
        for (const [i, expression] of expressions.entries()) {
            const quasi = node.quasis[i + 1];
            if (!isPresent(quasi)) {
                return UNKNOWN_STRING_PATH_DATA;
            }
            data += String(expression);
            data += quasi.value.cooked ?? quasi.value.raw;
        }
        return { children: EMPTY_MAP, data };
    },
    ThisExpression: () => UNKNOWN_PATH_DATA,
    UnaryExpression(
        node: AST.ESLintUnaryExpression,
        context: RuleContext
    ): SubPathData {
        const argData = getPathData(node.argument, context);
        if (argData.data === UNKNOWN) {
            return UNKNOWN_PATH_DATA;
        }
        const calc = CALC_UNARY[node.operator];
        if (calc === null) {
            return UNKNOWN_PATH_DATA;
        }
        const data: unknown = calc(argData.data);

        return {
            children: EMPTY_MAP,
            data,
        };
    },
    UpdateExpression: () => UNKNOWN_PATH_DATA,
    YieldExpression: () => UNKNOWN_PATH_DATA,
};

/**
 * Applies one object literal property to the static object and path metadata.
 */
function addObjectExpressionProperty(
    data: StaticObject,
    children: SubPathData["children"],
    prop: ObjectExpressionProperty,
    context: RuleContext
): void {
    if (prop.type === "Property") {
        addStaticObjectProperty(data, children, prop, context);
        return;
    }

    if (prop.type === "SpreadElement") {
        addSpreadObjectProperty(data, children, prop, context);
    }
}

/**
 * Applies a spread object literal property when the spread value is static.
 */
function addSpreadObjectProperty(
    data: StaticObject,
    children: SubPathData["children"],
    prop: Extract<ObjectExpressionProperty, { type: "SpreadElement" }>,
    context: RuleContext
): void {
    const propData = getPathData(prop.argument, context);
    if (!isStaticObject(propData.data)) {
        return;
    }

    for (const [key, val] of propData.children.entries()) {
        data[key] = propData.data[key];
        children.set(key, val);
    }
}

/**
 * Applies a statically named object literal property.
 */
function addStaticObjectProperty(
    data: StaticObject,
    children: SubPathData["children"],
    prop: Extract<ObjectExpressionProperty, { type: "Property" }>,
    context: RuleContext
): void {
    const keyName = getStaticPropertyName(prop, context);
    if (!isPresent(keyName) || !isESLintExpression(prop.value)) {
        return;
    }

    const propData = getPathData(prop.value, context);
    if (propData.data === UNKNOWN) {
        data[keyName] = UNKNOWN;
        children.set(keyName, UNKNOWN);
        return;
    }

    data[keyName] = propData.data;
    children.set(keyName, {
        key: prop.key.range,
        ...propData,
    });
}

/**
 * Adds static values with JavaScript-like primitive coercion.
 */
function addValues(left: unknown, right: unknown): unknown {
    if (typeof left === "bigint" && typeof right === "bigint") {
        return left + right;
    }
    if (typeof left === "string" || typeof right === "string") {
        return `${String(left)}${String(right)}`;
    }
    return Number(left) + Number(right);
}

/**
 * Applies writes made through known member paths to previously evaluated data.
 */
function applyWriteProps(data: SubPathData, props: string[]): void {
    let objData = data;
    if (!isStaticObject(data.data)) {
        return;
    }
    let obj = data.data;

    for (const prop of props) {
        const child = objData.children.get(prop);
        if (!isPresent(child)) {
            obj[prop] = UNKNOWN;
            objData.children.set(prop, UNKNOWN);
            return;
        }
        if (child === UNKNOWN) {
            return;
        }
        const nextObj = obj[prop];
        if (!isStaticObject(nextObj)) {
            return;
        }
        objData = child;
        obj = nextObj;
    }
}

/**
 * Applies JavaScript bitwise AND semantics.
 */
function bitwiseAndValues(left: unknown, right: unknown): unknown {
    const operands = bitwiseOperands(left, right);
    if (operands.kind === "bigint") {
        // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
        return operands.left & operands.right;
    }
    // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
    return operands.left & operands.right;
}

/**
 * Applies JavaScript bitwise NOT semantics.
 */
function bitwiseNotValue(value: unknown): unknown {
    if (typeof value === "bigint") {
        // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
        return ~value;
    }
    // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
    return ~Number(value);
}

/**
 * Coerces static values for bitwise operations.
 */
function bitwiseOperands(left: unknown, right: unknown): BitwiseOperands {
    return typeof left === "bigint" && typeof right === "bigint"
        ? { kind: "bigint", left, right }
        : { kind: "number", left: Number(left), right: Number(right) };
}

/**
 * Applies JavaScript bitwise OR semantics.
 */
function bitwiseOrValues(left: unknown, right: unknown): unknown {
    const operands = bitwiseOperands(left, right);
    if (operands.kind === "bigint") {
        // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
        return operands.left | operands.right;
    }
    // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
    return operands.left | operands.right;
}

/**
 * Applies JavaScript bitwise XOR semantics.
 */
function bitwiseXorValues(left: unknown, right: unknown): unknown {
    const operands = bitwiseOperands(left, right);
    if (operands.kind === "bigint") {
        // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
        return operands.left ^ operands.right;
    }
    // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
    return operands.left ^ operands.right;
}

/* eslint-disable complexity -- This switch mirrors JavaScript binary operator semantics; splitting it would make the operator table harder to audit. */
/**
 * Calculates a JavaScript binary expression for already-resolved static
 * operands.
 */
function calcBinaryExpression(
    operator: BinaryOperator,
    left: unknown,
    right: unknown
): unknown {
    try {
        switch (operator) {
            case "!=": {
                return left != right;
            }
            case "!==": {
                return left !== right;
            }
            case "%": {
                return remainderValues(left, right);
            }
            case "&": {
                return bitwiseAndValues(left, right);
            }
            case "*": {
                return multiplyValues(left, right);
            }
            case "**": {
                return exponentiateValues(left, right);
            }
            case "+": {
                return addValues(left, right);
            }
            case "-": {
                return subtractValues(left, right);
            }
            case "/": {
                return divideValues(left, right);
            }
            case "<": {
                return compareValues(left, right) < 0;
            }
            case "<<": {
                return leftShiftValues(left, right);
            }
            case "<=": {
                return compareValues(left, right) <= 0;
            }
            case "==": {
                return left == right;
            }
            case "===": {
                return left === right;
            }
            case ">": {
                return compareValues(left, right) > 0;
            }
            case ">=": {
                return compareValues(left, right) >= 0;
            }
            case ">>": {
                return signedRightShiftValues(left, right);
            }
            case ">>>": {
                return unsignedRightShiftValues(left, right);
            }
            case "^": {
                return bitwiseXorValues(left, right);
            }
            case "in": {
                return hasProperty(left, right);
            }
            case "instanceof": {
                return isInstanceOf(left, right);
            }
            case "|": {
                return bitwiseOrValues(left, right);
            }
            default: {
                return UNKNOWN;
            }
        }
    } catch {
        return UNKNOWN;
    }
}
/* eslint-enable complexity -- Re-enable after the JavaScript binary operator dispatch table. */

/**
 * Compares two static values.
 */
function compareValues(
    left: unknown,
    right: unknown
):
    | -1
    | 0
    | 1 {
    const leftValue = toComparableValue(left);
    const rightValue = toComparableValue(right);
    if (leftValue < rightValue) {
        return -1;
    }
    if (leftValue > rightValue) {
        return 1;
    }
    return 0;
}

/**
 * Divides static values.
 */
function divideValues(left: unknown, right: unknown): unknown {
    if (typeof left === "bigint" && typeof right === "bigint") {
        return left / right;
    }
    return Number(left) / Number(right);
}

/**
 * Exponentiates static values.
 */
function exponentiateValues(left: unknown, right: unknown): unknown {
    if (typeof left === "bigint" && typeof right === "bigint") {
        return left ** right;
    }
    return Number(left) ** Number(right);
}

/* eslint-disable complexity, new-cap -- Parser dispatch mirrors ESTree node-type names, including uppercase visitor keys. */
/**
 * Get path data
 */
function getPathData(
    node: AST.ESLintExpression,
    context: RuleContext
): SubPathData {
    switch (node.type) {
        case "ArrayExpression": {
            return VISITORS.ArrayExpression(node, context);
        }
        case "ArrowFunctionExpression": {
            return VISITORS.ArrowFunctionExpression();
        }
        case "AssignmentExpression": {
            return VISITORS.AssignmentExpression(node, context);
        }
        case "AwaitExpression": {
            return VISITORS.AwaitExpression();
        }
        case "BinaryExpression": {
            return VISITORS.BinaryExpression(node, context);
        }
        case "CallExpression": {
            return VISITORS.CallExpression(node, context);
        }
        case "ChainExpression": {
            return VISITORS.ChainExpression();
        }
        case "ClassExpression": {
            return VISITORS.ClassExpression();
        }
        case "ConditionalExpression": {
            return VISITORS.ConditionalExpression(node, context);
        }
        case "FunctionExpression": {
            return VISITORS.FunctionExpression();
        }
        case "Identifier": {
            return VISITORS.Identifier(node, context);
        }
        case "Literal": {
            return VISITORS.Literal(node);
        }
        case "LogicalExpression": {
            return VISITORS.LogicalExpression(node, context);
        }
        case "MemberExpression": {
            return VISITORS.MemberExpression(node, context);
        }
        case "MetaProperty": {
            return VISITORS.MetaProperty();
        }
        case "NewExpression": {
            return VISITORS.NewExpression(node, context);
        }
        case "ObjectExpression": {
            return VISITORS.ObjectExpression(node, context);
        }
        case "SequenceExpression": {
            return VISITORS.SequenceExpression(node, context);
        }
        case "TaggedTemplateExpression": {
            return VISITORS.TaggedTemplateExpression(node, context);
        }
        case "TemplateLiteral": {
            return VISITORS.TemplateLiteral(node, context);
        }
        case "ThisExpression": {
            return VISITORS.ThisExpression();
        }
        case "UnaryExpression": {
            return VISITORS.UnaryExpression(node, context);
        }
        case "UpdateExpression": {
            return VISITORS.UpdateExpression();
        }
        case "YieldExpression": {
            return VISITORS.YieldExpression();
        }
        default: {
            return UNKNOWN_PATH_DATA;
        }
    }
}
/* eslint-enable complexity, new-cap -- Re-enable after the ESTree visitor dispatch table. */

/**
 * Reads a property from a static value.
 */
function getPropertyValue(value: unknown, propertyName: string): unknown {
    return Reflect.get(new Object(value), propertyName);
}

/**
 * Gets a concrete source range or throws for malformed parser token stores.
 *
 * @throws When a parser token lacks a source range.
 */
function getRequiredRange(
    token: { range?: [number, number] | undefined },
    context: string
): [number, number] {
    if (!isPresent(token.range)) {
        throw new Error(`Unexpected state: missing ${context} token range`);
    }
    return token.range;
}

/**
 * Gets a token or throws for malformed parser token stores.
 *
 * @throws When the parser token store cannot provide the requested token.
 */
function getRequiredToken<T>(token: null | T, context: string): T {
    if (!isPresent(token)) {
        throw new Error(`Unexpected state: missing ${context} token`);
    }
    return token;
}

/**
 * Checks whether a static value has a property.
 */
function hasProperty(left: unknown, right: unknown): boolean {
    if (!isStaticObject(right)) {
        return false;
    }
    return keyIn(right, toPropertyKey(left));
}

/**
 * Checks whether a property value is an expression in object-expression
 * context.
 */
function isESLintExpression(
    node: AST.ESLintExpression | AST.ESLintPattern
): node is AST.ESLintExpression {
    return !setHas(PATTERN_ONLY_TYPES, node.type);
}

/**
 * Checks whether a static value is an instance of a constructor.
 */
function isInstanceOf(left: unknown, right: unknown): boolean {
    return typeof right === "function" && left instanceof right;
}

/**
 * Checks whether a value is a mutable object record.
 */
function isStaticObject(value: unknown): value is StaticObject {
    return typeof value === "object" && isPresent(value);
}

/**
 * Converts a value to a boolean.
 */
function isTruthy(value: unknown): boolean {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "number") {
        return value !== 0 && !Number.isNaN(value);
    }
    if (typeof value === "bigint") {
        return value !== 0n;
    }
    return isPresent(value) && value !== "";
}

/**
 * Applies JavaScript left shift semantics.
 */
function leftShiftValues(left: unknown, right: unknown): unknown {
    const operands = bitwiseOperands(left, right);
    if (operands.kind === "bigint") {
        return UNKNOWN;
    }
    // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
    return operands.left << operands.right;
}

/**
 * Multiplies static values.
 */
function multiplyValues(left: unknown, right: unknown): unknown {
    if (typeof left === "bigint" && typeof right === "bigint") {
        return left * right;
    }
    return Number(left) * Number(right);
}

/**
 * Negates a static value.
 */
function negateValue(value: unknown): unknown {
    return typeof value === "bigint" ? -value : -Number(value);
}

/**
 * Applies JavaScript remainder semantics.
 */
function remainderValues(left: unknown, right: unknown): unknown {
    if (typeof left === "bigint" && typeof right === "bigint") {
        return left % right;
    }
    return Number(left) % Number(right);
}

/**
 * Applies JavaScript signed right shift semantics.
 */
function signedRightShiftValues(left: unknown, right: unknown): unknown {
    const operands = bitwiseOperands(left, right);
    if (operands.kind === "bigint") {
        return UNKNOWN;
    }
    // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
    return operands.left >> operands.right;
}

/**
 * Subtracts static values.
 */
function subtractValues(left: unknown, right: unknown): unknown {
    if (typeof left === "bigint" && typeof right === "bigint") {
        return left - right;
    }
    return Number(left) - Number(right);
}

/**
 * Converts a value to a comparable primitive.
 */
function toComparableValue(value: unknown):
    | bigint
    | number
    | string {
    if (
        typeof value === "bigint" ||
        typeof value === "number" ||
        typeof value === "string"
    ) {
        return value;
    }
    return Number(value);
}

/**
 * Converts a value to a property key.
 */
function toPropertyKey(value: unknown): PropertyKey {
    return typeof value === "symbol" ? value : String(value);
}

/**
 * Applies JavaScript unsigned right shift semantics.
 */
function unsignedRightShiftValues(left: unknown, right: unknown): unknown {
    if (typeof left === "bigint" || typeof right === "bigint") {
        return UNKNOWN;
    }
    // eslint-disable-next-line no-bitwise -- This intentionally emulates a parsed JavaScript bitwise expression.
    return Number(left) >>> Number(right);
}
