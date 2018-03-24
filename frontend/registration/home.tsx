import * as React from 'react';
import * as friends from './images/gather-round.jpg';

export class HomeComponent extends React.PureComponent {
    public render() {
        return <div>
            <h1>Would you survive the end of the world?</h1>
            <p>After finishing the Apocalypse Made Easy! training course, the answer will be most definitely perhaps.</p>
            <img src={friends} alt="Apocalypse Made Easy! | Surviving is Better with Friends" />
        </div>;
    }
}
