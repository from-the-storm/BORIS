import * as React from 'react';

import { BulletinStepUiState } from '../../../common/game';


interface Props extends BulletinStepUiState {
}

export class BulletinStep extends React.PureComponent<Props> {
    public render() {
        return (
            <div className="bulletin-segment" dangerouslySetInnerHTML={{__html: this.props.bulletinHTML}}></div>
        );
    }
}
