import * as React from 'react';
import { ButtonBar, Spells } from '../game/constants';
import { Icons } from '../ui/icons';
import { renderIcon } from '../ui/renderIcon';

interface Props extends React.HTMLAttributes<HTMLCanvasElement> {
    spellId: string;
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

        const spell = Spells.all[this.props.spellId];
        const icon = Icons[spell.icon];
        if (icon) {
            const ctx = elem.getContext('2d');
            renderIcon(ctx, icon, spell.color, 0.9, this.props.size);
        }
    }
}