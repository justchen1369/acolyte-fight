import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as online from '../core/online';
import * as segments from '../../game/segments';
import * as s from '../store.model';

interface Props {
    roomId: string;
    partyId: string;
    isPrivate: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        roomId: state.room && state.room.id,
        partyId: state.party && state.party.id,
        isPrivate: state.party && state.party.isPrivate,
    };
}

class OnlineSegmentListener extends React.Component<Props, State> {
    render(): JSX.Element {
        online.start(segments.calculateSegment(this.props.roomId, this.props.partyId, this.props.isPrivate));

        return null;
    }
}

export default ReactRedux.connect(stateToProps)(OnlineSegmentListener);