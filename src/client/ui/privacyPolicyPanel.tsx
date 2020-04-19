import * as React from 'react';
import * as ReactRedux from 'react-redux';

interface Props {
}
interface State {
}

export class PrivacyPolicyPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div>
            <h1>Privacy Policy</h1>
            <p>
                This website uses cookies to personalise content and ads.
                Replays, game stats and site usage analytics are collected for the purpose of balancing the game and making it better.
            </p>
        </div>
    }
}

export default PrivacyPolicyPanel;