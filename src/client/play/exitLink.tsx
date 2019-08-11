import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as s from '../store.model';
import * as screenLifecycle from '../ui/screenLifecycle';
import * as w from '../../game/world.model';
import * as watcher from '../core/watcher';

import Button from '../controls/button';

interface Props {
    connected: boolean;
    party: s.PartyState;
    world: w.World;
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    return {
        world,
        party: state.party,
        connected: !!state.socketId,
    };
}

class ExitLink extends React.PureComponent<Props> {
    render() {
        const exitable = matches.worldInterruptible(this.props.world);
        const allowExit = exitable || !this.props.connected;
        if (!allowExit) {
            return null;
        }

        return <Button className="nav-item exit-link" onClick={(ev) => this.onExitClicked(ev)}>
            <i className="fa fa-chevron-left" /> Back to Home
        </Button>
    }

    private onExitClicked(ev: React.MouseEvent) {
        if (!(this.props.party)) {
            // If in party, might get called back in at any time, so stay in fullscreen mode
            screenLifecycle.exitGame();
        }

        watcher.stopWatching();
        matches.leaveCurrentGame();
        pages.reloadPageIfNecessary();
    }
}

export default ReactRedux.connect(stateToProps)(ExitLink);