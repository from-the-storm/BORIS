import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { RootState } from '../global/state';
import { Actions } from './registration-state-actions';


interface OwnProps {
}
interface Props extends OwnProps, DispatchProp<RootState> {
}
interface State {
    // Has the user consented to the program/study's terms?
    hasConsented: boolean;
    firstName: string;
    email: string;
    workInTech: 'yes'|'no'|undefined;
    occupation: string;
    age: number|'';
    gender: 'm'|'f'|'o'|undefined;
}

class _RegisterComponent extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasConsented: false,
            firstName: '',
            email: '',
            workInTech: undefined,
            occupation: '',
            age: '',
            gender: undefined,
        };
    }

    public render() {
        if (!this.state.hasConsented) {
            return <div>
                <p>Step 1 of 2</p>
                <h1>Consent</h1>
                <p>Apocalypse Made Easy! is part of a study...</p>

                <div className="button-split">
                    <button className="small" onClick={this.handleDoNotConsent}>I do not consent</button>
                    <button onClick={this.handleConsent}>I Consent</button>
                </div>
            </div>;
        } else {
            return <div>
                <p>Step 2 of 2</p>
                <h1>Create a Profile</h1>
                <form onSubmit={this.handleRegistrationFormSubmit}>
                    <input name="firstName" type="text" required placeholder="First name" aria-label="First name" value={this.state.firstName} onChange={this.handleFormFieldChange} />
                    <input name="email" type="email" required placeholder="Email address" aria-label="Email address" aria-describedby="email-details" value={this.state.email} onChange={this.handleFormFieldChange} />
                    <p id="email-details">Your email will only be used to verify your account, log you in, and reset your password if forgotten.</p>
                    <fieldset>
                        <legend>Do you work in tech?</legend>
                        <div>
                            <input required type="radio" id="tech-yes" name="workInTech" value="yes" checked={this.state.workInTech === 'yes'} onChange={this.handleFormFieldChange} />
                            <label htmlFor="tech-yes">Yes</label>
                        </div>
                        <div>
                            <input required type="radio" id="tech-no" name="workInTech" value="no" checked={this.state.workInTech === 'no'} onChange={this.handleFormFieldChange} />
                            <label htmlFor="tech-no">No</label>
                        </div>
                    </fieldset>
                    <input name="occupation" type="text" placeholder="Occupation" aria-label="Occupation" value={this.state.occupation} onChange={this.handleFormFieldChange} />
                    <input name="age" type="number" placeholder="Age" min="10" max="120" value={this.state.age} onChange={this.handleFormFieldChange} />
                    <fieldset>
                        <legend>Gender</legend>
                        <div>
                            <input name="gender" type="radio" id="gender-m" value="m" checked={this.state.gender === 'm'} onChange={this.handleFormFieldChange} />
                            <label htmlFor="gender-m">Male</label>
                        </div>
                        <div>
                            <input name="gender" type="radio" id="gender-f" value="f" checked={this.state.gender === 'f'} onChange={this.handleFormFieldChange} />
                            <label htmlFor="gender-f">Female</label>
                        </div>
                        <div>
                            <input name="gender" type="radio" id="gender-o" value="o" checked={this.state.gender === 'o'} onChange={this.handleFormFieldChange} />
                            <label htmlFor="gender-o">Other</label>
                        </div>
                    </fieldset>
                    <div className="button-split">
                        <button className="small" onClick={this.undoConsent}>&lt; Back</button>
                        {/* For the Register button, there's no click handler - it will submit the form, after
                            first triggering the browser's built-in form validation.*/}
                        <button>Register</button>
                    </div>
                </form>
            </div>;
        }
    }

    @bind private handleDoNotConsent() { this.props.dispatch({type: Actions.SHOW_HOME}); }
    @bind private handleConsent() { this.setState({hasConsented: true}); }
    @bind private handleFormFieldChange(event: React.ChangeEvent<HTMLInputElement>) {
        const name = event.target.name;
        const value = (event.target.type === 'number' && event.target.value) ? parseInt(event.target.value) : event.target.value;
        this.setState({[name as any]: value});
    }
    @bind private undoConsent() { this.setState({hasConsented: false}); }
    @bind private handleRegistrationFormSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        return false;
    }
}

export const RegisterComponent = connect((state: RootState, ownProps: OwnProps) => ({
    //
}))(_RegisterComponent);
