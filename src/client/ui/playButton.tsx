import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as activated from '../core/activated';
import * as options from '../options';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as screenLifecycle from './screenLifecycle';
import * as StoreProvider from '../storeProvider';
import * as tutor from '../core/tutor';
import * as w from '../../game/world.model';
import * as watcher from '../core/watcher';
import { loaded } from '../core/loader';
import Button from '../controls/button';
import './playButton.scss';

const AutoJoinSeconds = 3;

interface OwnProps {
    again?: boolean;
}
interface Props extends OwnProps {
    gameId: string;
    selfId: string;
    party: s.PartyState;
    isModded: boolean;
    maxPlayers: number;
}
interface State {
    joining: boolean;
    autoJoin: AutoJoinState;
}

interface AutoJoinState {
    gameId: string;
    secondsUntilAutoJoin: number;
    completed?: boolean;
    cancelled?: boolean;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        party: state.party,
        selfId: state.socketId,
        isModded: rooms.isModded(state.room),
        maxPlayers: state.room.settings.Matchmaking.MaxPlayers,
        gameId: state.world.ui.myGameId,
    };
}

class PlayButton extends React.PureComponent<Props, State> {
    private recheckInterval: NodeJS.Timeout = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            joining: false,
            autoJoin: null,
        };
    }

    componentDidMount() {
        this.recheckInterval = setInterval(() => this.recheckAutoJoin(), 1000);
        this.recheckAutoJoin();
    }

    componentWillUnmount() {
        if (this.recheckInterval !== null) {
            clearInterval(this.recheckInterval);
            this.recheckInterval = null;
        }
    }

    render() {
        const party = this.props.party;
        const self = party && party.members.find(m => m.socketId === this.props.selfId);

        let label: React.ReactNode;
        if (party && self && self.isObserver) {
            label = this.props.again ? "Continue" : "Watch";
        } else {
            if (this.props.again) {
                label = "Play Again";
            } else if (this.props.isModded) {
                label = <>Play <i className="fas fa-wrench" title="Mod active - game rules have been modified" /></>;
            } else {
                label = "Play";
            }
        }

        if (party) {
            if (party && self && self.ready) {
                const relevant = party.members.filter(m => m.isLeader || !m.isObserver);
                const readyCount = relevant.filter(m => m.ready).length;
                const partySize = Math.max(1, relevant.length);
                const waitingFor = Math.min(this.props.maxPlayers, partySize);
                return <Button className="btn waiting-for-party" onClick={(ev) => this.onPartyReadyClicked(false)} title="Click to cancel">
                    <div className="waiting-for-party-progress" style={{ width: `${100 * Math.min(1, readyCount / waitingFor)}%` }}></div>
                    <div className="waiting-for-party-label">Waiting for Party...</div>
                </Button>
            } else {
                return <Button className={this.state.joining ? "btn btn-disabled" : "btn"} onClick={(ev) => this.onPartyReadyClicked(true)}>
                    {label}
                </Button>
            }
        } else {
            const autoJoin = this.state.autoJoin;
            if (autoJoin && autoJoin.gameId == this.props.gameId && !autoJoin.cancelled) {
                return <Button className="btn auto-join-btn" onClick={(ev) => this.onCancelAutoJoin()}>Next match in {this.state.autoJoin.secondsUntilAutoJoin}</Button>
            } else {
                return <Button className={this.state.joining ? "btn btn-disabled" : "btn"} onClick={(ev) => this.onPlayClicked()}>{label}</Button>
            }
        }
    }

    private recheckAutoJoin() {
        let autoJoin = this.state.autoJoin;
        if (autoJoin && autoJoin.gameId === this.props.gameId) {
            if (!autoJoin.cancelled) {
                autoJoin = { ...autoJoin };
                if (autoJoin.secondsUntilAutoJoin > 0) {
                    --autoJoin.secondsUntilAutoJoin;
                }

                if (autoJoin.secondsUntilAutoJoin === 0) {
                    autoJoin.completed = true;
                    this.onPlayClicked();
                }

                this.setState({ autoJoin });
            }
        } else {
            const state = StoreProvider.getState();
            const world = state.world;
            if (!this.state.joining && !!world.winner && activated.isActive()) {
                const join = !this.props.party && !state.options.noAutoJoin && this.shouldAutoJoin(world);
                this.setState({
                    autoJoin: {
                        gameId: this.props.gameId,
                        secondsUntilAutoJoin: AutoJoinSeconds,
                        cancelled: !join,
                    },
                });
            }
        }
    }

    private shouldAutoJoin(world: w.World) {
        if (world.ui.autoJoin !== undefined) {
            return world.ui.autoJoin;
        }

        if (!world.ui.myHeroId) {
            // Observer
            return false;
        }

        const player = world.players.get(world.ui.myHeroId);
        if (!(player && player.nonIdle)) {
            // Idle
            return false;
        }

        return true;
    }

    private onCancelAutoJoin() {
        if (!this.state.autoJoin) {
            return;
        }

        this.setState({
            autoJoin: {
                ...this.state.autoJoin,
                cancelled: true,
            }
        });
    }

    private async onPlayClicked() {
        if (this.state.joining) {
            return;
        }
        this.setState({ joining: true });
        screenLifecycle.enterGame();
        watcher.stopWatching();

        await options.getProvider().commercialBreak();

        await loaded();

        let joinParams: matches.JoinParams = {};

        const state = StoreProvider.getState();
        if (state.world.ui.locked === m.LockType.ModPreview) {
            // Try to re-preview same mod
            joinParams = {
                roomId: state.world.ui.myRoomId,
                locked: m.LockType.ModPreview,
            }
        } else if (tutor.needsTutorial(state)) {
            joinParams = tutor.tutorialSettings();
        }

        matches.joinNewGame(joinParams);
    }

    private onPartyReadyClicked(ready: boolean) {
        const party = this.props.party;
        if (party) {
            if (ready) {
                screenLifecycle.enterGame();
            }

            const self = party.members.find(m => m.socketId === this.props.selfId);
            if (self && self.isObserver && ready) {
                // Doesn't mean anything for an observer to be ready, they just watch
                pages.changePage("watch");
                matches.leaveCurrentGame(true);
            } else {
                parties.updateReadyStatusAsync(ready);
            }
        }
    }
}

export default ReactRedux.connect(stateToProps)(PlayButton);