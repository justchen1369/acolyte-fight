import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

interface Props {
    performance: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        performance: !!state.showingPerformance,
    };
}

class PerformanceButton extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.performance) {
            return <ButtonRow secondary={true} label="Hide Performance Stats" icon="fas fa-stopwatch" onClick={() => this.onHide()} />
        } else {
            return <ButtonRow secondary={true} label="Show Performance Stats" icon="fas fa-stopwatch" onClick={() => this.onShow()} />
        }
    }

    private async onHide() {
        StoreProvider.dispatch({ type: "showingPerformance", showingPerformance: null });
    }

    private async onShow() {
        StoreProvider.dispatch({ type: "showingPerformance", showingPerformance: s.PerformanceTab.None });
    }
}

export default ReactRedux.connect(stateToProps)(PerformanceButton);