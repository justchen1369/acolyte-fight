import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';

interface Props {
    ads: string;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        ads: state.ads,
    };
}

class SocialBar extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return this.props.ads ? null : this.renderSocialBar();
    }

    private renderSocialBar() {
        // <a href="http://twitter.com/acolytefight" target="_blank" title="Twitter"><i className="fab fa-twitter-square" /></a>
        return <div className="social-bar">
            <a href="https://facebook.com/acolytefight" target="_blank" title="Facebook"><i className="fab fa-facebook" /></a>
            <a href="https://reddit.com/r/acolytefight" target="_blank" title="Reddit"><i className="fab fa-reddit-square" /></a>
            <a href="https://discord.gg/sZvgpZk" target="_blank" title="Chat on Discord!"><i className="fab fa-discord" /></a>
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(SocialBar);