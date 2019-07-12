import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as matches from '../core/matches';
import * as watcher from '../core/watcher';

interface Props {
    watching: boolean;
    winner: boolean;
    finished: boolean;
}
interface State {
    loading: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        watching: watcher.isWatching(state),
        winner: !!state.world.winner,
        finished: state.world.activePlayers.size === 0,
    };
}

class WatchLooper extends React.Component<Props, State> {
    private timerHandle: NodeJS.Timer = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            loading: false,
        };
    }

    componentWillMount() {
        this.timerHandle = setInterval(() => this.recheck(), 5000);
    }

    componentWillUnmount() {
        if (this.timerHandle) {
            clearInterval(this.timerHandle);
            this.timerHandle = null;
        }
    }

    render(): JSX.Element {
        return null;
    }

    private async recheck() {
        if (!this.props.watching) {
            return;
        }

        if (this.state.loading) {
            return; // Already loading next game
        }

        const ready = this.props.winner || this.props.finished;
        if (!ready) {
            return;
        }

        this.setState({ loading: true });
        await matches.watchLiveGame();
        this.setState({ loading: false });
    }
}

export default ReactRedux.connect(stateToProps)(WatchLooper);