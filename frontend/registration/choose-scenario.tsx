import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { RootState } from '../global/state';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
    teamCode: string|null; // Gets set after the team is successfully created
}
interface State {
}

class _ChooseScenarioComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
    }
    public render() {
        if (this.props.teamCode === null) {
            return <div>Error: you must have joined a team to see the scenario list.</div>;
        }

        return <div>
            <h1>Choose Scenario</h1>
            <p>Share your team code <span className='mono'>{this.props.teamCode}</span> to recruit more team members. Your team should include 2 to 5 people. Then bring yourselves (and your phones) to a scenario start point.</p>
        </div>;
    }
}

export const ChooseScenarioComponent = connect((state: RootState, ownProps: OwnProps) => ({
    teamCode: state.teamState.teamCode,
}))(_ChooseScenarioComponent);
