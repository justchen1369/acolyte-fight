import * as React from 'react';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import { AiPanel } from './aiPanel';
import { GamePanel } from './gamePanel';
import { HomePanel } from './homePanel';
import { RecentGameList } from './recentGameList';
import { PartyPanel } from './partyPanel';
import { TitleSection } from './titleSection';
import { ModdingPanel } from './moddingPanel';
import { NavBar } from './navbar';

interface Props {
    isNewPlayer: boolean;
    playerName: string;
    party: s.PartyState;
    current: s.PathElements;
    connected: boolean;
    world: w.World;
    items: s.NotificationItem[];
    changePage: (newPage: string) => void;
}
interface State {
}

export class Root extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.world.ui.myGameId) {
            return this.renderGame();
        } else {
            return this.renderPage();
        }
    }

    private renderGame() {
        return <GamePanel
            party={this.props.party}
            isNewPlayer={this.props.isNewPlayer}
            world={this.props.world} 
            items={this.props.items} 
            connected={this.props.connected}
            playerName={this.props.playerName}
        />;
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
            </div>
        );
    }

    private renderHome() {
        return <HomePanel
            current={this.props.current}
            party={this.props.party}
            world={this.props.world}
            changePage={this.props.changePage}
        />
    }

    private renderParty() {
        return <div className="content-container">
            <NavBar current={this.props.current} changePage={this.props.changePage} />
            <div className="page">
                <PartyPanel
                    current={this.props.current}
                    changePage={this.props.changePage}
                    mod={this.props.world.mod}
                    allowBots={this.props.world.allowBots}
                    party={this.props.party}
                />
            </div>
        </div>;
    }

    private renderModding() {
        return <div className="content-container">
            <NavBar current={this.props.current} changePage={this.props.changePage} />
            <div className="page">
                <ModdingPanel current={this.props.current} />
            </div>
        </div>;
    }

    private renderAi() {
        return <div className="content-container">
            <NavBar current={this.props.current} changePage={this.props.changePage} />
            <div className="page">
                <AiPanel
                    current={this.props.current}
                    allowBots={this.props.world.allowBots} />
            </div>
        </div>;
    }

    private renderReplays() {
        return <div className="content-container">
            <NavBar current={this.props.current} changePage={this.props.changePage} />
            <div className="page">
                <RecentGameList />
            </div>
        </div>;
    }

    private renderAbout() {
        return <div className="content-container">
            <NavBar current={this.props.current} changePage={this.props.changePage} />
            <div className="page">
                <TitleSection settings={this.props.world.settings} />
            </div>
        </div>;
    }
}