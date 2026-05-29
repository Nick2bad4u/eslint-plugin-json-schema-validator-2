import { safeCastTo } from "ts-extras";

import type { RuleModule } from "../types.ts";

import noInvalid from "../rules/no-invalid.ts";

export const rules = safeCastTo<RuleModule[]>([noInvalid]);
