import * as React from 'react';
import { Icons } from './icons';
import { renderIconButton } from '../client/renderIcon';

interface Props extends React.HTMLAttributes<HTMLCanvasElement> {
    icon: string;
    color: string;
    size: number;
}

interface State {
}

export class SpellIcon extends React.Component<Props, State> {
    render() {
        let className = "spell-icon";
        if (this.props.className) {
            className = className + " " + this.props.className;
        }
        return React.createElement(
            "canvas",
            Object.assign({}, this.props, {
                className,
                ref: (elem: HTMLCanvasElement) => this.onCanvasElem(elem),
                width: this.props.size,
                height: this.props.size,
            }));
    }

    private onCanvasElem(elem: HTMLCanvasElement) {
        if (!elem) {
            return;
        }

        const icon = Icons[this.props.icon];
        if (icon) {
            const ctx = elem.getContext('2d');
            renderIconButton(ctx, icon, this.props.color, 0.9, this.props.size);
        }
    }
}