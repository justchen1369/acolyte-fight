import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as options from '../options';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as screenLifecycle from '../ui/screenLifecycle';

import Button from '../controls/button';
import ControlSurface from './controlSurface';
import InfoPanel from './infoPanel';
import MessagesPanel from './messagesPanel';
import CanvasPanel from './canvasPanel';
import GameKeyCustomizer from './gameKeyCustomizer';
import RandomizePanel from './randomizePanel';
import SocialBar from '../controls/socialBar';
import SpellInfoPanel from './spellInfoPanel';
import UrlListener from '../controls/urlListener';
import WatchLooper from '../controls/watchLooper';

import { isMobile } from '../core/userAgent';

interface Props {
    watching: boolean;
    party: s.PartyState;
    connected: boolean;
    exitable: boolean;
    wheelOnRight: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        watching: state.current.page === "watch",
        party: state.party,
        connected: !!state.socketId,
        exitable: matches.worldInterruptible(state.world),
        wheelOnRight: state.options.wheelOnRight,
    };
}

class GamePanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const a = options.getProvider();
        const allowExit = this.props.exitable || !this.props.connected;
        return (
            <ControlSurface>
                <CanvasPanel />
                <InfoPanel />
                <MessagesPanel />
                <SpellInfoPanel />
                {allowExit && <Button className="nav-item exit-link" onClick={(ev) => this.onExitClicked(ev)}>
                    <i className="fa fa-chevron-left" /> Back to Home
                </Button>}
                {!a.noExternalLinks && !isMobile && allowExit && <SocialBar />}
                <RandomizePanel />
                <GameKeyCustomizer />
                <UrlListener />
                {this.props.watching && <WatchLooper />}
            </ControlSurface>
        );
    }

    private onExitClicked(ev: React.MouseEvent) {
        ev.stopPropagation();

        if (!(this.props.party)) {
            // If in party, might get called back in at any time, so stay in fullscreen mode
            screenLifecycle.exitGame();
        }
        matches.leaveCurrentGame();
        pages.reloadPageIfNecessary();
    }
}

export default ReactRedux.connect(stateToProps)(GamePanel);