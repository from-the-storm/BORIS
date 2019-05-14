import * as React from 'react';
import * as ReactModal from 'react-modal';

// Use setAppElement to hide your application from screenreaders and other assistive technologies while the modal is open.
ReactModal.setAppElement('#app-container');

interface Props {
    close: () => void;
    fullscreen?: boolean;
    heading?: string;
    show: boolean;
}

export const Prompt: React.SFC<Props> = ({children, close, fullscreen, heading, show}) => (
    <ReactModal
        isOpen={show}
        onRequestClose={close}
        role="dialog"
        aria={{
            labelledby: heading ? "prompt-heading" : '',
            describedby: "prompt-description"
        }}
        overlayClassName="prompt-overlay"
        className={fullscreen ? 'prompt-content fullscreen' : 'prompt-content'}
    >
        {heading ? <h1 id="prompt-heading">{heading}</h1> : ''}
        <div id="prompt-description">{children}</div>
        <button className="close" onClick={close}>X</button>
    </ReactModal>
)
