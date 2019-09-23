
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as url from '../url';
import PartyMemberControl from './partyMemberControl';

interface Props {
    selfId: string
    party: s.PartyState;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        selfId: state.socketId,
        party: state.party,
    };
}

export class PartyMemberList extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const party = this.props.party;
        if (!party) {
            return null;
        }

        const self = party.members.find(m => m.socketId === this.props.selfId);
        if (!self) {
            return null;
        }

        return <div className="party-list">
            {party.members.map(m => <PartyMemberControl
                key={m.socketId}
                member={m}
                editable={self.isLeader || (!party.isLocked && m.socketId === self.socketId)}
                isSelf={m.socketId === self.socketId}
                showAll={true}
            />)}
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(PartyMemberList);