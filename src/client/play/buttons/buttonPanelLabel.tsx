import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';

interface Props {
    hoverLabel: string;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        hoverLabel: state.world.ui.toolbar.hoverButtonPanel,
    };
}

class ButtonPanelLabel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.hoverLabel) {
            return <div className="button-panel-label">{this.props.hoverLabel}</div>
        } else {
            return null;
        }
    }
}

export default ReactRedux.connect(stateToProps)(ButtonPanelLabel);