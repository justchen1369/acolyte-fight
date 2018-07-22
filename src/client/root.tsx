import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as url from './url';
import { GamePanel } from './gamePanel';
import { HomePanel } from './homePanel';
import { RecentGameList } from '../client/recentGameList';
import { TitleSection } from '../client/titleSection';
import { CustomGamesPanel } from './customGamesPanel';

interface Props {
    playerName: string;
    current: url.PathElements;
    connected: boolean;
    world: w.World;
    items: s.NotificationItem[];
    changePage: (newPage: string) => void;
    newGameCallback: () => void;
    exitGameCallback: () => void;
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
            connected={this.props.connected}
            playerName={this.props.playerName}
            newGameCallback={this.props.newGameCallback}
            exitGameCallback={this.props.exitGameCallback} />;
    }

    private renderPage() {
        const page = this.props.current.page;
        return (
            <div className="root-panel">
                <div className="navbar">
                    {this.renderNavBarItem("", "Home")}
                    {this.renderNavBarItem("replays", "Replays")}
                    {this.renderNavBarItem("custom", "Custom Games")}
                    {this.renderNavBarItem("share", "Share")}
                    {this.renderNavBarItem("about", "About")}
                    <div className="spacer" />
                </div>
                {page === "" && this.renderHome()}
                {page === "replays" && this.renderReplays()}
                {page === "share" && this.renderShare()}
                {page === "custom" && this.renderCustom()}
                {page === "about" && this.renderAbout()}
            </div>
        );
    }

    private renderNavBarItem(page: string, label: string) {
        const className = this.props.current.page === page ? "nav-item nav-item-selected" : "nav-item";
        const newPath = url.getPath(Object.assign({}, this.props.current, { page }));
        return <a className={className} href={newPath} onClick={(ev) => this.onNavClick(ev, page)}>{label}</a>
    }

    private onNavClick(ev: React.MouseEvent<HTMLAnchorElement>, newPage: string) {
        ev.preventDefault();
        this.props.changePage(newPage);
    }

    private renderHome() {
        return <HomePanel
            current={this.props.current}
            changePage={this.props.changePage}
            newGameCallback={this.props.newGameCallback} />
    }

    private renderShare() {
        return <div className="content-container">
            <div className="page">
                <h1>Discord</h1>
                <p><a href="https://discord.gg/sZvgpZk" target="_blank">Join the chat on Discord!</a></p>
            </div>
        </div>;
    }

    private renderCustom() {
        return <div className="content-container">
            <div className="page">
                <CustomGamesPanel current={this.props.current} />
            </div>
        </div>;
    }

    private renderReplays() {
        return <div className="content-container">
            <div className="page">
                <RecentGameList />
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