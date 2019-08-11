import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as options from '../options';
import * as matches from '../core/matches';
import * as StoreProvider from '../storeProvider';

import AnchoredPanel from './anchoredPanel';
import Button from '../controls/button';
import ControlSurface from './controlSurface';
import ExitLink from './exitLink';
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
    exitable: boolean;
    wheelOnRight: boolean;
    customizing: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
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
        return (
            <ControlSurface>
                <TitleListener />
                <CanvasPanel />
                {this.renderPanels()}
                <SoundController />
                <OnlineSegmentListener />
                <UrlListener />
                <WatchLooper />
            </ControlSurface>
        );
    }

    private renderPanels() {
        const a = options.getProvider();
        const customizing = this.props.customizing;
        return <>
            {!customizing && <>
                <InfoPanel />
                <MessagesPanel />
                <ExitLink />
                {!a.noExternalLinks && !isMobile && this.props.exitable && <SocialBar />}
                {<ButtonPanel />}
            </>}
            {customizing && <Button className="nav-item customizing-bar" onClick={(ev) => this.onUncustomizeClicked(ev)}>
                <i className="fas fa-times" />{!isMobile && "Choosing Spells"}
            </Button>}
            <SpellInfoPanel />
            <HintPanel />
            <GameKeyCustomizer />
        </>
    }

    private onUncustomizeClicked(ev: React.MouseEvent) {
        StoreProvider.dispatch({ type: "customizing", customizing: false });
    }
}

export default ReactRedux.connect(stateToProps)(GamePanel);