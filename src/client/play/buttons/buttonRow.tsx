import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';

import Button from '../../controls/button';

interface OwnProps {
    label: string;
    icon: string;
    onClick: () => void;
}
interface Props extends OwnProps {
    displayed: string;
}

interface State {
    hovering: boolean;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        displayed: state.world.ui.toolbar.hoverButtonPanel,
    };
}

class ButtonRow extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            hovering: false,
        };
    }

    componentDidUpdate() {
        if (this.state.hovering && this.props.displayed !== this.props.label) {
            this.hover();
        }
    }

    componentWillUnmount() {
        if (this.state.hovering) {
            this.unhover();
        }
    }

    render() {
        return <Button className="button-panel-row" onMouseEnter={() => this.hover()} onMouseLeave={() => this.unhover()} onClick={this.props.onClick}>
            <span className="button-panel-row-icon"><i className={this.props.icon} /></span>
            <span className="button-panel-row-label">{this.props.label}</span>
        </Button>
    }

    private hover() {
        this.setState({ hovering: true });
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { hoverButtonPanel: this.props.label },
        });
    }

    private unhover() {
        this.setState({ hovering: false });
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { hoverButtonPanel: null },
        });
    }
}

export default ReactRedux.connect(stateToProps)(ButtonRow);