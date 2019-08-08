import * as React from 'react';
import { EdgeProps } from './popup';
import Popup from './popup';

interface Props extends EdgeProps, React.HTMLAttributes<HTMLSpanElement> {
    tip: React.ReactNode;
    edge: EdgeProps;
}
interface State {
    hovering: boolean;
    anchor: HTMLElement;
}

export default class Tooltip extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            anchor: null,
            hovering: false,
        };
    }

    render() {
        return <span
            ref={(anchor) => this.setState({ anchor })}
            onMouseEnter={() => this.setState({ hovering: true })}
            onMouseLeave={() => this.setState({ hovering: false })}
            {...this.props}>
            {this.props.children}
            {this.state.hovering && this.state.anchor && <Popup anchor={this.state.anchor} edge={this.props.edge}>
                {this.props.tip}
            </Popup>}
        </span>
    }
}