/**
 * Given a number, return it in an arbitrary-base string
 * representation, e.g. base 17
 * @param n A non-negative integer, to be converted to a different base.
 * @param symbols The symbols that comprise this base
 *          e.g. '0123456789' for base 10
 */
export function numberToAlternateBase(n: number, symbols: string): string {
    let code = '';
    do {
        code = symbols.charAt(n % symbols.length) + code;
        n = Math.floor(n / symbols.length);
    } while (n > 0);
    return code;
}
/**
 * Generator that returns alphanumeric strings like 'X4JK2' with the
 * specified number of characters.
 * @param value a number between 0 and 1, used to determine where
 *              initial result will be sampled from the range of
 *              valid strings of the specified length.
 * @param numCharacters how many characters the resulting string
 *              should have.
 */
export function* alphanumericCodeGenerator(value: number, numCharacters: number) {
    const symbols = 'BCDFGHJKLMNPQRSTVWXYZ23456789'; // Exclude vowels to avoid words, exclude commonly confused symbols (O and 0, 1 and I)
    const min = (symbols.length)**(numCharacters-1);
    const max = (symbols.length)**(numCharacters) - 1;
    let i = Math.floor(min + value*(max-min));
    for (; i <= (max - 1); i++) {
        yield numberToAlternateBase(i, symbols);
    }
    return numberToAlternateBase(i, symbols); // Final value must be 'return' not 'yield', to indicate done.
}
