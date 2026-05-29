export function extractReadmeRulesSection(markdown: string): string;
export function generateReadmeRulesSectionFromRules(
    rules: Readonly<Record<string, unknown>>
): string;
export function normalizeRulesSectionMarkdown(markdown: string): string;
export function syncReadmeRulesTable(input: {
    readonly writeChanges: boolean;
}): Promise<Readonly<{ changed: boolean }>>;
