import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import AiPanel from './aiPanel';
import GamePanel from './gamePanel';
import HomePanel from './homePanel';
import RecentGameList from './recentGameList';
import PartyPanel from './partyPanel';
import TitleSection from './titleSection';
import ModdingPanel from './moddingPanel';
import NavBar from './navbar';
import UrlListener from './urlListener';

interface Props {
    myGameId: string;
    isNewPlayer: boolean;
    playerName: string;
    party: s.PartyState;
    current: s.PathElements;
    connected: boolean;
    items: s.NotificationItem[];
}

function stateToProps(state: s.State): Props {
    return {
        myGameId: state.world.ui.myGameId,
        isNewPlayer: state.isNewPlayer,
        playerName: state.playerName,
        party: state.party,
        current: state.current,
        connected: !!state.socketId,
        items: state.items,
    };
}

class Root extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.myGameId) {
            return this.renderGame();
        } else {
            return this.renderPage();
        }
    }

    private renderGame() {
        return <GamePanel />;
    }

    private renderPage() {
        const page = this.props.current.page;
        return (
            <div className="root-panel">
                {page === "" && this.renderHome()}
                {page === "replays" && this.renderReplays()}
                {page === "party" && this.renderParty()}
                {page === "modding" && this.renderModding()}
                {page === "ai" && this.renderAi()}
                {page === "about" && this.renderAbout()}
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

    private renderModding() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <ModdingPanel />
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

    private renderReplays() {
        return <div className="content-container">
            <NavBar />
            <div className="page">
                <RecentGameList />
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
}

export default ReactRedux.connect(stateToProps)(Root);