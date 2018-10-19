import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as ai from '../core/ai';
import * as matches from '../core/matches';
import * as parties from '../core/parties';
import * as screenLifecycle from './screenLifecycle';
import * as url from '../url';

interface OwnProps {
    again?: boolean;
}
interface Props {
    again: boolean;
    party: s.PartyState;
    playingAsAI: boolean;
}
interface State {
    joining: boolean;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        again: ownProps.again || false,
        party: state.party,
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

        let label;
        if (party && party.observing) {
            label = this.props.again ? "Continue" : "Watch";
        } else {
            if (this.props.again) {
                label = "Play Again";
            } else {
                label = this.props.playingAsAI ? "Play as AI" : "Play";
            }
        }

        if (party) {
            if (party.ready) {
                const readyCount = party.members.filter(m => m.ready).length;
                const partySize = party.members.length;
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

    private onPlayClicked(ev: React.MouseEvent) {
        if (this.state.joining) {
            return;
        }
        this.setState({ joining: true });
        screenLifecycle.enterGame();
        matches.joinNewGame();

        const attachEndorseTracker = (window as any).attachEndorseTracker;
        if (attachEndorseTracker) {
            attachEndorseTracker();
        }
    }

    private onPartyReadyClicked(ready: boolean) {
        const party = this.props.party;
        if (party) {
            if (ready) {
                screenLifecycle.enterGame();
            }
            matches.leaveCurrentGame();
            parties.updatePartyAsync({ ready });
        }
    }

}

export default ReactRedux.connect(stateToProps)(PlayButton);