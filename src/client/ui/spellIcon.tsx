import * as React from 'react';
import { Icons } from '../core/icons';
import { renderIconButton } from '../core/renderIcon';

interface Props extends React.HTMLAttributes<HTMLCanvasElement> {
    icon: string;
    color: string;
    size: number;
    hoverWash?: boolean;
}

interface State {
    hovering: boolean;
}

export class SpellIcon extends React.Component<Props, State> {
    private elem: HTMLCanvasElement = null;

    constructor(props: Props) {
        super(props);

        this.state = {
            hovering: false,
        };
    }

    render() {
        let className = "spell-icon";
        if (this.props.className) {
            className = className + " " + this.props.className;
        }

        this.redrawCanvas(); // Redraw previous canvas in response to state changes

        return <canvas
            {...this.props}
            className={className}
            ref={(elem: HTMLCanvasElement) => this.onCanvasElem(elem)}
            width={this.props.size}
            height={this.props.size}
            onMouseEnter={(ev) => this.onMouseEnter(ev)}
            onMouseLeave={(ev) => this.onMouseLeave(ev)}
        />
    }

    private onMouseEnter(ev: React.MouseEvent<HTMLCanvasElement>) {
        this.setState({ hovering: true });
        if (this.props.onMouseEnter) {
            this.props.onMouseEnter(ev);
        }
    }

    private onMouseLeave(ev: React.MouseEvent<HTMLCanvasElement>) {
        this.setState({ hovering: false });
        if (this.props.onMouseLeave) {
            this.props.onMouseLeave(ev);
        }
    }

    private onCanvasElem(_elem: HTMLCanvasElement) {
        this.elem = _elem;
        this.redrawCanvas();
    }
    
    private redrawCanvas() {
        if (!this.elem) {
            return;
        }

        const icon = Icons[this.props.icon];
        if (icon) {
            const ctx = this.elem.getContext('2d');
            const rect = this.elem.getBoundingClientRect();

            let color = this.props.color;
            if (this.props.hoverWash && !this.state.hovering) {
                color = "#888";
            }

            ctx.clearRect(0, 0, rect.width, rect.height);
            renderIconButton(ctx, icon, color, 0.9, this.props.size);
        }
    }
}