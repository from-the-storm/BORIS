import * as crypto from 'crypto';
import * as fs from 'fs';
import { promisify } from 'util';
const readFileAsync = promisify(fs.readFile);

export async function getFileHashSha1(filePath: string): Promise<string> {
    const fileContents = await readFileAsync(filePath);
    return crypto
        .createHash('sha1')
        .update(fileContents)
        .digest('hex');
}
