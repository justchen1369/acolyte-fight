import Color from 'color';
import * as React from 'react';
import * as icons from '../core/icons';
import { renderIconButton } from '../graphics/renderIcon';

interface Props {
    icon: Path2D;
    color: string;
    size: number;
    width?: number;
    height?: number;
    hoverHighlight?: boolean;

    attr?: React.HTMLAttributes<HTMLCanvasElement>;
    style?: any;
}

interface State {
    hovering: boolean;
}

export class SpellIcon extends React.PureComponent<Props, State> {
    private elem: HTMLCanvasElement = null;

    constructor(props: Props) {
        super(props);

        this.state = {
            hovering: false,
        };
    }

    render() {
        const attr = this.props.attr || {};
        const style = this.props.style || {};
        const width = this.props.width || this.props.size;
        const height = this.props.height || this.props.size;

        let className = "spell-icon";
        if (attr.className) {
            className = className + " " + attr.className;
        }

        this.redrawCanvas(); // Redraw previous canvas in response to state changes

        return <canvas
            {...attr}
            style={{ width, height, ...style }}
            className={className}
            ref={(elem: HTMLCanvasElement) => this.onCanvasElem(elem)}
            width={width}
            height={height}
            onMouseEnter={(ev) => this.onMouseEnter(ev)}
            onMouseLeave={(ev) => this.onMouseLeave(ev)}
        />
    }

    private onMouseEnter(ev: React.MouseEvent<HTMLCanvasElement>) {
        this.setState({ hovering: true });
        if (this.props.attr && this.props.attr.onMouseEnter) {
            this.props.attr.onMouseEnter(ev);
        }
    }

    private onMouseLeave(ev: React.MouseEvent<HTMLCanvasElement>) {
        this.setState({ hovering: false });
        if (this.props.attr && this.props.attr.onMouseLeave) {
            this.props.attr.onMouseLeave(ev);
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

        const icon = this.props.icon;
        if (icon) {
            const ctx = this.elem.getContext('2d');
            const rect = this.elem.getBoundingClientRect();

            let color = this.props.color;
            if (this.props.hoverHighlight && this.state.hovering) {
                color = Color(color).mix(Color("white"), 0.5).string();
            }

            const left = (rect.width - this.props.size) / 2;
            const top = (rect.height - this.props.size) / 2;

            ctx.save();

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.rect(0, 0, rect.width, rect.height);
            ctx.fill();

            ctx.translate(left, top);

            renderIconButton(ctx, icon, color, 0.9, this.props.size);
            ctx.restore();
        }
    }
}

export default SpellIcon;