import type { AST as ES, Rule, Scope } from "eslint";
import type { Comment as ESTreeComment } from "estree";
import type { JSONSchema4 } from "json-schema";
import type { AST as JSON } from "jsonc-eslint-parser";
import type { RequestOptions } from "node:https";
import type { AST as TOML } from "toml-eslint-parser";
import type { Arrayable } from "type-fest";
import type { AST } from "vue-eslint-parser";
import type { AST as YAML } from "yaml-eslint-parser";

/** Comment nodes supported by the configured parsers. */
export type Comment = ESTreeComment | TOML.Comment | YAML.Comment;

/** Text replacement returned by an ESLint fixer. */
export interface Fix {
    range: [number, number];
    text: string;
}

/** Shared settings consumed from ESLint flat config. */
export interface JsonSchemaValidatorSettings {
    cache?: {
        directory?: string;
        ttl?: false | number;
    };
    http?: {
        getModulePath?: string;
        requestOptions?: RequestOptions;
    };
}

/** AST nodes supported by this plugin. */
export type Node =
    | AST.ESLintNode
    | JSON.JSONNode
    | TOML.TOMLNode
    | YAML.YAMLNode;

/** AST node or token accepted by SourceCode helpers. */
export type NodeOrToken = Node | Token;

/** Minimal ESLint rule context surface used by this plugin. */
export interface RuleContext {
    cwd: string;
    filename: string;
    getAncestors: () => Node[];
    getPhysicalFilename?: () => string;
    id: string;
    options: unknown[];
    parserPath: string;
    parserServices: {
        customBlock?: AST.VElement;
        isJSON?: true;
        isTOML?: true;
        isYAML?: true;
    };
    physicalFilename: string;
    report: (descriptor: ReportDescriptor) => void;
    settings: { "json-schema-validator-2"?: JsonSchemaValidatorSettings };
    sourceCode: SourceCode;
}

/**
 * Rule definition shape used before the compatibility wrapper exposes it to
 * ESLint.
 */
export interface RuleDefinition {
    create: (
        context: RuleContext,
        params: { customBlock: boolean; filename: string }
    ) => RuleListener;
    meta: RuleMetaData;
}

/** Fixer API subset used by this plugin. */
export interface RuleFixer {
    insertTextAfter: (nodeOrToken: NodeOrToken, text: string) => Fix;

    insertTextAfterRange: (range: [number, number], text: string) => Fix;

    insertTextBefore: (nodeOrToken: NodeOrToken, text: string) => Fix;

    insertTextBeforeRange: (range: [number, number], text: string) => Fix;

    remove: (nodeOrToken: NodeOrToken) => Fix;

    removeRange: (range: [number, number]) => Fix;

    replaceText: (nodeOrToken: NodeOrToken, text: string) => Fix;

    replaceTextRange: (range: [number, number], text: string) => Fix;
}

/** Visitor map returned by plugin rules. */
export type RuleListener = Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ESLint visitors are intentionally bivariant at the rule boundary.
    ((...args: any[]) => void) | undefined
>;

/** Complete metadata exposed for a rule. */
export interface RuleMetaData {
    defaultOptions?: unknown[];
    deprecated?: boolean | DeprecatedInfo;
    docs: RuleDocs;
    fixable?: "code" | "whitespace";
    hasSuggestions?: boolean;
    languages?: string[];
    messages: Record<string, string>;
    schema: Arrayable<JSONSchema4>;
    type: "layout" | "problem" | "suggestion";
}

/** Complete rule module exposed to ESLint. */
export interface RuleModule {
    create: (context: Rule.RuleContext) => RuleListener;
    meta: RuleMetaData;
}
/** SourceCode API subset used by this plugin. */
export interface SourceCode {
    ast: JSON.JSONProgram | TOML.TOMLProgram | YAML.YAMLProgram;
    commentsExistBetween: (left: NodeOrToken, right: NodeOrToken) => boolean;
    getAllComments: () => Comment[];
    getComments: (node: NodeOrToken) => {
        leading: Comment[];
        trailing: Comment[];
    };
    getCommentsAfter: (nodeOrToken: NodeOrToken) => Comment[];
    getCommentsBefore: (nodeOrToken: NodeOrToken) => Comment[];
    getCommentsInside: (node: Node) => Comment[];

    getFirstToken: ((node: Node) => Token) &
        ((node: Node, options?: CursorWithSkipOptions) => null | Token);

    getFirstTokenBetween: (
        left: NodeOrToken,
        right: NodeOrToken,
        options?: CursorWithSkipOptions
    ) => null | Token;

    getFirstTokens: (node: Node, options?: CursorWithCountOptions) => Token[];

    getFirstTokensBetween: (
        left: NodeOrToken,
        right: NodeOrToken,
        options?: CursorWithCountOptions
    ) => Token[];

    getIndexFromLoc: (loc: JSON.Position) => number;

    getLastToken: ((node: Node) => Token) &
        ((node: Node, options?: CursorWithSkipOptions) => null | Token);

    // Inherited methods from TokenStore
    // ---------------------------------

    getLastTokenBetween: (
        left: NodeOrToken,
        right: NodeOrToken,
        options?: CursorWithSkipOptions
    ) => null | Token;

    getLastTokens: (node: Node, options?: CursorWithCountOptions) => Token[];
    getLastTokensBetween: (
        left: NodeOrToken,
        right: NodeOrToken,
        options?: CursorWithCountOptions
    ) => Token[];

    getLines: () => string[];

    getLocFromIndex: (index: number) => JSON.Position;
    getNodeByRangeIndex: (index: number) => Node | null;

    getText: (
        node?: NodeOrToken,
        beforeCount?: number,
        afterCount?: number
    ) => string;

    // GetTokenAfter(node: NodeOrToken): Token | null
    getTokenAfter: (
        node: NodeOrToken,
        options?: CursorWithSkipOptions
    ) => null | Token;

    // GetTokenBefore(node: NodeOrToken): Token | null
    getTokenBefore: (
        node: NodeOrToken,
        options?: CursorWithSkipOptions
    ) => null | Token;

    getTokenByRangeStart: (
        offset: number,
        options?: { includeComments?: boolean }
    ) => null | Token;

    getTokens: ((
        node: Node,
        beforeCount?: number,
        afterCount?: number
    ) => Token[]) &
        ((
            node: Node,
            options: CursorWithCountOptions | FilterPredicate
        ) => Token[]);

    getTokensAfter: (
        node: NodeOrToken,
        options?: CursorWithCountOptions
    ) => Token[];

    getTokensBefore: (
        node: NodeOrToken,
        options?: CursorWithCountOptions
    ) => Token[];

    getTokensBetween: (
        left: NodeOrToken,
        right: NodeOrToken,
        padding?: CursorWithCountOptions | FilterPredicate | number
    ) => Token[];

    hasBOM: boolean;

    isSpaceBetweenTokens: (first: Token, second: Token) => boolean;
    lines: string[];

    parserServices: {
        isJSON?: true;
        isTOML?: true;
        isYAML?: true;
    };

    scopeManager: Scope.ScopeManager;

    text: string;

    visitorKeys: Record<string, string[]>;
}
/** Tokens supported by the configured parsers. */
export type Token = Comment | ES.Token | TOML.Token | YAML.Token;

type CursorWithCountOptions =
    | FilterPredicate
    | number
    | {
          count?: number;
          filter?: FilterPredicate;
          includeComments?: boolean;
      };

type CursorWithSkipOptions =
    | FilterPredicate
    | number
    | {
          filter?: FilterPredicate;
          includeComments?: boolean;
          skip?: number;
      };

interface DeprecatedInfo {
    replacedBy?: RuleReplacement[];
    url?: string;
}

type FilterPredicate = (tokenOrComment: Token) => boolean;

type ReportDescriptor = ReportDescriptorLocation &
    ReportDescriptorMessage &
    ReportDescriptorOptions;

type ReportDescriptorLocation =
    | { loc: SourceLocation | { column: number; line: number } }
    | { node: NodeOrToken };
type ReportDescriptorMessage = { message: string } | { messageId: string };

interface ReportDescriptorOptions extends ReportDescriptorOptionsBase {
    suggest?: null | SuggestionReportDescriptor[];
}

interface ReportDescriptorOptionsBase {
    data?: Record<string, string>;

    fix?:
        | ((fixer: RuleFixer) => Fix | Fix[] | IterableIterator<Fix> | null)
        | null;
}
interface RuleDocs {
    /** Legacy plugin-doc category metadata used by generated rule docs. */
    categories: "recommended"[] | null;
    /** Legacy plugin-doc default severity metadata used by generated rule docs. */
    default?: "error" | "warn";
    /** Short rule description shown by editor and documentation tooling. */
    description: string;
    /** Language dialects this rule is intended to lint. */
    dialects?: string[];
    /** Whether this rule is frozen and no longer accepts feature requests. */
    frozen?: boolean;
    /** Whether this rule is enabled by the recommended config. */
    recommended?: boolean;
    /** Full plugin-qualified rule id. */
    ruleId: string;
    /** Local rule name without the plugin prefix. */
    ruleName: string;
    /** Canonical rule documentation URL. */
    url: string;
}
interface RuleReplacement {
    message?: string;
    plugin?: {
        name: string;
        url?: string;
    };
    rule?: {
        name: string;
        url?: string;
    };
}

interface SourceLocation {
    end: JSON.Position;
    start: JSON.Position;
}

type SuggestionDescriptorMessage = { desc: string } | { messageId: string };

type SuggestionReportDescriptor = ReportDescriptorOptionsBase &
    SuggestionDescriptorMessage;
