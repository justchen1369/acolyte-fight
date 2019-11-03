import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

interface Props {
    playing: boolean;
    performance: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        playing: !!state.world.ui.myHeroId,
        performance: state.showingPerformance,
    };
}

class PerformanceButton extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (!this.props.playing) {
            // Not available in replays
            return null;
        }

        if (this.props.performance) {
            return <ButtonRow secondary={true} label="Hide Performance Stats" icon="fas fa-stopwatch" onClick={() => this.onClick(false)} />
        } else {
            return <ButtonRow secondary={true} label="Show Performance Stats" icon="fas fa-stopwatch" onClick={() => this.onClick(true)} />
        }
    }

    private async onClick(showingPerformance: boolean) {
        StoreProvider.dispatch({ type: "showingPerformance", showingPerformance });
    }
}

export default ReactRedux.connect(stateToProps)(PerformanceButton);