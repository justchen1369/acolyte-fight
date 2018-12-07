import * as React from 'react';
import * as ReactRedux from 'react-redux';

interface Props {
}
interface State {
}

export class PrivacyPolicyPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div>
            <h1>Privacy Policy</h1>
            <p>
                Replays and game stats are collected for the purpose of balancing the game and making it better.
                No data is given to third parties.
            </p>
        </div>
    }
}

export default PrivacyPolicyPanel;