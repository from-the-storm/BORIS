import 'jest';
import * as React from 'react';
import { MarketButton } from './market-button';
import * as renderer from 'react-test-renderer';
import * as prettyFormat from 'pretty-format';
const { ReactTestComponent } = prettyFormat.plugins;

const jsonToString = (rendered: any) => prettyFormat(rendered, { plugins: [ReactTestComponent],});

describe("<MarketButton> Component", () => {
    for (let completedScenarios of [1, 2]) {
        describe(`When ${completedScenarios} scenario(s) have been completed`, () => {
            test(`Shows 'Market is Open' when user is The Burdened`, () => {
                const component = renderer.create(
                    <MarketButton completedScenarios={completedScenarios} isBurdened={true} />
                );
                const componentRendered = component.toJSON();
                expect(jsonToString(componentRendered)).toContain('id="open"');
                expect(jsonToString(componentRendered)).not.toContain('id="actualized"');
                expect(componentRendered).toMatchSnapshot();
            });
            test(`Shows 'Move Along' market image when user is not The Burdened`, () => {
                const component = renderer.create(
                    <MarketButton completedScenarios={completedScenarios} isBurdened={false} />
                );
                const componentRendered = component.toJSON();
                expect(jsonToString(componentRendered)).toContain('id="move"');
                expect(componentRendered).toMatchSnapshot();
            });
        });
    }
    for (let completedScenarios of [3, 4]) {
        describe(`When ${completedScenarios} scenario(s) have been completed`, () => {
            test(`Shows "actualized" image when user is The Burdened`, () => {
                const component = renderer.create(
                    <MarketButton completedScenarios={completedScenarios} isBurdened={true} />
                );
                const componentRendered = component.toJSON();
                expect(jsonToString(componentRendered)).toContain('id="actualized"');
                expect(componentRendered).toMatchSnapshot();
            });
            test(`Shows 'Market is Closed' market image when user is not The Burdened`, () => {
                const component = renderer.create(
                    <MarketButton completedScenarios={completedScenarios} isBurdened={false} />
                );
                const componentRendered = component.toJSON();
                expect(jsonToString(componentRendered)).toContain('id="closed"');
                expect(componentRendered).toMatchSnapshot();
            });
        });
    }
});
