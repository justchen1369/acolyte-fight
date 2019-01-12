import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as options from '../options';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as screenLifecycle from '../ui/screenLifecycle';

import InfoPanel from './infoPanel';
import MessagesPanel from './messagesPanel';
import CanvasPanel from './canvasPanel';
import GameKeyCustomizer from './gameKeyCustomizer';
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

class GamePanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const a = options.getProvider();
        const allowExit = this.props.exitable || !this.props.connected;
        const className = classNames({
            'mobile': isMobile,
            'desktop': !isMobile,
            'wheel-on-left': isMobile && !this.props.wheelOnRight,
            'wheel-on-right': isMobile && this.props.wheelOnRight,
        });
        return (
            <div id="game-panel" className={className}>
                <CanvasPanel />
                <InfoPanel />
                <MessagesPanel />
                <SpellInfoPanel />
                {allowExit && <span className="nav-item exit-link" onClick={() => this.onExitClicked()}>
                    <i className="fa fa-chevron-left" /> Back to Home{!a.noScrolling && <span className="return-home-subtext"> (spell selection, replays and more)</span>}
                </span>}
                {!a.noExternalLinks && !isMobile && allowExit && <SocialBar />}
                <GameKeyCustomizer />
                <UrlListener />
                {this.props.watching && <WatchLooper />}
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