import fetch from 'node-fetch';

export const borisURL = 'http://localhost:4444/';

interface EmailData {
    from: string;
    to: string;
    subject: string;
    html: string;
    date: string;
}

export async function getEmailsSentTo(address: string) {
    const result = await fetch(`${borisURL}test-utils/emails/${address}`);
    return result.json() as Promise<Array<EmailData>>;
}
