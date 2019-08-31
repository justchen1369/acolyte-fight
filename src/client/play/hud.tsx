import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as engine from '../../game/engine';
import * as s from '../store.model';
import * as options from '../options';
import * as matches from '../core/matches';
import * as StoreProvider from '../storeProvider';

import ActionWheelSidePanel from './buttons/actionWheelSidePanel';
import AutoJoinConfigButton from './buttons/autoJoinConfigButton';
import Button from '../controls/button';
import ButtonPanelLabel from './buttons/buttonPanelLabel';
import InfoPanel from './infoPanel';
import FinishedPanel from './finishedPanel';
import GameKeyCustomizer from './gameKeyCustomizer';
import GraphicsLevelPanel from './buttons/graphicsLevelPanel';
import HelpMessage from './messages/helpMessage';
import HintPanel from './hintPanel';
import Layout from './layout';
import MessagesPanel from './messagesPanel';
import MutePanel from './buttons/mutePanel';
import PlayBar from './playBar';
import RandomizePanel from './buttons/randomizePanel';
import FullScreenButton from './buttons/fullScreenButton';
import SocialBar from '../controls/socialBar';
import SpellInfoPanel from './spellInfoPanel';
import TeamsMessage from './messages/teamsMessage';
import TextMessageBox from './textMessageBox';
import VideoPanel from './buttons/videoPanel';
import WaitingMessage from './messages/waitingMessage';

import { isMobile } from '../core/userAgent';

namespace Tab {
    export const Spells = "spells";
    export const Options = "options";
    export const Scoreboard = "scoreboard";
    export const Chat = "chat";
}

interface Props {
    myHeroId: string;
    exitable: boolean;
    wheelOnRight: boolean;
    customizing: boolean;
}
interface State {
    tab: string;
}

function stateToProps(state: s.State): Props {
    return {
        myHeroId: state.world.ui.myHeroId,
        exitable: matches.worldInterruptible(state.world),
        wheelOnRight: state.options.wheelOnRight,
        customizing: state.customizing,
    };
}

class HUD extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            tab: Tab.Chat,
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
        const spells = this.props.customizing;
        const tab = this.state.tab;
        const modal = this.props.customizing;
        return <>
            {!modal && <Layout anchorTop={true} anchorLeft={true}>
                <PlayBar />
            </Layout>}
            {!modal && <Layout anchorTop={true} anchorRight={true}>
                <div className="tab-switcher-panel">
                    {this.props.myHeroId && <Button className="tab-switcher-item" onClick={(ev) => this.onCustomizeClicked(ev) }>
                        <i className="fas fa-wand-magic" />
                    </Button>}
                    {this.renderTabSwitcherItem(Tab.Options, "fas fa-cog")}
                    {this.renderTabSwitcherItem(Tab.Scoreboard, "fas fa-trophy")}
                    {this.renderTabSwitcherItem(Tab.Chat, "fas fa-comments")}
                </div>
                {tab === Tab.Scoreboard && <>
                    <InfoPanel />
                </>}
                {tab === Tab.Options && <>
                    <MutePanel />
                    <AutoJoinConfigButton />
                    <GraphicsLevelPanel />
                    <ActionWheelSidePanel />
                </>}
                {tab === Tab.Chat && <div className="messages">
                    <TextMessageBox />
                    <FinishedPanel />
                    <HelpMessage />
                    <WaitingMessage />
                    <MessagesPanel />
                </div>}
                {!tab && <div className="messages">
                    <FinishedPanel />
                    <HelpMessage />
                    <WaitingMessage />
                </div>}
            </Layout>}
            {spells && <Layout anchorTop={true} anchorRight={true}>
                <Button className="nav-item customizing-bar" onClick={(ev) => this.onUncustomizeClicked(ev)}>
                    <span><i className="fas fa-times" /> Choosing Spells</span>
                </Button>
                <RandomizePanel />
            </Layout>}
            <Layout anchorBottom={true}>
                <HintPanel />
            </Layout>
            <TeamsMessage />
            <GameKeyCustomizer />
        </>
    }
    
    private renderTabSwitcherItem(tab: string, icon: string) {
        let className = "tab-switcher-item";
        if (tab === this.state.tab) {
            className += " tab-switcher-item-selected";
        }
        return <Button className={className} onClick={() => this.onTabClicked(tab)}>
            <i className={icon} />
        </Button>
    }

    private onTabClicked(tab: string) {
        if (this.state.tab === tab) {
            this.setState({ tab: null });
        } else {
            this.setState({ tab });
        }
    }

    private renderDesktop() {
        const a = options.getProvider();
        return <>
            <PlayBar>
                <MutePanel />
                <AutoJoinConfigButton />
                <GraphicsLevelPanel />
                <FullScreenButton />
                <RandomizePanel />
                <VideoPanel />
            </PlayBar>
            <Layout anchorTop={true} anchorRight={true}>
                <InfoPanel />
            </Layout>
            <Layout className="messages" anchorBottom={true} anchorLeft={true}>
                <MessagesPanel />
                <HelpMessage />
                <FinishedPanel />
                <WaitingMessage />
                <TextMessageBox />
            </Layout>
            <Layout anchorBottom={true}>
                <HintPanel />
            </Layout>
            <Layout anchorBottom={true} anchorRight={true}>
                <SpellInfoPanel />
            </Layout>
            {!a.noExternalLinks && this.props.exitable && <SocialBar />}
            <TeamsMessage />
            <GameKeyCustomizer />
        </>
    }

    private onCustomizeClicked(ev: React.MouseEvent) {
        StoreProvider.dispatch({ type: "customizing", customizing: true });
    }
    private onUncustomizeClicked(ev: React.MouseEvent) {
        StoreProvider.dispatch({ type: "customizing", customizing: false });
    }
}

export default ReactRedux.connect(stateToProps)(HUD);