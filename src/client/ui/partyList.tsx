import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as pages from '../core/pages';
import * as url from '../url';

interface Props {
    current: s.PathElements;
    isModded: boolean;
    party: s.PartyState;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        isModded: Object.keys(state.room.mod).length > 0,
        party: state.party,
    };
}

class HomePanel extends React.Component<Props, State> {
    render() {
        return this.props.party ? this.renderParty() : this.renderNoParty();
    }

    private renderParty() {
        return <div className="party-list">
            <b>
                Current <a href={this.getPartyDetailsUrl()} onClick={(ev) => this.onPartyDetailsClick(ev)}>party</a>
                {this.props.party.isPrivate && <i className="settings-icon fas fa-lock" title="This is a private party" onClick={() => pages.changePage("party")} />}
                {this.props.isModded && <i className="settings-icon fas fa-cog" title="Settings modified for this party" onClick={() => pages.changePage("modding")} />}
                :
            </b>
            {" "}
            {this.props.party.members.map(member => this.renderMember(member))}
        </div>
    }

    private renderNoParty() {
        return <div className="party-invite">Invite friends to <b><a href={this.getPartyDetailsUrl()} onClick={ev => this.onPartyDetailsClick(ev)}>party</a>!</b></div>
    }

    private renderMember(member: w.PartyMemberState) {
        return <div className={member.ready ? "party-member party-member-ready" : "party-member party-member-not-ready"} title={`${member.name}: ${member.ready ? "Ready" : "Not Ready"}`}>
            {member.ready ? <i className="check-icon fas fa-check-square" /> : <i className="check-icon fas fa-square" />} 
            <span className="party-member-name">{member.name}</span>
            {member.isBot && <i className="settings-icon fas fa-microchip" title={`${member.name} is playing using AI autopilot`} onClick={() => pages.changePage("ai")} />}
        </div>
    }

    private getPartyDetailsUrl() {
        return url.getPath(Object.assign({}, this.props.current, { page: "party" }));
    }

    private onPartyDetailsClick(ev: React.MouseEvent<HTMLAnchorElement>) {
        ev.preventDefault();
        pages.changePage("party");
    }
}

export default ReactRedux.connect(stateToProps)(HomePanel);