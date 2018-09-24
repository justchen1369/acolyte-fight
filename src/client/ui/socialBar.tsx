import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';

interface Props {
}
interface State {
}

class SocialBar extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div className="social-bar">
            <a href="http://facebook.com/acolytefight" target="_blank" title="Facebook"><i className="fab fa-facebook" /></a>
            <a href="http://reddit.com/r/acolytefight" target="_blank" title="Reddit"><i className="fab fa-reddit-square" /></a>
            <a href="https://discord.gg/sZvgpZk" target="_blank" title="Chat on Discord!"><i className="fab fa-discord" /></a>
        </div>
    }
}

export default SocialBar;