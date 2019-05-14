import 'jest';
import { getFileHashSha1 } from './checksum';

describe("Checksum tests", () => {
    describe("getFileHashSha1", () => {
        it("Returns the expected hash for its own implementation", async () => {
            expect(await getFileHashSha1(`${__dirname}/checksum.ts`)).toEqual('1b7265d79003eb86f5b67dddc168461c11b17766');
        });
    });
});
