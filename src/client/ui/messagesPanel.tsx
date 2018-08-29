import * as _ from 'lodash';
import * as React from 'react';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as matches from '../core/matches';
import { HeroColors, Matchmaking } from '../../game/constants';
import { PlayButton } from './playButton';
import { isMobile } from '../core/userAgent';
import { PlayerName } from './playerNameComponent';

interface Props {
    party: s.PartyState;
    isNewPlayer: boolean;
    world: w.World;
    items: s.NotificationItem[];
    style: Object;
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
            case "bot": return this.renderBotNotification(key, notification);
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
        return <div key={key} className="row"><PlayerName player={notification.player} world={this.props.world} /> joined</div>
    }

    private renderBotNotification(key: string, notification: w.BotNotification) {
        return <div key={key} className="row"><PlayerName player={notification.player} world={this.props.world} /> joined</div>
    }

    private renderLeaveNotification(key: string, notification: w.LeaveNotification) {
        return <div key={key} className="row"><PlayerName player={notification.player} world={this.props.world} /> left</div>
    }

    private renderKillNotification(key: string, notification: w.KillNotification) {
        if (!notification.killed) {
            return null;
        }

        if (notification.killer) {
            return <div key={key} className="row">
                {notification.killer && <span key="killer"><PlayerName player={notification.killer} world={this.props.world} /> killed </span>}
                {notification.killed && <span key="killed"><PlayerName player={notification.killed} world={this.props.world} /> </span>}
                {notification.assist && <span key="assist">assist <PlayerName player={notification.assist} world={this.props.world} /> </span>}
            </div>
        } else {
            return <div key={key} className="row"><PlayerName player={notification.killed} world={this.props.world} /> died</div>
        }
    }

    private renderWinNotification(key: string, notification: w.WinNotification) {
        return <div key={key} className="winner">
            <div className="winner-row"><PlayerName player={notification.winner} world={this.props.world} /> is the winner!</div>
            <div className="award-row">Most damage: <PlayerName player={notification.mostDamage} world={this.props.world} /> ({notification.mostDamageAmount.toFixed(0)}%)</div>
            <div className="award-row">Most kills: <PlayerName player={notification.mostKills} world={this.props.world} /> ({notification.mostKillsCount} kills)</div>
            <div className="action-row">
                {this.renderWinAction()}
            </div>
        </div>;
    }

    private renderWinAction() {
        const observing = !this.props.world.ui.myHeroId;
        if (observing) {
            return <span className="btn new-game-btn" onClick={() => matches.leaveCurrentGame()}>Exit Replay</span>;
        } else {
            return <PlayButton
                label="Play Again"
                party={this.props.party}
            />;
        }
    }
    
    private renderDead(key: string, spectatingGameId: string) {
        return <div key={key} className="winner">
            <div className="winner-row">You died.</div>
            <div className="action-row">
                <div style={{ marginBottom: 12 }}>
                    <b><a href="#" onClick={() => this.setState({ spectatingGameId })}>Continue Watching</a></b> or
                </div>
                <div className="btn new-game-btn" onClick={() => matches.joinNewGame()}>Play Again</div>
            </div>
        </div>;
    }
}