import type { Variable } from "eslint-scope";
import type { AST } from "vue-eslint-parser";

import * as eslintUtils from "@eslint-community/eslint-utils";
import { arrayFirst, isEmpty } from "ts-extras";

import type { RuleContext } from "../../../types.ts";

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
            def.parent?.type === "VariableDeclaration" &&
            def.parent.kind === "const" &&
            def.node.type === "VariableDeclarator" &&
            def.node.init
        ) {
            let init = def.node.init as AST.ESLintExpression;
            const reads = variable.references
                .filter((ref) => ref.isRead())
                .map((ref) => ref.identifier as AST.ESLintIdentifier);
            if (init.type === "Identifier") {
                const data = findInitNode(context, init);
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
    } else if (node.type === "MemberExpression") {
        key = node.property;
        if (!node.computed) {
            if (key.type === "Identifier") {
                return key.name;
            }
            return null;
        }
    } else {
        return null;
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
        // @ts-expect-error -- `eslintUtils` is typed now but incompatible with Vue AST typings
        node,
        scope
    );
    if (!staticValue) {
        return null;
    }
    return staticValue.optional === undefined
        ? { value: staticValue.value }
        : { optional: staticValue.optional, value: staticValue.value };
}

/**
 * Gets the string of a given node.
 */
export function getStringLiteralValue(
    node: AST.ESLintLiteral | AST.ESLintTemplateLiteral
): null | string {
    if (node.type === "Literal") {
        if (node.value == null && node.bigint != null) {
            return String(node.bigint);
        }
        return String(node.value);
    }
    if (
        node.type === "TemplateLiteral" &&
        isEmpty(node.expressions) &&
        node.quasis.length === 1
    ) {
        return arrayFirst(node.quasis)?.value.cooked ?? null;
    }
    return null;
}

/**
 * Find the variable of a given name.
 */
function findVariable(
    context: RuleContext,
    node: AST.ESLintIdentifier
): null | Variable {
    const scope = getScope(context, node);
    return scope
        ? (eslintUtils.findVariable(scope, node) as null | Variable)
        : null;
}

/**
 * Gets the scope for the current node
 */
function getScope(context: RuleContext, currentNode: AST.ESLintNode) {
    // On Program node, get the outermost scope to avoid return Node.js special function scope or ES modules scope.
    const inner = currentNode.type !== "Program";
    const scopeManager = context.sourceCode.scopeManager;

    let node: AST.Node | null = currentNode;
    for (; node; node = node.parent || null) {
        const scope = scopeManager.acquire(
            // @ts-expect-error -- incompatible with Vue AST typings
            node,
            inner
        );

        if (scope) {
            if (scope.type === "function-expression-name") {
                return arrayFirst(scope.childScopes) ?? scope;
            }
            return scope;
        }
    }

    return scopeManager.scopes[0];
}
