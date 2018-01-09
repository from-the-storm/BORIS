import 'jest';
import {Builder, By, until, ThenableWebDriver, WebDriver} from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

const borisURL = 'http://localhost:3333/';

/**
 * Helper function to make sure that React has loaded and updated the DOM with any
 * pending state changes. Returns a promise that resolves to the number of matching
 * elements.
 *
 * @param driver The Selenium WebDriver instance
 */
function waitForReactToRender(driver: WebDriver) {
    return driver.executeAsyncScript(`
        const done = arguments[arguments.length - 1]; // Callback passed in by webdriver as last argument
        const checkIfReady = () => {
            if (window.__rootComponent) { // __rootComponent is set by us in main.tsx after initial state is loaded.
                // To check if React has finished rendering we make a no-op change to
                // the state any rely on React's post-update callback. This is guaranteed to be called
                // after any pending changes prior to this setState() call have been updated in the DOM.
                window.__rootComponent.setState({}, done);
            } else {
                window.setTimeout(checkIfReady, 50);
            }
        };
        checkIfReady();
    `);
}

/**
 * Helper function to count how many elements match the given CSS selector,
 * even for selectors that Selenium itself does not support.
 *
 * @param css The CSS selector to match
 * @param driver The Selenium WebDriver instance
 */
function countElementsMatching(css: string, driver: WebDriver) {
    return driver.executeAsyncScript(`
        const css = arguments[0];
        const done = arguments[arguments.length - 1]; // Callback passed in by webdriver as last argument
        done(document.querySelectorAll(css).length);
    `, css);
}

function elementMatchingWithText(css: string, text: string) {
    return async (driver: WebDriver) => {
        const buttons = await driver.findElements({css: 'button'});
        const matchingButtons = await Promise.all(buttons.map(async btn => await btn.getText() === text ? btn : null));
        const result = matchingButtons.filter(btn => btn !== null);
        if (result.length == 1) {
            return result;
        } else {
            throw new Error(`Unable to find element with CSS ${css} and text "${text}": ` + (result.length ? 'more than one match' : 'no match'));
        }
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

    const getHeaderText = async (driver: WebDriver) => {
        const header = await driver.findElement({css: 'h1'});
        return header.getText();
    }

    it('Home Page Test', async () => {
        await driver.get(borisURL);

        expect(await driver.getTitle()).toBe("BORIS");

        //await driver.wait(until.elementLocated({css: 'h1'}))
        const header = await driver.findElement({css: 'h1'});
        expect(await header.getText()).toContain("WOULD YOU SURVIVE THE END OF THE WORLD?");
    });

    it('Registration Test', async () => {
        await driver.get(borisURL);
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
        // User then sees a final message:
        expect(await getHeaderText(driver)).toBe("CHECK YOUR EMAIL");
    });
});
