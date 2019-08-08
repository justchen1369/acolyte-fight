import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as matches from '../core/matches';
import * as watcher from '../core/watcher';

interface Props {
    watching: boolean;
    finished: boolean;
}
interface State {
    loading: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        watching: watcher.isWatching(state),
        finished: !!state.world.winner || state.world.finished,
    };
}

class WatchLooper extends React.PureComponent<Props, State> {
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

        if (!this.props.finished) {
            return;
        }

        this.setState({ loading: true });
        await matches.watchLiveGame();
        this.setState({ loading: false });
    }
}

export default ReactRedux.connect(stateToProps)(WatchLooper);