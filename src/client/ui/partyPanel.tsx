import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as url from '../url';

interface Props {
    current: s.PathElements;
    party: s.PartyState;
}
interface State {
    creating: boolean;
    error: string;
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        party: state.party,
    };
}

export class PartyPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            creating: false,
            error: null,
        };
    }

    render() {
        return <div>
            <h1>Party</h1>
            {this.props.party ? this.renderCurrentParty() : this.renderNoParty()}
        </div>
    }

    private renderNoParty() {
        return <div>
            <p>Play together with friends as a party. Forming a party ensures that you and your friends are matched to the same game.</p>
            <p><span className={this.state.creating ? "btn btn-disabled" : "btn"} onClick={() => this.onCreatePartyClick()}>Create Party</span></p>
        </div>
    }

    private renderCurrentParty() {
        const currentPartyPath = parties.getPartyHomePath(this.props.current);
        return <div>
            <p><b>Currently in party:</b> <span>{this.props.party.members.map(m => m.name).join(", ")}</span></p>
            <p>Invite friends to join your party by sending them this link:</p>
            <p><input className="share-url" type="text" value={window.location.origin + currentPartyPath} readOnly onFocus={ev => ev.target.select()} /></p>
            <p><span className="btn" onClick={() => this.onLeavePartyClick()}>Leave Party</span></p>
        </div>
    }

    private onCreatePartyClick() {
        const party = this.props.party;
        if (!party) {
            parties.createPartyAsync();
        }
    }

    private onLeavePartyClick() {
        const party = this.props.party;
        if (party) {
            parties.leavePartyAsync();
        }
    }
}

export default ReactRedux.connect(stateToProps)(PartyPanel);