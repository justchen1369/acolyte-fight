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
            onMouseDown={ev => this.onMouseDown(ev)}
            onTouchStart={ev => this.onTouchStart(ev)}
            >{this.props.children}</span>
    }
    
    private onMouseDown(ev: React.MouseEvent<HTMLSpanElement>) {
        ev.stopPropagation();
        if (this.props.onMouseDown) {
            this.props.onMouseDown(ev);
        }
    }

    private onTouchStart(ev: React.TouchEvent<HTMLSpanElement>) {
        ev.stopPropagation();
        if (this.props.onTouchStart) {
            this.props.onTouchStart(ev);
        }
    }
}