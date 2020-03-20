import * as React from 'react';

import './modalPanel.scss';

interface Props {
    className?: string;
    title: string;
    onClose?: () => void;
}

export default class ModalPanel extends React.PureComponent<Props> {
    render() {
        const bodyClassName = `modal-panel-body ${this.props.className}`;
        return <div className="modal-panel-container">
            <div className="modal-panel">
                <div className="modal-panel-title-bar">
                    <div className="modal-panel-title">
                        {this.props.title}
                    </div>
                    <div className="spacer" />
                    <div className="modal-panel-title-bar-actions">
                        {this.props.onClose && <i className="fas fa-times clickable" onClick={this.props.onClose} />}
                    </div>
                </div>
                <div className={this.props.className}>
                    {this.props.children}
                </div>
            </div>
        </div>
    }
}