import * as React from 'react';
import * as ReactModal from 'react-modal';

import './prompt.scss';

// Use setAppElement to hide your application from screenreaders and other assistive technologies while the modal is open.
ReactModal.setAppElement('#app-container');

interface Props {
    close: () => void,
    heading: string,
    show: boolean
}

export const Prompt: React.SFC<Props> = ({children, close, heading, show}) => (
    <ReactModal
        isOpen={show}
        onRequestClose={close}
        role="dialog"
        aria={{
            labelledby: "prompt-heading",
            describedby: "prompt-description"
        }}
        overlayClassName="prompt-overlay"
        className="prompt-content"
    >
        <h1 id="prompt-heading">{heading}</h1>
        <div id="prompt-description">{children}</div>
        <button className="close" onClick={close}>X</button>
    </ReactModal>
)
