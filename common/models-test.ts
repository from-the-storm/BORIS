import 'jest';

import {isValidGender, Gender} from './models';

describe("common models", () => {

    describe("isValidGender", () => {
        it("works", () => {
            expect(isValidGender(Gender.Male)).toBe(true);
            expect(isValidGender(Gender.Female)).toBe(true);
            expect(isValidGender(Gender.Other)).toBe(true);
            expect(isValidGender(Gender.NoAnswer)).toBe(true);
            expect(isValidGender('m')).toBe(true);

            expect(isValidGender('x')).toBe(false);
            expect(isValidGender('Male')).toBe(false);
            expect(isValidGender('M')).toBe(false);
            expect(isValidGender('')).toBe(false);
            expect(isValidGender(undefined)).toBe(false);
        });
    });
});
