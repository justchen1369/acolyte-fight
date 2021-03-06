import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as url from '../url';
import PartyMemberControl from './partyMemberControl';
import './partyList.scss';

interface Props {
    current: s.PathElements;
    selfId: string;
    isModded: boolean;
    party: s.PartyState;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        selfId: state.socketId,
        isModded: Object.keys(state.room.mod).length > 0,
        party: state.party,
    };
}

class HomePanel extends React.PureComponent<Props, State> {
    render() {
        return this.props.party ? this.renderParty() : this.renderNoParty();
    }

    private renderParty() {
        return <div className="party-list">
            <b>
                Current <a href={this.getPartyDetailsUrl()} onClick={(ev) => this.onPartyDetailsClick(ev)}>party</a>
                {this.props.isModded && <i className="settings-icon fas fa-wrench clickable" title="Settings modified for this party" onClick={() => pages.changePage("modding")} />}
                :
            </b>
            {" "}
            {this.props.party.members.map(member => this.renderMember(member))}
        </div>
    }

    private renderNoParty() {
        return <div className="party-invite">Invite friends to <b><a href={this.getPartyDetailsUrl()} onClick={ev => this.onPartyDetailsClick(ev)}>party</a>!</b></div>
    }

    private renderMember(member: s.PartyMemberState) {
        const isSelf = member.socketId == this.props.selfId;
        if (!member.isObserver || isSelf || member.isLeader) {
            // Don't render any observers, unless they are myself or a leader
            return <PartyMemberControl key={member.socketId} member={member} editable={isSelf} />
        } else {
            return null;
        }
    }

    private getPartyDetailsUrl() {
        return url.getPath(Object.assign({}, this.props.current, { page: "party" }));
    }

    private onPartyDetailsClick(ev: React.MouseEvent<HTMLAnchorElement>) {
        ev.preventDefault();
        pages.changePage("party");

        if (!this.props.party) {
            parties.createPartyAsync();
        }
    }
}

export default ReactRedux.connect(stateToProps)(HomePanel);