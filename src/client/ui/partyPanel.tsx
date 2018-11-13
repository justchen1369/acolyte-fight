import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as screenLifecycle from './screenLifecycle';
import * as url from '../url';
import PartyGameList from './partyGameList';
import PartyMemberControl from './partyMemberControl';

interface Props {
    selfId: string
    current: s.PathElements;
    party: s.PartyState;
}
interface State {
    loading: boolean;
    error: string;
}

function stateToProps(state: s.State): Props {
    return {
        selfId: state.socketId,
        current: state.current,
        party: state.party,
    };
}

function PartyMode(props: { selected: boolean, onClick: () => void, children?: JSX.Element }) {
    const className = classNames({
        'party-mode-row': true,
        'party-mode-selected': props.selected,
    });
    return <div className={className} onClick={props.onClick}>
        {props.selected && <i className="check-icon fas fa-check-square" />} 
        {!props.selected && <i className="check-icon fas fa-square" />}
        {props.children}
    </div>
}

export class PartyPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
        };
    }

    render() {
        return <div className="party-panel">
            <h1>Party</h1>
            {this.props.party ? this.renderCurrentParty() : this.renderNoParty()}
        </div>
    }

    private renderNoParty() {
        return <div>
            <p>Play together with friends as a party. Forming a party ensures that you and your friends are matched to the same game.</p>
            <p><span className={this.state.loading ? "btn btn-disabled" : "btn"} onClick={() => parties.createPartyAsync()}>Create Party</span></p>
        </div>
    }

    private renderCurrentParty() {
        const party = this.props.party;
        const currentPartyPath = url.getPath({ ...this.props.current, page: null, party: party.id, server: party.server });
        const self = party.members.find(m => m.socketId === this.props.selfId);
        if (!self) {
            return this.renderNoParty();
        }

        const origin = url.getOrigin(party.region);
        return <div>
            <p>Forming a party ensures that you and your friends are matched to the same game. Invite friends to join your party by sending them this link:</p>
            <p><input className="share-url" type="text" value={origin + currentPartyPath} readOnly onFocus={ev => ev.target.select()} /></p>
            <p><span className="btn" onClick={() => this.onLeaveParty()}>Leave Party</span></p>
            {this.renderPartyMode(self.isLeader)}
            <h1>Players</h1>
            <div className="party-list">
                {party.members.map(m => <PartyMemberControl
                    member={m}
                    editable={self.isLeader || (!party.isLocked && m.socketId === self.socketId)}
                    isSelf={m.socketId === self.socketId}
                    showAll={true}
                />)}
            </div>
            <h1>Games</h1>
            <PartyGameList partyId={party.id} />
        </div>
    }

    private renderPartyMode(editable: boolean) {
        const party = this.props.party;
        return <div>
            <h2>Party mode</h2>
            <PartyMode selected={!party.isPrivate} onClick={() => editable && parties.publicPartyAsync()} >
                <span className="party-mode-label"><b>Public</b>: your party will be matched with other players on the public server.</span>
            </PartyMode>
            <PartyMode selected={party.isPrivate && !party.isLocked} onClick={() => editable && parties.privatePartyAsync()} >
                <span className="party-mode-label"><b>Private</b>: your games will only contain the players in your party.</span>
            </PartyMode>
            <PartyMode selected={party.isPrivate && party.isLocked} onClick={() => editable && parties.tournamentPartyAsync()} >
                <span className="party-mode-label"><b>Tournament</b>: private party where only the party leader controls all the settings and decides who is allowed to play. Useful for running tournaments.</span>
            </PartyMode>
        </div>
    }

    private async onLeaveParty() {
        await parties.leavePartyAsync();
        pages.changePage("");
    }
}

export default ReactRedux.connect(stateToProps)(PartyPanel);