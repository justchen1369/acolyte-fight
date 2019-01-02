import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as options from '../options';
import * as ai from '../core/ai';
import * as matches from '../core/matches';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as screenLifecycle from './screenLifecycle';
import * as url from '../url';

interface OwnProps {
    again?: boolean;
}
interface Props {
    again: boolean;
    selfId: string;
    party: s.PartyState;
    isModded: boolean;
    playingAsAI: boolean;
}
interface State {
    joining: boolean;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        again: ownProps.again || false,
        party: state.party,
        selfId: state.socketId,
        isModded: rooms.isModded(state.room),
        playingAsAI: ai.playingAsAI(state),
    };
}

class PlayButton extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            joining: false,
        };
    }

    render() {
        const party = this.props.party;
        const self = party && party.members.find(m => m.socketId === this.props.selfId);

        let label: React.ReactFragment;
        if (party && self && self.isObserver) {
            label = this.props.again ? "Continue" : "Watch";
        } else {
            if (this.props.again) {
                label = "Play Again";
            } else if (this.props.playingAsAI) {
                label = <>Play <i className="fas fa-microchip" title="You are playing as an AI" /></>;
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
                return <span className="btn waiting-for-party" onClick={(ev) => this.onPartyReadyClicked(false)} title="Click to cancel">
                    <div className="waiting-for-party-progress" style={{ width: `${100 * readyCount / partySize}%` }}></div>
                    <div className="waiting-for-party-label">Waiting for Party...</div>
                </span>
            } else {
                return <span className={this.state.joining ? "btn btn-disabled" : "btn"} onClick={(ev) => this.onPartyReadyClicked(true)}>
                    {label}
                </span>
            }
        } else {
            return <span className={this.state.joining ? "btn btn-disabled" : "btn"} onClick={(ev) => this.onPlayClicked(ev)}>{label}</span>
        }
    }

    private async onPlayClicked(ev: React.MouseEvent) {
        if (this.state.joining) {
            return;
        }
        this.setState({ joining: true });
        screenLifecycle.enterGame();

        const attachEndorseTracker = (window as any).attachEndorseTracker;
        if (!options.getProvider().noExternalLinks && attachEndorseTracker) {
            attachEndorseTracker();
        }

        await options.getProvider().commercialBreak();

        matches.joinNewGame({});
    }

    private onPartyReadyClicked(ready: boolean) {
        const party = this.props.party;
        if (party) {
            if (ready) {
                screenLifecycle.enterGame();
            }
            matches.leaveCurrentGame();
            parties.updateReadyStatusAsync(ready);
        }
    }
}

export default ReactRedux.connect(stateToProps)(PlayButton);