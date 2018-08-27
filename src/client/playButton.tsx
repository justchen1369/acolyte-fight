import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as screenLifecycle from './screenLifecycle';
import * as url from './url';

interface Props {
    party: s.PartyState;
    label: string;
    newGameCallback: () => void;
    partyReadyCallback: (partyId: string, ready: boolean) => void;
}
interface State {
    joining: boolean;
}

export class PlayButton extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            joining: false,
        };
    }

    render() {
        const party = this.props.party;
        if (party) {
            if (party.ready) {
                let readyCount = party.members.filter(m => m.ready).length;
                const partySize = party.members.length;
                return <span className="btn btn-disabled waiting-for-party">
                    <div className="waiting-for-party-progress" style={{ width: `${100 * readyCount / partySize}%` }}></div>
                    <div className="waiting-for-party-label">Waiting for Party...</div>
                </span>
            } else {
                return <span className={this.state.joining ? "btn btn-disabled" : "btn"} onClick={(ev) => this.onPartyReadyClicked(ev, !this.props.party.ready)}>
                    {this.props.label}
                </span>
            }
        } else {
            return <span className={this.state.joining ? "btn btn-disabled" : "btn"} onClick={(ev) => this.onPlayClicked(ev)}>{this.props.label}</span>
        }
    }

    private onPlayClicked(ev: React.MouseEvent) {
        if (this.state.joining) {
            return;
        }
        this.setState({ joining: true });
        screenLifecycle.enterGame();
        this.props.newGameCallback();
    }

    private onPartyReadyClicked(ev: React.MouseEvent, ready: boolean) {
        const party = this.props.party;
        if (party) {
            if (ready) {
                screenLifecycle.enterGame();
            } else {
                screenLifecycle.exitGame();
            }
            this.props.partyReadyCallback(party.id, ready);
        }
    }

}