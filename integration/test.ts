import 'jest';
import {Builder, By, until, ThenableWebDriver, WebDriver} from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

const borisURL = 'http://localhost:3333/';

function elementMatchingWithText(css, text) {
    return async (driver: WebDriver) => {
        const buttons = await driver.findElements({css: 'button'});
        const matchingButtons = await Promise.all(buttons.map(async btn => await btn.getText() === text ? btn : null));
        return buttons.filter(btn => btn !== null);
    }
}
const buttonWithText = elementMatchingWithText.bind(undefined, 'button');

describe("BORIS Integration tests", () => {

    let driver: ThenableWebDriver;

    beforeAll(() => {
        driver = new Builder().forBrowser('chrome').setChromeOptions(
            // Simulate an iPhone 7. Disable touch because it's buggy with Selenium (click causes context menu to pop up)
            new chrome.Options().setMobileEmulation({deviceMetrics: {width: 375, height: 667, pixelRatio: 2, touch: false}})
        ).build();
    });

    afterAll(() => {
        driver.quit();
    });

    it('Home Page Test', async () => {
        await driver.get(borisURL);

        expect(await driver.getTitle()).toBe("BORIS");

        //await driver.wait(until.elementLocated({css: 'h1'}))
        const header = await driver.findElement({css: 'h1'});
        expect(await header.getText()).toContain("WOULD YOU SURVIVE THE END OF THE WORLD?");
    });

    it('Registration Test', async () => {
        await driver.get(borisURL);
        const registerButton = await driver.findElement(buttonWithText("REGISTER!"));
        await registerButton.click();
        // See the consent page:
        await driver.wait(until.elementLocated(elementMatchingWithText('h1', "CONSENT")))
        const consentButton = await driver.findElement(buttonWithText("I CONSENT"));
        await consentButton.click();
        // See the registration form:
        await driver.wait(until.elementLocated(elementMatchingWithText('h1', "CREATE A PROFILE")))
    });
});
