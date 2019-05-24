import bind from 'bind-decorator';
import * as React from 'react';
import { connect, DispatchProp } from 'react-redux';

import { Gender } from '../../common/models';
import { RootState } from '../global/state';
import { Actions } from './registration-state-actions';
import { REGISTER_USER } from '../../common/api';
import { callApi } from '../api';
import { AnyAction } from '../global/actions';

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
    gender: Gender|undefined;
    // State of the submission:
    errorMessage: string,
    waitingForServerResponse: boolean,
    registrationComplete: boolean,
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
            // State of the submission:
            errorMessage: '',
            waitingForServerResponse: false,
            registrationComplete: false,
        };
    }

    public render() {
        if (this.state.registrationComplete) {
            return <div>
                <h1>Check your email</h1>
                <p>Thanks for registering! Check your email (it might be in your spam folder) and click the link to log in.</p>
            </div>
        } else if (!this.state.hasConsented) {
            return <div>
                <p className="steps">Step 1 of 2</p>
                <h1>Consent</h1>
                <p>Apocalypse Made Easy! is part of a study led by Peter Klein (email: peter.klein@ubc.ca; phone: 604-822-5823), along with Andrew Munroe at the University of British Columbia, Melbourne-based First Person Consulting, and the Propel Centre for Population Health Impact at the University of Waterloo.</p>
                
                <p>As a Social Innovators Challenge Project funded by the Movember Foundation, its focus is on social connectedness. In order to study social connectedness and improve the program, the way you interact with Apocalypse Made Easy!, along with limited demographic data you supply while registering a profile, is recorded and stored. This data will be anonymized and stored on secure servers in Canada, and only accessible to the research team.</p>

                <p>Each scenario that you choose to complete will take between 40 and 120 minutes. While using the program you are not required to do anything you are uncomfortable with.</p>

                <p>If you have any concerns or complaints about your rights as a research participant and/or your experiences while participating in this study, contact the Research Participant Complaint Line in the University British Columbia’s Office of Research Ethics at 1-604-822-8598 or if long distance e-mail RSIL@ors.ubc.ca or call toll free 1-877-822-8598.</p>
                <div className="button-split">
                    <a className="small" onClick={this.handleDoNotConsent}>I do not consent</a>
                    <button onClick={this.handleConsent}>I Consent</button>
                </div>
            </div>;
        } else {
            return <div>
                <p className="steps">Step 2 of 2</p>
                <h1>Create a Profile</h1>
                <form onSubmit={this.handleRegistrationFormSubmit}>
                    <input name="email" type="email" required placeholder="Email address" aria-label="Email address" aria-describedby="email-details" value={this.state.email} onChange={this.handleFormFieldChange} className={this.state.email ? 'selected' : 'deselected'} />
                    <p id="email-details">Your email will be used to verify your account and log you in.</p>
                    <input name="firstName" type="text" required placeholder="First name" aria-label="First name" value={this.state.firstName} onChange={this.handleFormFieldChange} className={this.state.firstName ? 'selected' : 'deselected'} />
                    <fieldset className={this.state.workInTech ? 'selected' : 'deselected'}>
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
                    <p id="tech-details">(Including non-technical roles within tech companies.)</p>
                    <input name="occupation" type="text" required placeholder="Occupation" aria-label="Occupation" value={this.state.occupation} onChange={this.handleFormFieldChange} className={this.state.occupation ? 'selected' : 'deselected'} />
                    <input name="age" type="number" required placeholder="Age" min="10" max="120" value={this.state.age} onChange={this.handleFormFieldChange} className={this.state.age ? 'selected' : 'deselected'} />
                    <fieldset className={this.state.gender ? 'selected' : 'deselected'}>
                        <legend>Gender</legend>
                        <div>
                            <input required name="gender" type="radio" id="gender-f" value="f" checked={this.state.gender === 'f'} onChange={this.handleFormFieldChange} />
                            <label htmlFor="gender-f">Female</label>
                        </div>
                        <div>
                            <input required name="gender" type="radio" id="gender-m" value="m" checked={this.state.gender === 'm'} onChange={this.handleFormFieldChange} />
                            <label htmlFor="gender-m">Male</label>
                        </div>
                        <div>
                            <input required name="gender" type="radio" id="gender-o" value="o" checked={this.state.gender === 'o'} onChange={this.handleFormFieldChange} />
                            <label htmlFor="gender-o">Other</label>
                        </div>
                        <div>
                            <input required name="gender" type="radio" id="gender-n" value="n" checked={this.state.gender === 'n'} onChange={this.handleFormFieldChange} />
                            <label htmlFor="gender-n">Prefer not to answer</label>
                        </div>
                    </fieldset>
                    {this.state.errorMessage ?
                        <div className="login-error">{this.state.errorMessage}</div>
                    :null}
                    <div className="button-split">
                        <a className="small" onClick={this.undoConsent}>&lt; Back</a>
                        {/* For the Register button, there's no click handler - it will submit the form, after
                            first triggering the browser's built-in form validation.*/}
                        <button disabled={this.state.waitingForServerResponse}>Register</button>
                    </div>
                </form>
            </div>;
        }
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, shapshot?: any) {
        const screenChanged = (this.state.hasConsented !== prevState.hasConsented) || (this.state.registrationComplete !== prevState.registrationComplete);
        if (screenChanged) {
            // When the user clicks "I consent" to move to the next step of the form, etc.,
            // we need to scroll back up to the top, or else they'll see the middle of the
            // next step of the form, instead of the beginning.
            window.scrollTo({top: 0});
        }
    }

    @bind private handleDoNotConsent() { this.props.dispatch<AnyAction>({type: Actions.SHOW_HOME}); }
    @bind private handleConsent() { this.setState({hasConsented: true}); }
    @bind private handleFormFieldChange(event: React.ChangeEvent<HTMLInputElement>) {
        const name = event.target.name;
        const value = (event.target.type === 'number' && event.target.value) ? parseInt(event.target.value) : event.target.value;
        this.setState({[name]: value} as any);
    }
    @bind private undoConsent() { 
        if (!this.state.waitingForServerResponse) {
            this.setState({hasConsented: false}); 
        }
    }
    @bind private handleRegistrationFormSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        this.setState({waitingForServerResponse: true});
        this.submitRegistrationFormData();
        return false;
    }
    private async submitRegistrationFormData() {
        try {
            await callApi(REGISTER_USER, {
                hasConsented: this.state.hasConsented,
                firstName: this.state.firstName,
                email: this.state.email,
                workInTech: this.state.workInTech,
                occupation: this.state.occupation,
                age: this.state.age,
                gender: this.state.gender,
            });
        } catch (error) {
            this.setState({
                waitingForServerResponse: false,
                errorMessage: error.message,
            });
            return;
        }
        this.setState({
            waitingForServerResponse: false,
            registrationComplete: true,
        });
    }
}

export const RegisterComponent = connect((state: RootState, ownProps: OwnProps) => ({
    //
}))(_RegisterComponent);
