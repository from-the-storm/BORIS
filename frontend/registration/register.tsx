import * as React from 'react';
import {connect, DispatchProp} from 'react-redux';

import {RootState} from '../global/state';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
}

class _RegisterComponent extends React.PureComponent<Props> {
    public render() {
        return <div>
            <p>Step 1 of 2</p>
            <h1>Consent</h1>
            <p>Apocalypse Made Easy! is part of a study...</p>
        </div>;
    }
}

export const RegisterComponent = connect((state: RootState, ownProps: OwnProps) => ({
    //
}))(_RegisterComponent);
