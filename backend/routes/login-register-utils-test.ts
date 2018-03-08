import 'jest';

import {alphanumericCodeGenerator, numberToAlternateBase} from './login-register-utils';

describe("login-register route utility methods", () => {

    describe("numberToAlternateBase", () => {
        it("Leaves base 10 numbers unchanged", () => {
            const base10 = '0123456789';
            expect(numberToAlternateBase(0, base10)).toBe('0');
            expect(numberToAlternateBase(100, base10)).toBe('100');
            expect(numberToAlternateBase(38759823, base10)).toBe('38759823');
        });
        it("Can do hexidecimal representation", () => {
            const hex = '0123456789ABCDEF';
            expect(numberToAlternateBase(0, hex)).toBe('0');
            expect(numberToAlternateBase(0x64, hex)).toBe('64');
            expect(numberToAlternateBase(0xC0FFEE, hex)).toBe('C0FFEE');
        });
        it("Can convert to an arbitrary base system", () => {
            const symbols = 'BCDFGHJKLMNPQRSTVWXYZ23456789';
            expect(numberToAlternateBase(0, symbols)).toBe('B');
            expect(numberToAlternateBase(1, symbols)).toBe('C');
            expect(numberToAlternateBase(28, symbols)).toBe('9');
            expect(numberToAlternateBase(29, symbols)).toBe('CB');
            expect(numberToAlternateBase(435987, symbols)).toBe('W6QC');
        });
    });
    describe("alphanumericCodeGenerator", () => {
        it("Uses the specified symbols to create codes of the given length", () => {
            const gen1 = alphanumericCodeGenerator(0, 5);
            // When 0 is passed in, we should get the lowest possible five-digit value (like 10000 in base 10)
            expect(gen1.next().value).toBe('CBBBB');
            expect(gen1.next().value).toBe('CBBBC');
            expect(gen1.next().value).toBe('CBBBD');
            // When 1 is passed in, we should get the highest possible five-digit value (like 99999 in base 10)
            const gen2 = alphanumericCodeGenerator(1, 5);
            const result = gen2.next();
            expect(result.value).toBe('99999');
            expect(result.done).toBe(true);
        });
    });
});
