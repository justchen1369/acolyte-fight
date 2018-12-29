import classNames from 'classnames';
import * as React from 'react';
import * as s from '../store.model';

interface Props {
    href?: string;
    className?: string;
    shrink?: boolean;
    badge?: boolean;
    disabled?: boolean;
    selected?: boolean;
    onClick?: (ev: React.MouseEvent) => void;
}

class CustomItem extends React.Component<Props> {
    render() {
        const classSelectors: any = {
            'nav-item': true,
            'nav-item-selected': this.props.selected,
            'nav-optional': this.props.shrink,
            'nav-item-disabled': this.props.disabled,
        };
        if (this.props.className) {
            classSelectors[this.props.className] = true;
        }
        const className = classNames(classSelectors);

        return <a className={className} href={this.props.href || "#"} onClick={(ev) => this.onNavClick(ev)}>
            <span className="nav-item-label">
                {this.props.children}
                {this.props.badge && <i className="badge fas fa-circle" />}
            </span>
        </a>
    }

    private onNavClick(ev: React.MouseEvent<HTMLAnchorElement>) {
        if (this.props.onClick) {
            this.props.onClick(ev);

            if (!this.props.href) {
                ev.preventDefault();
            }
        }
    }
}

export default CustomItem;