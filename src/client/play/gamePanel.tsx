import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as options from '../options';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as screenLifecycle from '../ui/screenLifecycle';
import * as StoreProvider from '../storeProvider';
import * as watcher from '../core/watcher';

import Button from '../controls/button';
import ControlSurface from './controlSurface';
import InfoPanel from './infoPanel';
import MessagesPanel from './messagesPanel';
import CanvasPanel from './canvasPanel';
import HintPanel from './hintPanel';
import GameKeyCustomizer from './gameKeyCustomizer';
import OnlineSegmentListener from '../controls/onlineSegmentListener';
import ButtonPanel from './buttonPanel';
import SocialBar from '../controls/socialBar';
import SoundController from './soundController';
import SpellInfoPanel from './spellInfoPanel';
import TitleListener from '../controls/titleListener';
import UrlListener from '../controls/urlListener';
import WatchLooper from '../controls/watchLooper';

import { isMobile } from '../core/userAgent';

interface Props {
    party: s.PartyState;
    connected: boolean;
    exitable: boolean;
    wheelOnRight: boolean;
    customizing: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        party: state.party,
        connected: !!state.socketId,
        exitable: matches.worldInterruptible(state.world),
        wheelOnRight: state.options.wheelOnRight,
        customizing: state.customizing,
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
        const customizing = this.props.customizing;
        return (
            <ControlSurface>
                <TitleListener />
                <CanvasPanel />
                {!customizing && <>
                    <InfoPanel />
                    <MessagesPanel />
                    {allowExit && <Button className="nav-item exit-link" onClick={(ev) => this.onExitClicked(ev)}>
                        <i className="fa fa-chevron-left" /> Back to Home
                    </Button>}
                    {!a.noExternalLinks && !isMobile && allowExit && <SocialBar />}
                    {<ButtonPanel />}
                </>}
                {customizing && <Button className="nav-item customizing-bar" onClick={(ev) => this.onUncustomizeClicked(ev)}>
                    <i className="fas fa-times" />{!isMobile && "Choosing Spells"}
                </Button>}
                <SpellInfoPanel />
                <HintPanel />
                <GameKeyCustomizer />
                <SoundController />
                <OnlineSegmentListener />
                <UrlListener />
                <WatchLooper />
            </ControlSurface>
        );
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

    private onUncustomizeClicked(ev: React.MouseEvent) {
        StoreProvider.dispatch({ type: "customizing", customizing: false });
    }
}

export default ReactRedux.connect(stateToProps)(GamePanel);