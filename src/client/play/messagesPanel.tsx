import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as constants from '../../game/constants';
import * as options from '../options';
import * as matches from '../core/matches';
import * as mathUtils from '../core/mathUtils';
import * as StoreProvider from '../storeProvider';
import { Matchmaking, TicksPerSecond } from '../../game/constants';
import Link from '../controls/link';
import DeadMessage from './messages/deadMessage';
import LeftMessage from './messages/leftMessage';
import HelpMessage from './messages/helpMessage';
import PlayButton from '../ui/playButton';
import TextMessage from './messages/textMessage';
import TextMessageBox from './textMessageBox';
import { isMobile } from '../core/userAgent';
import PlayerName from './playerNameComponent';
import WaitingMessage from './messages/waitingMessage';
import WinMessage from './messages/winMessage';
import { worldInterruptible } from '../core/matches';

interface Props {
    userId: string;
    loggedIn: boolean;
    myGameId: string;
    myHeroId: string;
    isDead: boolean;
    isFinished: boolean;
    isWaiting: boolean;
    numOnline: number;
    buttonBar: w.ButtonConfig;
    settings: AcolyteFightSettings;
    options: m.GameOptions;
    exitable: boolean;
    items: s.NotificationItem[];
}
interface State {
    spectatingGameId: string;
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    const player = world.players.get(world.ui.myHeroId);
    return {
        userId: state.userId,
        loggedIn: state.loggedIn,
        myGameId: world.ui.myGameId,
        myHeroId: world.ui.myHeroId,
        isDead: player && player.dead,
        isFinished: !!world.winner || world.finished,
        isWaiting: world.tick < state.world.startTick,
        numOnline: state.online.size,
        buttonBar: world.ui.buttonBar,
        settings: world.settings,
        options: state.options,
        exitable: worldInterruptible(world),
        items: state.items,
    };
}

class MessagesPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            spectatingGameId: null,
        };
    }

    render() {
        // Offset the messages from the button bar
        const Visuals = this.props.settings.Visuals;

        let bottom = 0;
        let left: number = undefined;
        let right: number = undefined;
        const buttonBar = this.props.buttonBar;
        if (buttonBar) {
            if (buttonBar.view === "bar") {
                left = 0;
                bottom = Visuals.ButtonBarSize * buttonBar.scaleFactor + Visuals.ButtonBarMargin * 2;
            } else if (buttonBar.view === "wheel") {
                if (this.props.options.wheelOnRight) {
                    // Wheel is right-aligned, put messages to the left
                    left = 0;
                } else {
                    // Wheel is left-aligned, put messages to the right
                    right = 0;
                }
            }
        }

        let finished = false;

        let actionRow: React.ReactNode = <HelpMessage key="help" />;
        if (this.props.myGameId !== this.state.spectatingGameId && this.props.myHeroId && this.props.isDead) {
            actionRow = this.renderDead("dead", this.props.myGameId);
            finished = true;
        } else if (this.props.isFinished) {
            actionRow = this.renderFinished("finished");
            finished = true;
        }

        let rows = new Array<React.ReactNode>();
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
                finished = true;
            } else {
                rows.push(row);
            }
        });

        if (finished) {
            if (!options.getProvider().noDiscordAd && !isMobile) { // Don't show on mobile because it's easy to misclick
                rows.push(<div key="advert-row" className="row advert-row">
                    <span className="label" style={{ marginRight: 5 }}>Like this game?</span>
                    <a href="https://discord.gg/sZvgpZk" target="_blank" title="Chat on Discord!"><span className="label">Join the community on Discord</span><i className="fab fa-discord" /></a>
                </div>);
            }
        }

        return <div id="messages-panel" style={{ left, right, bottom }}>
            <div className="messages-panel-rows">
                {rows}
            </div>
            {actionRow}
            {this.props.myHeroId && this.props.isWaiting && <WaitingMessage key="waiting" />}
            {!isMobile && <TextMessageBox />}
        </div>;
    }

    private renderNotification(key: string, notification: w.Notification): React.ReactNode {
        switch (notification.type) {
            case "disconnected": return this.renderDisconnectedNotification(key, notification);
            case "text": return <TextMessage key={key} notification={notification} />
            case "new": return this.renderNewGameNotification(key, notification);
            case "teams": return this.renderTeamsNotification(key, notification);
            case "closing": return this.renderClosingNotification(key, notification);
            case "join": return this.renderJoinNotification(key, notification);
            case "bot": return this.renderBotNotification(key, notification);
            case "leave": return <LeftMessage key={key} notification={notification} />
            case "kill": return this.renderKillNotification(key, notification);
            case "win": return <WinMessage key={key} notification={notification} />
            case "ratingAdjustment": return this.renderRatingAdjustmentNotification(key, notification);
            default: return null; // Ignore this notification
        }
    }

    private renderDisconnectedNotification(key: string, notification: w.DisconnectedNotification) {
        return <div key={key} className="row error">Disconnected from server. Exit the game and try again.</div>
    }

    private renderNewGameNotification(key: string, notification: w.NewGameNotification): React.ReactNode {
        return null;
    }

    private renderTeamsNotification(key: string, notification: w.TeamsNotification) {
        if (notification.teamSizes) {
            const vString = notification.teamSizes.join('v');
            return <div key={key} className="splash-container">
                <div className="splash">{vString}</div>
            </div>
        } else {
            return null;
        }
    }

    private renderClosingNotification(key: string, notification: w.CloseGameNotification) {
        if (notification.ticksUntilClose <= 0) {
            if (notification.teamSizes) {
                return <div key={key} className="row game-started">Team game! Your allies are blue. Defeat your enemies together!</div>
            } else {
                return <div key={key} className="row game-started">Game started. Defeat your enemies!</div>;
            }
        } else if (notification.ticksUntilClose <= Matchmaking.JoinPeriod) {
            return null;
        } else {
            return <div key={key} className="row game-started">Waiting {notification.ticksUntilClose / TicksPerSecond} seconds for more players to join...</div>
        }
    }

    private renderJoinNotification(key: string, notification: w.JoinNotification): React.ReactNode {
        return <div key={key} className="row"><PlayerName player={notification.player} /> joined</div>;
    }

    private renderBotNotification(key: string, notification: w.BotNotification): React.ReactNode {
        return <div key={key} className="row"><PlayerName player={notification.player} /> joined</div>;
    }

    private renderKillNotification(key: string, notification: w.KillNotification) {
        if (!notification.killed) {
            return null;
        }

        if (notification.killer) {
            return <div key={key} className="row">
                {notification.killer && <span key="killer"><PlayerName player={notification.killer} /> killed </span>}
                {notification.killed && <span key="killed"><PlayerName player={notification.killed} /> </span>}
            </div>
        } else {
            return <div key={key} className="row"><PlayerName player={notification.killed} /> died</div>
        }
    }

    private renderRatingAdjustmentNotification(key: string, notification: w.RatingAdjustmentNotification) {
        if (!this.props.options.unranked && notification.gameId === this.props.myGameId) {
            const delta = notification.acoDelta;
            return <div key={key} className="row rating-notification">
                <div>Your rating has changed: {this.renderRatingAdjustment(delta)}.</div>
                <div className="unranked-hint"><Link page="profile" profileId={this.props.userId} onClick={() => matches.leaveCurrentGame()}>Go to your profile</Link> to changed to unranked mode.</div>
            </div>
        } else {
            return null;
        }
    }


    private renderRatingAdjustment(ratingDelta: number) {
        if (ratingDelta >= 0) {
            return <span className="rating rating-increase">{mathUtils.deltaPrecision(ratingDelta)}</span>
        } else {
            return <span className="rating rating-decrease">{mathUtils.deltaPrecision(ratingDelta)}</span>
        }
    }

    private renderAgainButton() {
        return <PlayButton again={!!this.props.myHeroId} />;
    }
    
    private renderDead(key: string, spectatingGameId: string) {
        return <DeadMessage key={key} onSpectateClick={() => this.setState({ spectatingGameId })} />
    }

    private renderFinished(key: string) {
        return <div key={key} className="winner dialog-panel">
            <div className="winner-row">Game finished.</div>
            <div className="action-row">
                {this.renderAgainButton()}
            </div>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(MessagesPanel);