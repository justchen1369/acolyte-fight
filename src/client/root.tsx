import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import { GamePanel } from './gamePanel';
import { HomePanel } from './homePanel';
import { RecentGameList } from '../client/recentGameList';
import { TitleSection } from '../client/titleSection';
import { PrivateRoomPanel } from './privateRoomPanel';

interface Props {
    playerName: string;
    room: string;
    world: w.World;
    items: s.NotificationItem[];
    page: string;
    changePage: (newPage: string) => void;
    newGameCallback: () => void;
    exitGameCallback: () => void;
    watchGameCallback: (gameId: string) => void;
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
            world={this.props.world} 
            items={this.props.items} 
            playerName={this.props.playerName}
            newGameCallback={this.props.newGameCallback}
            exitGameCallback={this.props.exitGameCallback} />;
    }

    private renderPage() {
        const page = this.props.page;
        return (
            <div className="root-panel">
                <div className="navbar">
                    {this.renderNavBarItem(null, "Home")}
                    {this.renderNavBarItem("replays", "Replays")}
                    {this.renderNavBarItem("share", "Share")}
                    {this.renderNavBarItem("about", "About")}
                    <div className="spacer" />
                </div>
                {page === null && this.renderHome()}
                {page === "replays" && this.renderReplays()}
                {page === "share" && this.renderShare()}
                {page === "about" && this.renderAbout()}
            </div>
        );
    }

    private renderNavBarItem(page: string, label: string) {
        const className = this.props.page === page ? "nav-item nav-item-selected" : "nav-item";
        return <span className={className} onClick={() => this.props.changePage(page)}>{label}</span>
    }

    private renderHome() {
        return <HomePanel
            room={this.props.room}
            newGameCallback={this.props.newGameCallback} />
    }

    private renderShare() {
        return <div className="content-container">
            <div className="page">
                <PrivateRoomPanel />
                <h1>Discord</h1>
                <p><a href="https://discord.gg/sZvgpZk" target="_blank">Join the chat on Discord!</a></p>
            </div>
        </div>;
    }

    private renderReplays() {
        return <div className="content-container">
            <div className="page">
                <RecentGameList watchGameCallback={(gameId) => this.props.watchGameCallback(gameId)} />
            </div>
        </div>;
    }

    private renderAbout() {
        return <div className="content-container">
            <div className="page">
                <TitleSection />
            </div>
        </div>;
    }
}