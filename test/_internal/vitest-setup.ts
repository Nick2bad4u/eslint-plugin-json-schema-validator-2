import { RuleTester } from "eslint";
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    it,
} from "vitest";

type RuleTesterWithHooks = typeof RuleTester & {
    afterAll: typeof afterAll;
    afterEach: typeof afterEach;
    beforeAll: typeof beforeAll;
    beforeEach: typeof beforeEach;
    describe: typeof describe;
    it: typeof it;
    itOnly: typeof it.only;
};

const ruleTester = RuleTester as RuleTesterWithHooks;

ruleTester.afterAll = afterAll;
ruleTester.afterEach = afterEach;
ruleTester.beforeAll = beforeAll;
ruleTester.beforeEach = beforeEach;
ruleTester.describe = describe;
ruleTester.it = it;
ruleTester.itOnly = it.only;
