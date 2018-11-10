import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as keyboardUtils from '../core/keyboardUtils';
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

import { isMobile } from '../core/userAgent';

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

    render() {
        const allowExit = this.props.exitable || !this.props.connected;
        return (
            <div id="game-panel" className={isMobile ? "mobile" : "desktop"}>
                <CanvasPanel />
                <InfoPanel />
                <MessagesPanel />
                <SpellInfoPanel />
                {allowExit && <a className="exit-link" href="#" onClick={(ev) => this.onExitClicked(ev)}>
                    <i className="fa fa-chevron-left" /> Back to Home <span className="return-home-subtext">(spell selection, replays and more)</span>
                </a>}
                {!isMobile && allowExit && <SocialBar />}
                <GameKeyCustomizer />
                <UrlListener />
            </div>
        );
    }

    private onExitClicked(ev: React.MouseEvent) {
        ev.preventDefault();

        if (!(this.props.party)) {
            // If in party, might get called back in at any time, so stay in fullscreen mode
            screenLifecycle.exitGame();
        }
        matches.leaveCurrentGame();
        pages.reloadPageIfNecessary();
    }
}

export default ReactRedux.connect(stateToProps)(GamePanel);