import * as React from 'react';

import { FinishLineStepUiState } from '../../../common/game';


interface Props extends FinishLineStepUiState {
}

export class FinishLineStep extends React.PureComponent<Props> {
    public render() {
        return (
            <hr/>
        );
    }
}
