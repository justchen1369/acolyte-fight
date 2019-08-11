import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as options from '../options';
import * as matches from '../core/matches';
import * as StoreProvider from '../storeProvider';

import Layout from './layout';
import ActionWheelSidePanel from './buttons/actionWheelSidePanel';
import Button from '../controls/button';
import ExitLink from './exitLink';
import GameKeyCustomizer from './gameKeyCustomizer';
import InfoPanel from './infoPanel';
import FinishedPanel from './finishedPanel';
import HelpMessage from './messages/helpMessage';
import HintPanel from './hintPanel';
import MessagesPanel from './messagesPanel';
import MutePanel from './buttons/mutePanel';
import RandomizePanel from './buttons/randomizePanel';
import SocialBar from '../controls/socialBar';
import SpellInfoPanel from './spellInfoPanel';
import TextMessageBox from './textMessageBox';
import VideoPanel from './buttons/videoPanel';

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

class HUD extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (isMobile) {
            return this.renderMobile();
        } else {
            return this.renderDesktop();
        }
    }

    private renderMobile() {
        const a = options.getProvider();
        const customizing = this.props.customizing;
        const modal = this.props.customizing;
        const wheelOnRight = this.props.wheelOnRight;
        return <>
            {customizing && <Button className="nav-item customizing-bar" onClick={(ev) => this.onUncustomizeClicked(ev)}>
                <i className="fas fa-times" />{"Choosing Spells"}
            </Button>}
            {!modal && <Layout anchorTop={true} anchorRight={true}>
                <InfoPanel />
            </Layout>}
            {!modal && <Layout className="messages" anchorBottom={true} anchorLeft={wheelOnRight} anchorRight={!wheelOnRight}>
                <MessagesPanel />
                <HelpMessage />
                <FinishedPanel />
            </Layout>}
            {!modal && <Layout anchorTop={true} anchorLeft={true}>
                <ExitLink />
                <div className="button-panel">
                    <TextMessageBox />
                    <MutePanel />
                    <ActionWheelSidePanel />
                    <RandomizePanel />
                </div>
            </Layout>}
            <Layout anchorTop={true}>
                <HintPanel />
            </Layout>
            <GameKeyCustomizer />
        </>
    }

    private renderDesktop() {
        const a = options.getProvider();
        const customizing = this.props.customizing;
        const modal = this.props.customizing;
        return <>
            {!a.noExternalLinks && this.props.exitable && <SocialBar />}
            {customizing && <Button className="nav-item customizing-bar" onClick={(ev) => this.onUncustomizeClicked(ev)}>
                <i className="fas fa-times" />{"Choosing Spells"}
            </Button>}
            {!modal && <Layout anchorTop={true} anchorRight={true}>
                <InfoPanel />
            </Layout>}
            {!modal && <Layout className="messages" anchorBottom={true} anchorLeft={true}>
                <MessagesPanel />
                <HelpMessage />
                <FinishedPanel />
                <TextMessageBox />
            </Layout>}
            {!modal && <Layout anchorTop={true} anchorLeft={true}>
                <ExitLink />
                <div className="button-panel">
                    <MutePanel />
                    <RandomizePanel />
                    <VideoPanel />
                </div>
            </Layout>}
            <Layout anchorBottom={true}>
                <HintPanel />
            </Layout>
            <SpellInfoPanel />
            <GameKeyCustomizer />
        </>
    }

    private onUncustomizeClicked(ev: React.MouseEvent) {
        StoreProvider.dispatch({ type: "customizing", customizing: false });
    }
}

export default ReactRedux.connect(stateToProps)(HUD);