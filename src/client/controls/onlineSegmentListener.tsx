import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as online from '../core/online';
import * as segments from '../../shared/segments';
import * as s from '../store.model';

interface Props {
    roomId: string;
    partyId: string;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        roomId: state.room && state.room.id,
        partyId: state.party && state.party.id,
    };
}

function calculateSegment(props: Props) {
    return segments.calculateSegment(props.roomId, props.partyId);
}

class OnlineSegmentListener extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    componentDidMount() {
        online.start(calculateSegment(this.props));
    }

    componentDidUpdate(prevProps: Props) {
        const newSegment = calculateSegment(this.props);
        const prevSegment = calculateSegment(prevProps);
        if (prevSegment !== newSegment) {
            online.start(newSegment);
        }
    }

    render(): JSX.Element {
        return null;
    }
}

export default ReactRedux.connect(stateToProps)(OnlineSegmentListener);