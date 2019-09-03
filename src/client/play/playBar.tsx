import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as matches from '../core/matches';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as StoreProvider from '../storeProvider';
import * as screenLifecycle from '../ui/screenLifecycle';
import * as w from '../../game/world.model';
import * as watcher from '../core/watcher';

import ButtonPanelLabel from './buttons/buttonPanelLabel';
import CustomBar from '../nav/customBar';
import HrefItem from '../nav/hrefItem';
import { isMobile } from '../core/userAgent';

interface Props {
    connected: boolean;
    exitable: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    return {
        exitable: matches.worldInterruptible(world),
        connected: !!state.socketId,
    };
}

class PlayBar extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
        };
    }

    render() {
        return <CustomBar>
            <HrefItem disabled={!this.allowExit()} onClick={() => this.onExitClicked()}><i className="fas fa-chevron-left" /><span className="shrink"> Back to</span> Home</HrefItem>
            {this.props.children}
            <ButtonPanelLabel />
        </CustomBar>
    }

    private allowExit() {
        return this.props.exitable || !this.props.connected;
    }

    private onExitClicked() {
        const state = StoreProvider.getState();
        if (!state.party) {
            // If in party, might get called back in at any time, so stay in fullscreen mode
            screenLifecycle.exitGame();
        }

        watcher.stopWatching();
        matches.leaveCurrentGame();
        pages.reloadPageIfNecessary();
    }
}

export default ReactRedux.connect(stateToProps)(PlayBar);