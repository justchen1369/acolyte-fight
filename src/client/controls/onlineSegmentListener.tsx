import _ from 'lodash';
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

function requestUpdate(props: Props) {
    online.start(segments.calculateSegment(props.roomId, props.partyId, props.isPrivate));
}

class OnlineSegmentListener extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        requestUpdate(props);
    }

    componentWillReceiveProps(newProps: Props) {
        requestUpdate(newProps);
    }

    render(): JSX.Element {
        return null;
    }
}

export default ReactRedux.connect(stateToProps)(OnlineSegmentListener);