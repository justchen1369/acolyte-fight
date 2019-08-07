import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as matches from '../core/matches';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as screenLifecycle from './screenLifecycle';
import * as watcher from '../core/watcher';
import { loaded } from '../core/loader';
import Button from '../controls/button';

interface OwnProps {
    again?: boolean;
}
interface Props {
    again: boolean;
    isNewPlayer: boolean;
    selfId: string;
    party: s.PartyState;
    isModded: boolean;
    maxPlayers: number;
}
interface State {
    joining: boolean;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        again: ownProps.again || false,
        isNewPlayer: state.isNewPlayer,
        party: state.party,
        selfId: state.socketId,
        isModded: rooms.isModded(state.room),
        maxPlayers: state.room.settings.Matchmaking.MaxPlayers,
    };
}

class PlayButton extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            joining: false,
        };
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
            return <Button className={this.state.joining ? "btn btn-disabled" : "btn"} onClick={(ev) => this.onPlayClicked(ev)}>{label}</Button>
        }
    }

    private async onPlayClicked(ev: React.MouseEvent) {
        if (this.state.joining) {
            return;
        }
        this.setState({ joining: true });
        screenLifecycle.enterGame();
        watcher.stopWatching();

        await options.getProvider().commercialBreak();

        await loaded();

        const joinParams: matches.JoinParams = {};
        if (this.props.isNewPlayer) {
            joinParams.locked = m.LockType.Tutorial;
            joinParams.numBots = 1;
        }
        matches.joinNewGame(joinParams);
    }

    private onPartyReadyClicked(ready: boolean) {
        const party = this.props.party;
        if (party) {
            if (ready) {
                screenLifecycle.enterGame();
            }
            parties.updateReadyStatusAsync(ready);
        }
    }
}

export default ReactRedux.connect(stateToProps)(PlayButton);