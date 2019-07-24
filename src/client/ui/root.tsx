import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import AiPanel from './aiPanel';
import DebugPanel from './debugPanel';
import GamePanel from '../play/gamePanel';
import HomePanel from './homePanel';
import LeaderboardPanel from '../profiles/leaderboardPanel';
import PartyPanel from './partyPanel';
import PrivacyPolicyPanel from './privacyPolicyPanel';
import ProfilePanel from '../profiles/profilePanel';
import RecordPanel from '../play/recordPanel';
import SettingsPanel from './settingsPanel';
import TitleSection from './titleSection';
import NavBar from '../nav/navbar';
import RegionsPanel from './regionsPanel';
import UrlListener from '../controls/urlListener';
import WatchPanel from './watchPanel';

import ModdingOverviewTab from '../modding/overviewTab';
import IconEditor from '../modding/iconEditor';
import MapEditor from '../modding/mapEditor';
import ObstacleEditor from '../modding/obstacleEditor';
import SoundEditor from '../modding/soundEditor';
import SpellEditor from '../modding/spellEditor';
import ConstantEditor from '../modding/constantEditor';

interface Props {
    myGameId: string;
    current: s.PathElements;
}

function stateToProps(state: s.State): Props {
    return {
        myGameId: state.world.ui.myGameId,
        current: state.current,
    };
}

class Root extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.myGameId) {
            return this.renderGame();
        } else if (this.props.current.recordId) {
            return this.renderRecord();
        } else {
            return this.renderPage();
        }
    }

    private renderGame() {
        return <GamePanel />;
    }

    private renderRecord() {
        return <RecordPanel />;
    }

    private renderPage() {
        const page = this.props.current.page;
        return (
            <div className="root-panel">
                {page === "" && this.renderHome()}
                {page === "debug" && this.renderDebug()}
                {page === "leaderboard" && this.renderLeaderboard()}
                {page === "party" && this.renderParty()}
                {page === "ai" && this.renderAi()}
                {page === "regions" && this.renderRegions()}
                {page === "about" && this.renderAbout()}
                {page === "profile" && this.renderProfile()}
                {page === "settings" && this.renderSettings()}
                {page === "watch" && this.renderWatch()}
                {page === "privacy" && this.renderPrivacy()}
                {page === "modding" && <ModdingOverviewTab />}
                {page === "modding-spells" && <SpellEditor />}
                {page === "modding-icons" && <IconEditor />}
                {page === "modding-sounds" && <SoundEditor />}
                {page === "modding-maps" && <MapEditor />}
                {page === "modding-obstacles" && <ObstacleEditor />}
                {page === "modding-constants" && <ConstantEditor />}
                <UrlListener />
            </div>
        );
    }

    private renderHome() {
        return <HomePanel />
    }

    private renderParty() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <PartyPanel />
            </div>
        </div>;
    }

    private renderAi() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <AiPanel />
            </div>
        </div>;
    }

    private renderRegions() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <RegionsPanel />
            </div>
        </div>;
    }

    private renderAbout() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <TitleSection />
            </div>
        </div>;
    }

    private renderDebug() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <DebugPanel />
            </div>
        </div>;
    }

    private renderLeaderboard() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <LeaderboardPanel category={m.GameCategory.PvP} />
            </div>
        </div>;
    }

    private renderProfile() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <ProfilePanel />
            </div>
        </div>;
    }

    private renderSettings() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <SettingsPanel />
            </div>
        </div>;
    }

    private renderWatch() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <WatchPanel />
            </div>
        </div>;
    }

    private renderPrivacy() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <PrivacyPolicyPanel />
            </div>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(Root);