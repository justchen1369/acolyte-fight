import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as url from '../url';

interface Props {
    member: s.PartyMemberState;
    editable?: boolean;
    showAll?: boolean;
    isSelf?: boolean;
}

export class PartyMemberControl extends React.PureComponent<Props> {
    render() {
        const showAll = this.props.showAll;
        const editable = this.props.editable;
        const isSelf = this.props.isSelf;
        const member = this.props.member;

        const className = classNames({
            'party-member': true,
            'party-member-ready': member.ready,
            'party-member-not-ready': !member.ready,
            'party-member-editable': this.props.editable,
            'party-member-observing': this.props.member.isObserver,
        });
        return <div className={className} title={`${member.name}: ${member.ready ? "Ready" : "Not Ready"}`}>
            {member.ready && <i className="check-icon fas fa-check-square" onClick={() => isSelf && parties.updateReadyStatusAsync(false)} />} 
            {!member.ready && <i className="check-icon fas fa-square" onClick={() => isSelf && parties.updateReadyStatusAsync(true)} />}
            <span className="party-member-name">{member.name}</span>
            {showAll && member.isLeader && <i className="settings-icon fas fa-crown" title={`${member.name} is the party leader`} />}
            {member.isBot && <i className="settings-icon fas fa-microchip" title={`${member.name} is playing using AI autopilot`} onClick={() => pages.changePage("ai")} />}
            {member.isObserver && <i className="settings-icon fas fa-eye" title={`${member.name} is observing`} onClick={() => editable && parties.makeObserverAsync(member.socketId, false)} />}
            {showAll && !member.isObserver && <i className="settings-icon fas fa-gamepad" title={`${member.name} is playing (not observing)`} onClick={() => editable && parties.makeObserverAsync(member.socketId, true)} />}
            <div className="spacer" />
            {showAll && (editable || isSelf) && <i className="settings-icon fas fa-times" title={`Remove ${member.name} from party`} onClick={() => parties.kick(member.socketId)} />}
        </div>
    }
}

export default PartyMemberControl;