import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as url from '../url';

const MaxTeam = 4;

interface OwnProps {
    member: s.PartyMemberState;
    editable?: boolean;
    showAll?: boolean;
    isSelf?: boolean;
    allowTeams?: boolean;
}
interface Props extends OwnProps {
    teamColors: string[];
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        teamColors: state.room.settings.Visuals.TeamColors,
    }
}

export class PartyMemberControl extends React.PureComponent<Props> {
    render() {
        const showAll = this.props.showAll;
        const editable = this.props.editable;
        const allowTeams = this.props.allowTeams;
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
            {showAll && member.isLeader && <i className="settings-icon fas fa-crown" title={`${member.name} is the party leader`} onClick={() => !isSelf && editable && parties.makeLeaderAsync(member.socketId, false)} />}
            {showAll && !member.isLeader && <i className="settings-icon fas fa-user" title={`${member.name} is not the party leader`} onClick={() => editable && parties.makeLeaderAsync(member.socketId)} />}
            {member.isObserver && <i className="settings-icon fas fa-eye" title={`${member.name} is observing`} onClick={() => editable && parties.makeObserverAsync(member.socketId, false)} />}
            {showAll && !member.isObserver && <i className="settings-icon fas fa-gamepad" title={`${member.name} is playing (not observing)`} onClick={() => editable && parties.makeObserverAsync(member.socketId, true)} />}
            {showAll && !member.isObserver && allowTeams && member.team && <i className="settings-icon fas fa-flag" style={{color: this.teamColor(member.team)}} title={`${member.name} is on a team ${member.team}`} onClick={() => editable && this.onTeamClick()} />}
            {showAll && !member.isObserver && allowTeams && !member.team && <i className="settings-icon far fa-flag" title={`${member.name} is not on a team`} onClick={() => editable && this.onTeamClick()} />}
            <div className="spacer" />
            {showAll && (editable || isSelf) && <i className="settings-icon fas fa-times" title={`Remove ${member.name} from party`} onClick={() => parties.kick(member.socketId)} />}
        </div>
    }

    private teamColor(team: number): string {
        const teamColors = this.props.teamColors;

        let index = team - 1; // We never allocate team 0, so give team 1 their color, but wrap around just in case
        if (index < 0) {
            index += teamColors.length;
        }
        index = index % teamColors.length;

        return teamColors[index];
    }

    private onTeamClick() {
        const member = this.props.member;
        let nextTeam = (member.team || 0) + 1;
        if (nextTeam > MaxTeam) {
            nextTeam = null;
        }

        parties.updateTeamStatusAsync(member.socketId, nextTeam);
    }
}

export default ReactRedux.connect(stateToProps)(PartyMemberControl);