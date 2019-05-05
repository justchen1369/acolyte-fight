import * as React from 'react';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
}

export default class Button extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        this.state = {
            saved: false,
            hovering: null,
        };
    }

    render() {
        return <span
            {...this.props}
            className={this.props.className !== undefined ? this.props.className : "btn"}
            onMouseDown={ev => { ev.stopPropagation(); this.props.onMouseDown && this.props.onMouseDown(ev) }}
            onMouseMove={ev => { ev.stopPropagation(); this.props.onMouseMove && this.props.onMouseMove(ev) }}
            onTouchStart={ev => { ev.stopPropagation(); this.props.onTouchStart && this.props.onTouchStart(ev) }}
            onTouchMove={ev => { ev.stopPropagation(); this.props.onTouchMove && this.props.onTouchMove(ev) }}
            onTouchEnd={ev => { ev.stopPropagation(); this.props.onTouchEnd && this.props.onTouchEnd(ev) }}
            >{this.props.children}</span>
    }
}