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
            <a href="https://facebook.com/acolytefight" target="_blank" title="Follow Acolyte Fight on Facebook!"><i className="fab fa-facebook-square" /></a>
            <a href="https://www.youtube.com/channel/UCJr11iCM_aigs5mCqhF_H2g" target="_blank" title="Follow Acolyte Fight on YouTube!"><i className="fab fa-youtube-square" /></a>
            <a href="https://discord.gg/sZvgpZk" target="_blank" title="Follow Acolyte Fight on Discord!"><i className="fab fa-discord" /></a>
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(SocialBar);