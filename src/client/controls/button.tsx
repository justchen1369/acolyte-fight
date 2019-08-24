import * as React from 'react';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
    disabled?: boolean;
}

export default class Button extends React.PureComponent<Props> {
    render() {
        return <span
            {...this.props}
            className={this.calculateClassName()}
            onMouseDown={ev => this.onMouseDown(ev)}
            onTouchStart={ev => this.onTouchStart(ev)}
            onTouchEnd={ev => this.onTouchEnd(ev)}
            >{this.props.children}</span>
    }

    private calculateClassName() {
        if (this.props.className !== undefined) {
            return this.props.className;
        } else if (this.props.disabled) {
            return "btn btn-disabled";
        } else {
            return "btn";
        }
    }

    private onMouseDown(ev: React.MouseEvent<HTMLSpanElement>) {
        ev.stopPropagation();
        if (!this.props.disabled && this.props.onMouseDown) {
            this.props.onMouseDown(ev);
        }
    }

    private onTouchStart(ev: React.TouchEvent<HTMLSpanElement>) {
        ev.stopPropagation();
        if (!this.props.disabled && this.props.onTouchStart) {
            this.props.onTouchStart(ev);
        }
    }

    private onTouchEnd(ev: React.TouchEvent<HTMLSpanElement>) {
        ev.stopPropagation();
        if (!this.props.disabled && this.props.onTouchEnd) {
            this.props.onTouchEnd(ev);
        }
    }
}