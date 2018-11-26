import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as ads from '../core/ads';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as screenLifecycle from './screenLifecycle';

import InfoPanel from './infoPanel';
import MessagesPanel from './messagesPanel';
import CanvasPanel from './canvasPanel';
import GameKeyCustomizer from './gameKeyCustomizer';
import SocialBar from './socialBar';
import SpellInfoPanel from './spellInfoPanel';
import UrlListener from './urlListener';

import { isMobile, isFacebook } from '../core/userAgent';

interface Props {
    party: s.PartyState;
    connected: boolean;
    exitable: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        party: state.party,
        connected: !!state.socketId,
        exitable: matches.worldInterruptible(state.world),
    };
}

class GamePanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    componentWillMount() {
        ads.gameplayStart();
    }

    componentWillUnmount() {
        ads.gameplayStop();
    }

    render() {
        const allowExit = this.props.exitable || !this.props.connected;
        return (
            <div id="game-panel" className={isMobile ? "mobile" : "desktop"}>
                <CanvasPanel />
                <InfoPanel />
                <MessagesPanel />
                <SpellInfoPanel />
                {allowExit && <span className="nav-item exit-link" onClick={() => this.onExitClicked()}>
                    <i className="fa fa-chevron-left" /> Back to Home{!isFacebook && <span className="return-home-subtext"> (spell selection, replays and more)</span>}
                </span>}
                {!isFacebook && !isMobile && allowExit && <SocialBar />}
                <GameKeyCustomizer />
                <UrlListener />
            </div>
        );
    }

    private onExitClicked() {
        if (!(this.props.party)) {
            // If in party, might get called back in at any time, so stay in fullscreen mode
            screenLifecycle.exitGame();
        }
        matches.leaveCurrentGame();
        pages.reloadPageIfNecessary();
    }
}

export default ReactRedux.connect(stateToProps)(GamePanel);