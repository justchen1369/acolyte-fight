import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as screenLifecycle from './screenLifecycle';

import InfoPanel from './infoPanel';
import MessagesPanel from './messagesPanel';
import CanvasPanel from './canvasPanel';
import SpellInfoPanel from './spellInfoPanel';
import UrlListener from './urlListener';

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
            <div id="game-panel">
                <CanvasPanel />
                <InfoPanel />
                <MessagesPanel />
                <SpellInfoPanel />
                {allowExit && <a className="exit-link" href="#" onClick={(ev) => this.onExitClicked(ev)}>
                    <i className="fa fa-chevron-left" /> Back to Spell Selection
                </a>}
                <UrlListener />
            </div>
        );
    }

    private onExitClicked(ev: React.MouseEvent) {
        if (!(this.props.party && this.props.party.ready)) {
            // If in party, might get called back in at any time, so stay in fullscreen mode
            screenLifecycle.exitGame();
        }
        matches.leaveCurrentGame();
        pages.reloadPageIfNecessary();
    }
}

export default ReactRedux.connect(stateToProps)(GamePanel);