import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as loader from '../core/loader';
import * as online from '../core/online';
import * as segments from '../../shared/segments';
import * as s from '../store.model';
import version from '../../game/version';

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
    return segments.calculateSegment(version, props.roomId, props.partyId);
}

class OnlineSegmentListener extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    componentDidMount() {
        this.resendSegment();
    }

    componentDidUpdate(prevProps: Props) {
        const newSegment = calculateSegment(this.props);
        const prevSegment = calculateSegment(prevProps);
        if (prevSegment !== newSegment) {
            this.resendSegment();
        }
    }

    render(): JSX.Element {
        return null;
    }

    private async resendSegment() {
        await loader.loaded();
        online.start(calculateSegment(this.props));
    }
}

export default ReactRedux.connect(stateToProps)(OnlineSegmentListener);