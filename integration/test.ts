import 'jest';
import {Builder, By, until, ThenableWebDriver, WebDriver} from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import { spawn, ChildProcess } from 'child_process';
import { waitForReactToRender, waitForHttpRequests, countElementsMatching, buttonWithText, trackHttpRequests } from './webdriver-utils';

const borisURL = 'http://localhost:4444/';

if (process.env.NODE_ENV !== 'test') {
    throw new Error("The test suite should be run with NODE_ENV=test");
}

describe("BORIS Integration tests", () => {

    let driver: ThenableWebDriver;
    let borisServer: ChildProcess;

    beforeAll(async () => {
        // Spawn a new BORIS server for testing:
        const spawnedBorisServer = new Promise((resolve, reject) => {
            borisServer = spawn(
                '../node_modules/.bin/ts-node',
                ['backend-server.ts'],
                {cwd: __dirname + '/../backend', detached: true}
            );
            borisServer.stdout.once('data', resolve);
            borisServer.stdout.on('data', (data) => {
                //console.log(`backend: ${data}`);
            });
            borisServer.stderr.on('data', (data) => {
                console.log(`backend ERROR: ${data}`);
            });
            borisServer.on('error', (err) => { console.log(err); reject(err); })
        });
        await spawnedBorisServer;

        driver = new Builder().forBrowser('chrome').setChromeOptions(
            // Simulate an iPhone 7. Disable touch because it's buggy with Selenium (click causes context menu to pop up)
            new chrome.Options().setMobileEmulation({deviceMetrics: {width: 375, height: 667, pixelRatio: 2, touch: false}})
        ).build();

    });

    afterAll(async () => {
        // To kill the boris server, which is a child of this child process,
        // we need to kill the whole process group (grouped because we used
        // {detached: true} when spawning), by making the PID negative.
        process.kill(-borisServer.pid, 'SIGTERM');
        await driver.quit();
    });

    const getHeaderText = async (driver: WebDriver) => {
        const header = await driver.findElement({css: 'h1'});
        return header.getText();
    }

    it('Home Page Test', async () => {
        await driver.get(borisURL);
        expect(await driver.getTitle()).toBe("BORIS");
        expect(await getHeaderText(driver)).toBe("WOULD YOU SURVIVE THE END OF THE WORLD?");
    });

    it('Registration Test', async () => {
        await driver.get(borisURL);
        trackHttpRequests(driver);
        await waitForReactToRender(driver); // Not sure yet if this is necessary.
        const registerButton = await driver.findElement(buttonWithText("REGISTER!"));
        await registerButton.click();
        // See the consent page:
        expect(await getHeaderText(driver)).toBe("CONSENT");
        // Click the consent button:
        await driver.findElement(buttonWithText("I CONSENT")).then(btn => btn.click());
        // See the registration form:
        expect(await getHeaderText(driver)).toBe("CREATE A PROFILE");
        // If we prematurely click "Register", nothing should happen other than validation messages appearing:
        await driver.findElement(buttonWithText("REGISTER")).then(btn => btn.click());
        expect(await getHeaderText(driver)).toBe("CREATE A PROFILE");
        // Fill out the form:
        expect(await countElementsMatching('input:invalid', driver)).toBe(9); // 6 fields but some are radio buttons
        await driver.findElement({css: 'input[name=firstName]'}).then(field => field.sendKeys("Tom Testerson"));
        await driver.findElement({css: 'input[name=email]'}).then(field => field.sendKeys("tom@example.com"));
        await driver.findElement({css: 'input[name=workInTech][value=yes]'}).then(field => field.click()); // "Work in tech: Yes"
        await driver.findElement({css: 'input[name=occupation]'}).then(field => field.sendKeys("Mindlessly testing websites"));
        await driver.findElement({css: 'input[name=age]'}).then(field => field.sendKeys("25"));
        await driver.findElement({css: 'input[name=gender][value=o]'}).then(field => field.click()); // "Gender: Other"
        expect(await countElementsMatching('input:invalid', driver)).toBe(0);
        // Click "Register"
        await driver.findElement(buttonWithText("REGISTER")).then(btn => btn.click());
        await waitForHttpRequests(driver);
        await waitForReactToRender(driver);
        // User then sees a final message:
        expect(await getHeaderText(driver)).toBe("CHECK YOUR EMAIL");
    });
});
