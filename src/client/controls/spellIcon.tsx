import Color from 'color';
import * as React from 'react';
import * as icons from '../core/icons';
import { renderIconOnly } from '../graphics/renderIcon';
import './spellIcon.scss';

interface Props {
    icon: Path2D;
    color: string;
    size: number;
    width?: number;
    height?: number;

    attr?: React.HTMLAttributes<HTMLCanvasElement>;
    style?: React.CSSProperties;
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
        const width = this.props.width || this.props.size;
        const height = this.props.height || this.props.size;
        const retinaMultiplier = window.devicePixelRatio || 1;

        let className = "spell-icon";
        if (attr.className) {
            className = className + " " + attr.className;
        }

        const allStyles = {
            width,
            height,
            "--spell-color": this.props.color,
            ...this.props.style,
        } as React.CSSProperties;

        return <canvas
            {...attr}
            style={allStyles}
            className={className}
            ref={(elem: HTMLCanvasElement) => this.onCanvasElem(elem)}
            width={width * retinaMultiplier}
            height={height * retinaMultiplier}
            onMouseEnter={(ev) => this.onMouseEnter(ev)}
            onMouseLeave={(ev) => this.onMouseLeave(ev)}
        />
    }

    componentDidMount() {
        this.redrawCanvas(); // Redraw previous canvas in response to state changes
    }

    componentDidUpdate() {
        this.redrawCanvas(); // Redraw previous canvas in response to state changes
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
            const ctx = this.elem.getContext('2d', { alpha: true });
            ctx.save();

            const width = this.elem.width;
            const height = this.elem.height;
            ctx.clearRect(0, 0, width, height);

            const size = Math.min(width, height);

            // Icon
            const left = (width - size) / 2;
            const top = (height - size) / 2;
            ctx.translate(left, top);
            renderIconOnly(ctx, icon, 0.9, size);

            ctx.restore();
        }
    }
}

export default SpellIcon;