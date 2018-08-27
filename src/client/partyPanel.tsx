import * as React from 'react';
import * as facade from './facade';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as url from './url';

interface Props {
    current: url.PathElements;
    party: s.PartyState;
    createPartyCallback: () => void;
    leavePartyCallback: (partyId: string) => void;
}
interface State {
    creating: boolean;
    error: string;
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
            <p>Play with friends by creating a party.</p>
            {this.props.party ? this.renderCurrentParty() : this.renderNoParty()}
        </div>
    }

    private renderNoParty() {
        return <div>
            <p><span className={this.state.creating ? "btn btn-disabled" : "btn"} onClick={() => this.onCreatePartyClick()}>Create Party</span></p>
        </div>
    }

    private renderCurrentParty() {
        const currentPartyPath = url.getPartyHomePath(this.props.current);
        return <div>
            <p><input className="share-url" type="text" value={window.location.origin + currentPartyPath} readOnly onFocus={ev => ev.target.select()} /></p>
            <p><span className="btn" onClick={() => this.onLeavePartyClick()}>Leave Party</span></p>
            <h2>Party Members</h2>
            <p>
                <div className="party-list">
                    {this.props.party.members.map(member => this.renderMember(member))}
                </div>
            </p>
        </div>
    }

    private renderMember(member: w.PartyMemberState) {
        return <div className="party-member">
            {member.ready && <i className="fas fa-check-square party-member-ready" title="Ready" />} 
            <span className="party-member-name">{member.name}</span>
            <span className="party-member-details"> - {member.ready ? "ready" : "not ready"}</span>
        </div>
    }

    private onCreatePartyClick() {
        const party = this.props.party;
        if (!party) {
            this.props.createPartyCallback();
        }
    }

    private onLeavePartyClick() {
        const party = this.props.party;
        if (party) {
            this.props.leavePartyCallback(party.id);
        }
    }
}