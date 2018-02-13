/**
 * Routes used only for integration testing.
 * These routes are disabled in prod and dev builds.
 */
import * as express from 'express';
import '../express-extended';

export const router = express.Router();

/**
 * API endpoint for getting all email sent to the given address
 */
router.get('/emails/:toAddress([^/]+)', async (req, res) => {
    const transport: any = req.app.get('mailTransport');
    const sentMail = transport.sentMail.filter((mail: any) => mail.data.to === req.params.toAddress);
    res.json(sentMail.map((obj: any) => ({
        from: obj.data.from,
        to: obj.data.to,
        subject: obj.data.subject,
        text: obj.data.text,
        date: obj.message.date,
    })));
});
