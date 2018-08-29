import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as matches from '../core/matches';
import * as screenLifecycle from './screenLifecycle';

import InfoPanel from './infoPanel';
import MessagesPanel from './messagesPanel';
import CanvasPanel from './canvasPanel';

interface Props {
    party: s.PartyState;
    isNewPlayer: boolean;
    playerName: string;
    items: s.NotificationItem[];
    connected: boolean;
    exitable: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        party: state.party,
        isNewPlayer: state.isNewPlayer,
        playerName: state.playerName,
        items: state.items,
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
                {allowExit && <a className="exit-link" href="#" onClick={(ev) => this.onExitClicked(ev)}>
                    <i className="fa fa-chevron-left" /> Back to Home
                </a>}
            </div>
        );
    }

    private onExitClicked(ev: React.MouseEvent) {
        screenLifecycle.exitGame();
        matches.leaveCurrentGame();
    }
}

export default ReactRedux.connect(stateToProps)(GamePanel);