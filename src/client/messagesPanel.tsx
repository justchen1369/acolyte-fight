import * as _ from 'lodash';
import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import { ButtonBar, Hero, TicksPerSecond } from '../game/constants';

interface Props {
    world: w.World;
    items: s.NotificationItem[];
    style: any;
    newGameCallback: () => void;
    exitGameCallback: () => void;
}
interface State {
}

export class MessagesPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            now: new Date().getTime(),
        };
    }

    render() {
        let rows = new Array<JSX.Element>();
        let winRow = null;
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
                winRow = row;
            } else {
                rows.push(row);
            }
        });

        if (winRow) {
            rows.push(winRow);
        }

        return <div id="messages-panel" style={this.props.style}>{rows}</div>;
    }

    private renderNotification(key: string, notification: w.Notification) {
        switch (notification.type) {
            case "help": return this.renderHelpNotification(key, notification);
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

    private renderHelpNotification(key: string, notification: w.HelpNotification) {
        return <div key={key} className="row help-text">Use the mouse to move!</div>
    }

    private renderDisconnectedNotification(key: string, notification: w.DisconnectedNotification) {
        return <div key={key} className="row error">Disconnected from server. Refresh the page to reconnect.</div>
    }

    private renderReplayNotFoundNotification(key: string, notification: w.ReplayNotFoundNotification) {
        return <div key={key} className="row error">Replay not found.</div>
    }

    private renderNewGameNotification(key: string, notification: w.NewGameNotification) {
        return <div key={key} className="row info">
            {notification.room && <span className="private-room">In this private room: </span>}{notification.numPlayers} {notification.numPlayers === 1 ? "player" : "players"} online in {notification.numGames} {notification.numGames === 1 ? "game" : "games"}
        </div>
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
        return <div key={key} className="winner">
            <div className="winner-row">{this.renderPlayer(notification.winner)} is the winner!</div>
            <div className="award-row">Most damage: {this.renderPlayer(notification.mostDamage)} ({notification.mostDamageAmount.toFixed(0)}%)</div>
            <div className="award-row">Most kills: {this.renderPlayer(notification.mostKills)} ({notification.mostKillsCount} kills)</div>
            <div className="action-row">
                <span className="btn new-game-btn" onClick={() => this.props.newGameCallback()}>Play Again</span>
            </div>
        </div>;
    }

    private renderPlayer(player: w.Player) {
        let color = player.uiColor;
        if (player.heroId === this.props.world.ui.myHeroId) {
            color = Hero.MyHeroColor;
        }
        return <span className="player-name" style={{ color }}>{player.name}</span>;
    }
}