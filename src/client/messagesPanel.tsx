import * as _ from 'lodash';
import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import { HeroColors, Matchmaking } from '../game/constants';
import { isMobile } from './userAgent';

interface Props {
    isNewPlayer: boolean;
    world: w.World;
    items: s.NotificationItem[];
    style: any;
    newGameCallback: () => void;
    exitGameCallback: () => void;
}
interface State {
    spectatingGameId: string;
    helped: boolean;
}

let helpedThisSession = false; // Store across games so the user only has to dismiss the help once

export class MessagesPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            spectatingGameId: null,
            helped: helpedThisSession,
        };
    }

    render() {
        const world = this.props.world;

        let rows = new Array<JSX.Element>();
        let actionRow: JSX.Element = this.renderHelp("help");
        const now = new Date().getTime();
        this.props.items.forEach(item => {
            if (now >= item.expiryTime) {
                return;
            }

            const row = this.renderNotification(item.key, item.notification);
            if (!row) {
                return;
            }

            if (item.notification.type === "win") {
                actionRow = row;
            } else {
                rows.push(row);
            }
        });

        if (!actionRow && world.ui.myGameId !== this.state.spectatingGameId && world.ui.myHeroId && !world.objects.has(world.ui.myHeroId)) {
            actionRow = this.renderDead("dead", world.ui.myGameId);
        }

        if (actionRow) {
            rows.push(actionRow);
        }

        return <div id="messages-panel" style={this.props.style}>{rows}</div>;
    }

    private renderNotification(key: string, notification: w.Notification) {
        switch (notification.type) {
            case "disconnected": return this.renderDisconnectedNotification(key, notification);
            case "replayNotFound": return this.renderReplayNotFoundNotification(key, notification);
            case "new": return this.renderNewGameNotification(key, notification);
            case "closing": return this.renderClosingNotification(key, notification);
            case "join": return this.renderJoinNotification(key, notification);
            case "leave": return this.renderLeaveNotification(key, notification);
            case "kill": return this.renderKillNotification(key, notification);
            case "win": return this.renderWinNotification(key, notification);
            default: return null; // Ignore this notification
        }
    }

    private renderDisconnectedNotification(key: string, notification: w.DisconnectedNotification) {
        return <div key={key} className="row error">Disconnected from server. Exit the game and try again.</div>
    }

    private renderReplayNotFoundNotification(key: string, notification: w.ReplayNotFoundNotification) {
        return <div key={key} className="row error">Replay not found.</div>
    }

    private renderNewGameNotification(key: string, notification: w.NewGameNotification) {
        return <div key={key} className="row">
            <div>{notification.room && <span className="private-room">In this private room: </span>}{notification.numPlayers} {notification.numPlayers === 1 ? "player" : "players"} online in {notification.numGames} {notification.numGames === 1 ? "game" : "games"}</div>
        </div>
    }

    private renderHelp(key: string) {
        const world = this.props.world;
        if (!world.ui.myHeroId) {
            return null; // Observer doesn't need instructions
        }

        if (!this.state.helped && this.props.isNewPlayer) {
            const closeLink =
                <div className="action-row">
                    <span className="btn" onClick={(e) => this.onCloseHelpClicked(e)}>OK</span>
                </div>;

            const help =
                isMobile
                ? (
                    <div className="help-box">
                        <div className="help-title">How to play:</div>
                        <div className="help-row"><span className="icon-container"><i className="fas fa-crosshairs" /></span> Move/aim by dragging</div>
                        <div className="help-row"><span className="icon-container"><i className="far fa-circle" /></span> Cast spells with button wheel</div>
                        {closeLink}
                    </div>
                )
                : (
                    <div className="help-box">
                        <div className="help-title">How to play:</div>
                        <div className="help-row"><span className="icon-container"><i className="fa fa-mouse-pointer" /></span> Move/aim with mouse</div>
                        <div className="help-row"><span className="icon-container"><i className="fa fa-keyboard" /></span> Cast spells with the keyboard</div>
                        {closeLink}
                    </div>
                );
            return help;
        } else {
            return null;
        }
    }

    private onCloseHelpClicked(e: React.MouseEvent) {
        helpedThisSession = true;
        this.setState({ helped: true });
    }

    private renderClosingNotification(key: string, notification: w.CloseGameNotification) {
        if (notification.ticksUntilClose <= 0) {
            return <div key={key} className="row game-started">Game started</div>
        } else {
            return null;
        }
    }

    private renderJoinNotification(key: string, notification: w.JoinNotification) {
        return <div key={key} className="row">{this.renderPlayer(notification.player)} joined</div>
    }

    private renderLeaveNotification(key: string, notification: w.LeaveNotification) {
        return <div key={key} className="row">{this.renderPlayer(notification.player)} left</div>
    }

    private renderKillNotification(key: string, notification: w.KillNotification) {
        if (!notification.killed) {
            return null;
        }

        if (notification.killer) {
            return <div key={key} className="row">
                {notification.killer && <span key="killer">{this.renderPlayer(notification.killer)} killed </span>}
                {notification.killed && <span key="killed">{this.renderPlayer(notification.killed)} </span>}
                {notification.assist && <span key="assist">assist {this.renderPlayer(notification.assist)} </span>}
            </div>
        } else {
            return <div key={key} className="row">{this.renderPlayer(notification.killed)} died</div>
        }
    }

    private renderWinNotification(key: string, notification: w.WinNotification) {
        const observing = !this.props.world.ui.myHeroId;
        return <div key={key} className="winner">
            <div className="winner-row">{this.renderPlayer(notification.winner)} is the winner!</div>
            <div className="award-row">Most damage: {this.renderPlayer(notification.mostDamage)} ({notification.mostDamageAmount.toFixed(0)}%)</div>
            <div className="award-row">Most kills: {this.renderPlayer(notification.mostKills)} ({notification.mostKillsCount} kills)</div>
            <div className="action-row">
                {observing
                    ? <span className="btn new-game-btn" onClick={() => this.props.exitGameCallback()}>Exit Replay</span>
                    : <span className="btn new-game-btn" onClick={() => this.props.newGameCallback()}>Play Again</span>}
            </div>
        </div>;
    }
    
    private renderDead(key: string, spectatingGameId: string) {
        return <div key={key} className="winner">
            <div className="winner-row">You died.</div>
            <div className="action-row">
                <div style={{ marginBottom: 12 }}>
                    <b><a href="#" onClick={() => this.setState({ spectatingGameId })}>Continue Watching</a></b> or
                </div>
                <div className="btn new-game-btn" onClick={() => this.props.newGameCallback()}>Play Again</div>
            </div>
        </div>;
    }

    private renderPlayer(player: w.Player) {
        if (player) {
            let color = player.uiColor;
            if (player.heroId === this.props.world.ui.myHeroId) {
                color = HeroColors.MyHeroColor;
            }
            return <span className="player-name" style={{ color }}>{player.name}</span>;
        } else {
            return <span className="player-name" style={{ color: HeroColors.BotColor }}>{Matchmaking.BotName}<i className="fas fa-microchip bot" /></span>;
        }
    }
}