/**
 * Create multiple independent web browser windows for testing purposes.
 */
import {Builder, WebDriver} from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

function parseArgs() {
    try {
        const numWindows: number = process.argv.length >= 3 ? parseInt(process.argv[2], 10) : 3;
        if (Number.isNaN(numWindows) || numWindows < 2 || numWindows > 5) {
            throw new Error("Invalid number of windows.");
        }
        const serverUrl = process.argv.length >= 4 ? process.argv[3] : 'http://localhost:3333';
        return {numWindows, serverUrl};
    } catch (err) {
        console.error(err.message);
        console.log("Usage: interactive-multisession [2-5] [BORIS URL]\ne.g. interactive-multisession 3 http://localhost:3333");
        process.exit(1);
    }
}

async function run() {
    const {numWindows, serverUrl} = parseArgs();

    let drivers: WebDriver[] = await Promise.all([...Array(numWindows)].map(() => (
        new Builder().forBrowser('chrome').setChromeOptions(
            new chrome.Options().addArguments("--window-size=375,667")
        ).build()
    )));

    process.on('SIGINT', async function() {
        console.log("\nDestroying browsers...");
        try {
            await Promise.all(drivers.map(driver => driver.quit()));
        } catch (err) {
            console.log("Unable to terminate all browsers cleanly.");
        }
        console.log("Done! Exiting.");
        process.exit();
    });
    console.log("Opened browsers. Press CTRL-C to quit.");

    for (const driver of drivers) {
        try {
            await driver.get(serverUrl);
        } catch(err) {
            console.log("Unable to login to BORIS");
            console.error(err);
        }
    }
}

run().then(() => {}, err => console.error(err));
// And run the event loop forever until interrupted:
setInterval(() => {}, 1 << 30);
