import * as React from 'react';

interface Props {
    playerName: string;
}
interface State {
}

export class Controls extends React.Component<Props, State> {
    render() {
        return (
            <div className="controls">
                <div>Welcome {this.props.playerName}!</div>
                <div style={{ fontSize: "80%" }}>
                    <a href="settings.html" target="_blank">
                        Edit Settings <i className="fa fa-external-link-square-alt" />
                    </a>
                </div>
            </div>
        );
    }
}