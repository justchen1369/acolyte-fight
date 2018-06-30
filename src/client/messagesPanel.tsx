import * as _ from 'lodash';
import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import { Hero, TicksPerSecond } from '../game/constants';

const FadeoutMilliseconds = 5000;

interface Props {
    store: s.Store;
    newGameCallback: () => void;
    rewatchGameCallback: () => void;
}
interface State {
    now: number;
}

export class MessagesPanel extends React.Component<Props, State> {
    private intervalHandle: NodeJS.Timer = null;
    
    constructor(props: Props) {
        super(props);
        this.state = {
            now: new Date().getTime(),
        };
    }

    componentDidMount() {
        this.intervalHandle = setInterval(() => this.onInterval(), 100);
    }

    componentWillUnmount() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
        }
    }

    private onInterval() {
        const now = new Date().getTime();
        this.setState({ now });
    }

    render() {
        let rows = new Array<JSX.Element>();
        let winRow = null;
        const now = new Date().getTime();
        this.props.store.items.forEach(item => {
            if (now >= item.expiryTime) {
                return;
            }

            const rendered = this.renderNotification(item.notification);
            if (!rendered) {
                return;
            }

            const row = <div key={item.key} style={{ opacity: this.calculateOpacity(item) }}>{rendered}</div>;
            if (item.notification.type === "win") {
                winRow = row;
            } else {
                rows.push(row);
            }
        });

        if (winRow) {
            rows.push(winRow);
        }

        return <div>{rows}</div>;
    }

    private renderNotification(notification: w.Notification) {
        switch (notification.type) {
            case "help": return this.renderHelpNotification(notification);
            case "disconnected": return this.renderDisconnectedNotification(notification);
            case "replayNotFound": return this.renderReplayNotFoundNotification(notification);
            case "serverStats": return this.renderServerStatsNotification(notification);
            case "closing": return this.renderClosingNotification(notification);
            case "join": return this.renderJoinNotification(notification);
            case "leave": return this.renderLeaveNotification(notification);
            case "kill": return this.renderKillNotification(notification);
            case "win": return this.renderWinNotification(notification);
            default: return null; // Ignore this notification
        }
    }

    private renderHelpNotification(notification: w.HelpNotification) {
        return <div className="help-text">Use the mouse to move!</div>
    }

    private renderDisconnectedNotification(notification: w.DisconnectedNotification) {
        return <div className="disconnected-notification">Disconnected from server. Refresh the page to reconnect.</div>
    }

    private renderReplayNotFoundNotification(notification: w.ReplayNotFoundNotification) {
        return <div className="replay-not-found-notification">Replay not found.</div>
    }

    private renderServerStatsNotification(notification: w.ServerStatsNotification) {
        return <div className="server-stats-notification">
            {notification.numPlayers} {notification.numPlayers === 1 ? "player" : "players"} online in {notification.numGames} {notification.numGames === 1 ? "game" : "games"}
        </div>
    }

    private renderClosingNotification(notification: w.CloseGameNotification) {
        if (notification.ticksUntilClose <= 0) {
            return <div className="game-started">Game started</div>
        } else {
            return null;
        }
    }

    private renderJoinNotification(notification: w.JoinNotification) {
        return <div>
            {this.renderPlayer(notification.player)} joined
        </div>
    }

    private renderLeaveNotification(notification: w.LeaveNotification) {
        return <div>
            {this.renderPlayer(notification.player)} left
        </div>
    }

    private renderKillNotification(notification: w.KillNotification) {
        if (!notification.killed) {
            return null;
        }

        if (notification.killer) {
            return <div>
                {notification.killer && <span key="killer">{this.renderPlayer(notification.killer)} killed </span>}
                {notification.killed && <span key="killed">{this.renderPlayer(notification.killed)} </span>}
                {notification.assist && <span key="assist">assist {this.renderPlayer(notification.assist)} </span>}
            </div>
        } else {
            return <div key="killed">{this.renderPlayer(notification.killed)} died</div>
        }
    }

    private renderWinNotification(notification: w.WinNotification) {
        return <div className="winner">
            <div className="winner-row">{this.renderPlayer(notification.winner)} is the winner!</div>
            <div className="award-row">Most damage: {this.renderPlayer(notification.mostDamage)} ({notification.mostDamageAmount.toFixed(0)}%)</div>
            <div className="award-row">Most kills: {this.renderPlayer(notification.mostKills)} ({notification.mostKillsCount} kills)</div>
            <div className="action-row">
                <span className="new-game-btn" onClick={() => this.props.newGameCallback()}>Play Again</span>
                <a className="watch-replay-link" href={"?g=" + this.props.store.world.ui.myGameId} title="Watch replay of this game" onClick={this.props.rewatchGameCallback}>
                    <i className="fa fa-tv" />
                </a>
            </div>
        </div>;
    }

    private renderPlayer(player: w.Player) {
        let color = player.uiColor;
        if (player.heroId === this.props.store.world.ui.myHeroId) {
            color = Hero.MyHeroColor;
        }
        return <span className="player-name" style={{ color }}>{player.name}</span>;
    }

    private calculateOpacity(item: s.NotificationItem): number {
        const millisecondsToExpiry = item.expiryTime - this.state.now;
        if (millisecondsToExpiry <= 0) {
            return 0;
        } else if (millisecondsToExpiry < FadeoutMilliseconds) {
            const proportion = 1.0 * millisecondsToExpiry / FadeoutMilliseconds;
            return proportion;
        } else {
            return 1;
        }
    }
}