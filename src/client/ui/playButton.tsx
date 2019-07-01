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
import { loaded } from '../core/loader';
import Button from '../controls/button';

interface OwnProps {
    again?: boolean;
}
interface Props {
    again: boolean;
    selfId: string;
    party: s.PartyState;
    isModded: boolean;
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
                return <Button className="btn waiting-for-party" onClick={(ev) => this.onPartyReadyClicked(false)} title="Click to cancel">
                    <div className="waiting-for-party-progress" style={{ width: `${100 * readyCount / partySize}%` }}></div>
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

        await options.getProvider().commercialBreak();

        await loaded();

        matches.joinNewGame({});
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