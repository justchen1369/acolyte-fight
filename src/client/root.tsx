import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as rooms from './rooms';
import * as url from './url';
import { isMobile } from './userAgent';
import { AiPanel } from './aiPanel';
import { GamePanel } from './gamePanel';
import { HomePanel } from './homePanel';
import { RecentGameList } from '../client/recentGameList';
import { SharePanel } from '../client/sharePanel';
import { TitleSection } from '../client/titleSection';
import { ModdingPanel } from './moddingPanel';

interface Props {
    isNewPlayer: boolean;
    playerName: string;
    current: url.PathElements;
    connected: boolean;
    world: w.World;
    items: s.NotificationItem[];
    changePage: (newPage: string) => void;
    playVsAiCallback: () => void;
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
            isNewPlayer={this.props.isNewPlayer}
            world={this.props.world} 
            items={this.props.items} 
            connected={this.props.connected}
            playerName={this.props.playerName}
            playVsAiCallback={this.props.playVsAiCallback}
            newGameCallback={this.props.newGameCallback}
            exitGameCallback={this.props.exitGameCallback} />;
    }

    private renderPage() {
        const page = this.props.current.page;
        return (
            <div className="root-panel" onDragOver={ev => this.onDragOver(ev)} onDrop={ev => this.onDrop(ev)}>
                <div className="navbar">
                    {this.renderNavBarItem("", "Home")}
                    {this.renderNavBarItem("replays", "Replays")}
                    {this.renderNavBarItem("modding", "Modding", true)}
                    {this.renderNavBarItem("ai", "AI", true)}
                    {this.renderNavBarItem("share", "Share")}
                    {this.renderNavBarItem("about", "About")}
                    <div className="spacer" />
                </div>
                {page === "" && this.renderHome()}
                {page === "replays" && this.renderReplays()}
                {page === "share" && this.renderShare()}
                {page === "modding" && this.renderModding()}
                {page === "ai" && this.renderAi()}
                {page === "about" && this.renderAbout()}
            </div>
        );
    }

    private renderNavBarItem(page: string, label: string, hideOnMobile: boolean = false) {
        const classNames = ["nav-item"];
        if (this.props.current.page === page) {
            classNames.push("nav-item-selected");
        }
        if (hideOnMobile) {
            classNames.push("nav-optional");
        }

        const newPath = url.getPath(Object.assign({}, this.props.current, { page }));
        return <a className={classNames.join(" ")} href={newPath} onClick={(ev) => this.onNavClick(ev, page)}>{label}</a>
    }

    private onNavClick(ev: React.MouseEvent<HTMLAnchorElement>, newPage: string) {
        ev.preventDefault();
        this.props.changePage(newPage);
    }

    private renderHome() {
        return <HomePanel
            current={this.props.current}
            settings={this.props.world.settings}
            changePage={this.props.changePage}
            newGameCallback={this.props.newGameCallback} />
    }

    private renderShare() {
        return <div className="content-container">
            <div className="page">
                <SharePanel current={this.props.current} changePage={this.props.changePage} />
            </div>
        </div>;
    }

    private renderModding() {
        return <div className="content-container">
            <div className="page">
                <ModdingPanel current={this.props.current} />
            </div>
        </div>;
    }

    private renderAi() {
        return <div className="content-container">
            <div className="page">
                <AiPanel current={this.props.current} />
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
                <TitleSection settings={this.props.world.settings} />
            </div>
        </div>;
    }

    private onDragOver(ev: React.DragEvent) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "copy";
    }

    private onDrop(ev: React.DragEvent) {
        ev.stopPropagation();
        ev.preventDefault();
        rooms.createRoomFromFile(ev.dataTransfer.files.item(0), this.props.current);
    }
}