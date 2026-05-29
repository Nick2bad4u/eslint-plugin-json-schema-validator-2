import { safeCastTo } from "ts-extras";

import type { RuleModule } from "../types.js";

import noInvalid from "../rules/no-invalid.js";

/**
 * Plugin rule modules exposed to the ESLint plugin entrypoint.
 */
export const rules: RuleModule[] = safeCastTo<RuleModule[]>([noInvalid]);
