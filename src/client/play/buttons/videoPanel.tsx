import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as matches from '../../core/matches';
import * as recording from '../../core/recording';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

interface Props {
    gameId: string;
    live: boolean;
    finished: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        gameId: state.world.ui.myGameId,
        live: state.world.ui.live,
        finished: !!state.world.winner,
    };
}

class VideoPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.gameId && (!this.props.live || this.props.finished) && recording.isRecordingSupported()) {
            return <ButtonRow label="Save Replay Video" icon="fas fa-download" onClick={() => this.onRecordClick()} />
        } else {
            return null;
        }
    }

    private onRecordClick() {	
        matches.leaveCurrentGame(true);	
        recording.enterRecording(this.props.gameId);	
    }
}

export default ReactRedux.connect(stateToProps)(VideoPanel);