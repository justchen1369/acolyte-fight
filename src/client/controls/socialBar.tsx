import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as options from '../options';
import * as s from '../store.model';
import './socialBar.scss';

interface Props {
    iconsLoaded: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        iconsLoaded: state.iconsLoaded,
    };
}

class SocialBar extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (!this.props.iconsLoaded) {
            return null;
        }

        const a = options.getProvider();
        if (a.noExternalLinks) {
            return null;
        }

        return this.renderSocialBar();
    }

    private renderSocialBar() {
        return <div className="social-bar">
            <a href="https://facebook.com/acolytefight" target="_blank" title="Facebook"><i className="fab fa-facebook-square" /></a>
            <a href="http://twitter.com/acolytefight" target="_blank" title="Twitter"><i className="fab fa-twitter-square" /></a>
            <a href="https://discord.gg/sZvgpZk" target="_blank" title="Chat on Discord!"><i className="fab fa-discord" /></a>
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(SocialBar);