import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as options from '../options';
import * as matches from '../core/matches';
import * as mathUtils from '../core/mathUtils';
import * as pages from '../core/pages';
import * as rankings from '../core/rankings';
import * as StoreProvider from '../storeProvider';
import { ButtonBar, Matchmaking, TicksPerSecond } from '../../game/constants';
import PlayButton from '../ui/playButton';
import TextMessageBox from './textMessageBox';
import { isMobile } from '../core/userAgent';
import PlayerName from './playerNameComponent';
import { worldInterruptible } from '../core/matches';

interface Props {
    userId: string;
    loggedIn: boolean;
    showingHelp: boolean;
    myGameId: string;
    myHeroId: string;
    isDead: boolean;
    isFinished: boolean;
    buttonBar: w.ButtonConfig;
    rebindings: KeyBindings;
    options: s.GameOptions;
    exitable: boolean;
    items: s.NotificationItem[];
}
interface State {
    spectatingGameId: string;
}

function stateToProps(state: s.State): Props {
    return {
        userId: state.userId,
        loggedIn: state.loggedIn,
        showingHelp: state.showingHelp,
        myGameId: state.world.ui.myGameId,
        myHeroId: state.world.ui.myHeroId,
        isDead: !state.world.objects.has(state.world.ui.myHeroId),
        isFinished: state.world.activePlayers.size === 0,
        buttonBar: state.world.ui.buttonBar,
        rebindings: state.rebindings,
        options: state.options,
        exitable: worldInterruptible(state.world),
        items: state.items,
    };
}

class MessagesPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            spectatingGameId: null,
        };
    }

    render() {
        // Offset the messages from the button bar
        let bottom = 0;
        let left: number = undefined;
        let right: number = undefined;
        const buttonBar = this.props.buttonBar;
        if (buttonBar) {
            if (buttonBar.view === "bar") {
                left = 0;
                bottom = ButtonBar.Size * buttonBar.scaleFactor + ButtonBar.Margin * 2;
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

        let actionRow: JSX.Element = this.renderHelp("help");
        if (this.props.myGameId !== this.state.spectatingGameId && this.props.myHeroId && this.props.isDead) {
            actionRow = this.renderDead("dead", this.props.myGameId);
            finished = true;
        } else if (this.props.isFinished) {
            actionRow = this.renderFinished("finished");
            finished = true;
        }

        let rows = new Array<JSX.Element>();
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
            if (!options.getProvider().noDiscordAd) {
                rows.push(<div key="advert-row" className="row advert-row">
                    <span className="label" style={{ marginRight: 5 }}>Like this game?</span>
                    <a href="https://discord.gg/sZvgpZk" target="_blank" title="Chat on Discord!"><span className="label">Join the community on Discord</span><i className="fab fa-discord" /></a>
                </div>);
            }
        }

        if (actionRow) {
            rows.push(actionRow);
        }

        return <div id="messages-panel" style={{ left, right, bottom }}>
            {rows}
            <TextMessageBox />
        </div>;
    }

    private renderNotification(key: string, notification: w.Notification) {
        switch (notification.type) {
            case "disconnected": return this.renderDisconnectedNotification(key, notification);
            case "text": return this.renderTextNotification(key, notification);
            case "new": return this.renderNewGameNotification(key, notification);
            case "closing": return this.renderClosingNotification(key, notification);
            case "join": return this.renderJoinNotification(key, notification);
            case "bot": return this.renderBotNotification(key, notification);
            case "leave": return this.renderLeaveNotification(key, notification);
            case "kill": return this.renderKillNotification(key, notification);
            case "win": return this.renderWinNotification(key, notification);
            case "ratingAdjustment": return this.renderRatingAdjustmentNotification(key, notification);
            default: return null; // Ignore this notification
        }
    }

    private renderDisconnectedNotification(key: string, notification: w.DisconnectedNotification) {
        return <div key={key} className="row error">Disconnected from server. Exit the game and try again.</div>
    }

    private renderNewGameNotification(key: string, notification: w.NewGameNotification) {
        if (notification.numPlayersPublic === null || notification.numPlayersPublic === undefined) {
            return null;
        }

        const a = options.getProvider();
        return <div key={key} className="row">
            <div>
                {notification.numPlayersInGameMode} {notification.numPlayersInGameMode === 1 ? "player" : "players"}
                {notification.isPrivate ? ` in this game mode (${notification.numPlayersPublic} in public games)` : " online"}
            </div>
            {this.props.exitable && !notification.isPrivate && notification.numPlayersPublic <= 1 && <div>You might find players on <a href="/regions" onClick={(ev) => this.onRegionsLinkClick(ev)}>other regions</a>.</div>}
            {this.props.exitable && !notification.isPrivate && notification.numPlayersPublic > 1 && <div>Would you like to <a href="/#watch" onClick={(ev) => this.onWatchLiveClick(ev)}>watch the other players</a>?</div>}
        </div>
    }

    private onRegionsLinkClick(ev: React.MouseEvent) {
        ev.preventDefault();
        matches.leaveCurrentGame(true);
        pages.changePage("regions");
    }

    private onWatchLiveClick(ev: React.MouseEvent) {
        ev.preventDefault();
        matches.watchLiveGame();
    }

    private renderHelp(key: string) {
        if (!this.props.myHeroId) {
            return null; // Observer doesn't need instructions
        }

        if (this.props.showingHelp) {
            const closeLink =
                <div className="action-row">
                    <span className="btn" onClick={(e) => this.onCloseHelpClicked(e)}>OK</span>
                </div>;

            if (isMobile) {
                const isSingleTapShoot = this.props.rebindings[w.SpecialKeys.SingleTap] === "q";
                const isDoubleTapDash = this.props.rebindings[w.SpecialKeys.DoubleTap] === "a";
                return <div key={key} className="help-box">
                    <div className="help-title">How to play:</div>
                    <div className="help-row"><span className="icon-container"><i className="fas fa-crosshairs" /></span> <b>Drag</b> to move/aim</div>
                    {isSingleTapShoot && <div className="help-row"><span className="icon-container"><i className="fas fa-hand-pointer" /></span> <b>Tap</b> to shoot</div>}
                    {isDoubleTapDash && <div className="help-row"><span className="icon-container"><i className="fas fa-forward" /></span> <b>Double-tap</b> to dash</div>}
                    {closeLink}
                </div>
            } else {
                const isLeftClickShoot = this.props.rebindings[w.SpecialKeys.LeftClick] === "q";
                const isRightClickDash = this.props.rebindings[w.SpecialKeys.RightClick] === "a";
                const showMouseHint = !(isLeftClickShoot || isRightClickDash);
                return <div key={key} className="help-box">
                    <div className="help-title">How to play:</div>
                    {showMouseHint && <div className="help-row"><span className="icon-container"><i className="fa fa-crosshairs" /></span> <b>Mouse</b> to move/aim</div>}
                    {isLeftClickShoot && <div className="help-row"><span className="icon-container"><i className="fa fa-mouse-pointer" /></span> <b>Left-click</b> to shoot</div>}
                    {isRightClickDash && <div className="help-row"><span className="icon-container"><i className="fa fa-forward" /></span> <b>Right-click</b> to dash</div>}
                    <div className="help-row"><span className="icon-container"><i className="fa fa-keyboard" /></span> <b>Keyboard</b> to cast spells</div>
                    {closeLink}
                </div>
            }
        } else {
            return null;
        }
    }

    private onCloseHelpClicked(e: React.MouseEvent) {
        StoreProvider.dispatch({ type: "updateShowingHelp", showingHelp: false });
    }

    private renderTextNotification(key: string, notification: w.TextNotification) {
        return <div key={key} className="row text-row"><PlayerName player={notification.player} />: <span className="text-message">{notification.text}</span></div>
    }

    private renderClosingNotification(key: string, notification: w.CloseGameNotification) {
        if (notification.ticksUntilClose <= 0) {
            if (notification.teamSizes) {
                const vString = notification.teamSizes.join('v');
                return <>
                    <div key={`${key}-splash`} className="splash-container">
                        <div className="splash">{vString}</div>
                    </div>
                    <div key={key} className="row game-started">Team game! Your allies are blue. Defeat your enemies together!</div>
                </>
            } else {
                return <div key={key} className="row game-started">Game started</div>
            }
        } else if (notification.ticksUntilClose <= Matchmaking.JoinPeriod) {
            return null;
        } else {
            return <div key={key} className="row game-started">Waiting {notification.ticksUntilClose / TicksPerSecond} seconds for more players to join...</div>
        }
    }

    private renderJoinNotification(key: string, notification: w.JoinNotification) {
        return <div key={key} className="row"><PlayerName player={notification.player} /> joined</div>
    }

    private renderBotNotification(key: string, notification: w.BotNotification) {
        return <div key={key} className="row"><PlayerName player={notification.player} /> joined</div>
    }

    private renderLeaveNotification(key: string, notification: w.LeaveNotification) {
        return <div key={key} className="row"><PlayerName player={notification.player} /> left</div>
    }

    private renderKillNotification(key: string, notification: w.KillNotification) {
        if (!notification.killed) {
            return null;
        }

        if (notification.killer) {
            return <div key={key} className="row">
                {notification.killer && <span key="killer"><PlayerName player={notification.killer} /> killed </span>}
                {notification.killed && <span key="killed"><PlayerName player={notification.killed} /> </span>}
                {notification.assist && <span key="assist">assist <PlayerName player={notification.assist} /> </span>}
            </div>
        } else {
            return <div key={key} className="row"><PlayerName player={notification.killed} /> died</div>
        }
    }

    private renderWinNotification(key: string, notification: w.WinNotification) {
        return <div key={key} className="winner">
            {this.renderWinnerRow(notification.winners)}
            <div className="award-row">Most damage: <PlayerName player={notification.mostDamage} /> ({notification.mostDamageAmount.toFixed(0)})</div>
            <div className="award-row">Most kills: <PlayerName player={notification.mostKills} /> ({notification.mostKillsCount} kills)</div>
            <div className="action-row">
                {this.renderAgainButton()}
            </div>
        </div>;
    }

    private renderWinnerRow(winners: w.Player[]) {
        if (!(winners && winners.length > 0)) {
            return null;
        } else if (winners.length === 1) {
            return <div className="winner-row"><PlayerName player={winners[0]} /> is the winner!</div>
        } else {
            const elems = new Array<React.ReactNode>();
            for (let i = 0; i < winners.length; ++i) {
                const winner = winners[i];
                const isFirst = i === 0;
                const isLast = i === winners.length - 1;
                if (!isFirst) {
                    if (isLast) {
                        elems.push(" & ");
                    } else {
                        elems.push(", ");
                    }
                }
                elems.push(<PlayerName key={winner.heroId} player={winner} />);
            }
            return <div className="winner-row"> {elems} win!</div>
        }
    }

    private renderRatingAdjustmentNotification(key: string, notification: w.RatingAdjustmentNotification) {
        if (notification.gameId === this.props.myGameId) {
            const delta = notification.acoDelta;
            return <div key={key} className="row rating-notification">
                <span>Your rating has changed: {this.renderRatingAdjustment(delta)}. </span>
                <span><a href="profile" onClick={(ev) => this.onProfileClicked(ev)}>Go to your profile</a> to see more.</span>
            </div>
        } else {
            return null;
        }
    }

    private onProfileClicked(ev: React.MouseEvent) {
        ev.preventDefault();
        matches.leaveCurrentGame();
        pages.changePage("profile", this.props.userId);
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
        return <div key={key} className="winner">
            <div className="winner-row">You died.</div>
            <div className="action-row">
                <div style={{ marginBottom: 12 }}>
                    <b><a href="#" onClick={() => this.setState({ spectatingGameId })}>Continue Watching</a></b> or
                </div>
                <div>
                    {this.renderAgainButton()}
                </div>
            </div>
        </div>;
    }

    private renderFinished(key: string) {
        return <div key={key} className="winner">
            <div className="winner-row">Game finished.</div>
            <div className="action-row">
                {this.renderAgainButton()}
            </div>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(MessagesPanel);