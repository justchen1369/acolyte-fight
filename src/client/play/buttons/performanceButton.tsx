import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../../core/cloud';
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
        performance: state.options.performance,
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
            return <ButtonRow label="Hide Performance Stats" icon="fas fa-stopwatch" onClick={() => this.onClick(false)} />
        } else {
            return <ButtonRow label="Show Performance Stats" icon="fas fa-stopwatch" onClick={() => this.onClick(true)} />
        }
    }

    private async onClick(performance: boolean) {
        StoreProvider.dispatch({
            type: "updateOptions",
            options: { performance },
        });
        await cloud.uploadSettings();
    }
}

export default ReactRedux.connect(stateToProps)(PerformanceButton);