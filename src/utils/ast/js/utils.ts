import type { Scope } from "eslint";
import type { AST } from "vue-eslint-parser";

import * as eslintUtils from "@eslint-community/eslint-utils";
import {
    arrayFirst,
    isDefined,
    isEmpty,
    isPresent,
    safeCastTo,
} from "ts-extras";

import type { RuleContext } from "../../../types.js";

/**
 * Find the node that initial value.
 */
export function findInitNode(
    context: RuleContext,
    node: AST.ESLintIdentifier
): null | { node: AST.ESLintExpression; reads: AST.ESLintIdentifier[] } {
    const variable = findVariable(context, node);
    if (!variable) {
        return null;
    }
    if (variable.defs.length === 1) {
        const def = arrayFirst(variable.defs);
        if (
            def?.type === "Variable" &&
            def.parent.kind === "const" &&
            isPresent(def.node.init)
        ) {
            let init: AST.ESLintExpression = toESLintExpression(def.node.init);
            const reads = variable.references
                .filter((ref) => ref.isRead())
                .map((ref) => toESLintIdentifier(ref.identifier));
            if (init.type === "Identifier") {
                const data = findInitNode(context, toESLintIdentifier(init));
                if (!data) {
                    return null;
                }
                init = data.node;
                reads.push(...data.reads);
            }

            return {
                node: init,
                reads,
            };
        }
    }
    return null;
}

/**
 * Gets the property name of a given node.
 */
export function getStaticPropertyName(
    node: AST.ESLintMemberExpression | AST.ESLintProperty,
    context: RuleContext
): null | string {
    let key;
    if (node.type === "Property") {
        key = node.key;
        if (!node.computed && key.type === "Identifier") {
            return key.name;
        }
    } else {
        key = node.property;
        if (!node.computed) {
            if (key.type === "Identifier") {
                return key.name;
            }
            return null;
        }
    }
    if (key.type === "Literal" || key.type === "TemplateLiteral") {
        return getStringLiteralValue(key);
    }
    if (key.type === "Identifier") {
        const init = findInitNode(context, key);
        if (
            init &&
            (init.node.type === "Literal" ||
                init.node.type === "TemplateLiteral")
        ) {
            return getStringLiteralValue(init.node);
        }
    }
    return null;
}

/**
 * Get the value of a given node if it's a static value.
 */
export function getStaticValue(
    context: RuleContext,
    node: AST.ESLintNode
): null | { optional?: boolean; value?: unknown } {
    const scope = getScope(context, node);
    if (!scope) {
        return null;
    }
    const staticValue = eslintUtils.getStaticValue(
        // @ts-expect-error -- `eslintUtils` is typed now but incompatible with Vue.js AST typings
        node,
        scope
    );
    if (!staticValue) {
        return null;
    }
    return isDefined(staticValue.optional)
        ? { optional: staticValue.optional, value: staticValue.value }
        : { value: staticValue.value };
}

/**
 * Find the variable of a given name.
 */
function findVariable(
    context: RuleContext,
    node: AST.ESLintIdentifier
): null | Scope.Variable {
    const scope = getScope(context, node);
    return scope
        ? safeCastTo<null | Scope.Variable>(
              eslintUtils.findVariable(scope, node)
          )
        : null;
}

/**
 * Gets the scope for the current node
 */
function getScope(context: RuleContext, currentNode: AST.ESLintNode) {
    // On Program node, get the outermost scope to avoid return Node.js special function scope or ES modules scope.
    const isInner = currentNode.type !== "Program";
    const scopeManager = context.sourceCode.scopeManager;

    let node: AST.Node | null = currentNode;
    for (; node; node = node.parent ?? null) {
        const scope = scopeManager.acquire(
            // @ts-expect-error -- incompatible with Vue.js AST typings
            node,
            isInner
        );

        if (scope) {
            if (scope.type === "function-expression-name") {
                return arrayFirst(scope.childScopes) ?? scope;
            }
            return scope;
        }
    }

    return arrayFirst(scopeManager.scopes);
}

/**
 * Gets the string of a given node.
 */
function getStringLiteralValue(
    node: AST.ESLintLiteral | AST.ESLintTemplateLiteral
): null | string {
    if (node.type === "Literal") {
        if (!isPresent(node.value) && isPresent(node.bigint)) {
            return node.bigint;
        }
        return typeof node.value === "string" ? node.value : String(node.value);
    }
    if (isEmpty(node.expressions) && node.quasis.length === 1) {
        return arrayFirst(node.quasis)?.value.cooked ?? null;
    }
    return null;
}

/**
 * Converts parser-service expressions to the Vue.js parser expression shape
 * used by this module.
 */
function toESLintExpression(expression: unknown): AST.ESLintExpression {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- eslint-scope uses ESTree nodes, while this module is intentionally parser-bound to vue-eslint-parser-compatible nodes.
    return expression as AST.ESLintExpression;
}

/**
 * Converts parser-service identifiers to the Vue.js parser identifier shape
 * used by this module.
 */
function toESLintIdentifier(identifier: unknown): AST.ESLintIdentifier {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- eslint-scope uses ESTree nodes, while this module is intentionally parser-bound to vue-eslint-parser-compatible nodes.
    return identifier as AST.ESLintIdentifier;
}
