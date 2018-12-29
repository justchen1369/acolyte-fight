import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';
import CustomItem from './hrefItem';

interface OwnProps {
    page?: string;
    profileId?: string;
    className?: string;
    shrink?: boolean;
    badge?: boolean;
    disabled?: boolean;
    selected?: boolean;
    onClick?: (ev: React.MouseEvent) => void;

    children?: React.ReactFragment;
}
interface Props extends OwnProps {
    current: s.PathElements;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
    };
}

class PageLink extends React.Component<Props> {
    render() {
        const page = this.props.page;
        const profileId = this.props.profileId || null;

        const newPath = url.getPath(Object.assign({}, this.props.current, { page, profileId }));
        return <CustomItem
            href={newPath}
            className={this.props.className}
            shrink={this.props.shrink}
            badge={this.props.badge}
            disabled={this.props.disabled}
            selected={this.props.selected !== undefined ? this.props.selected : this.props.current.page === page}
            onClick={(ev) => this.onNavClick(ev, page, profileId)}>
            {this.props.children}
            </CustomItem>
    }

    private onNavClick(ev: React.MouseEvent, newPage: string, profileId: string) {
        if (this.props.disabled) {
            // do nothing
            ev.preventDefault();
        } else if (this.props.onClick) {
            this.props.onClick(ev);
            if (!this.props.page) {
                ev.preventDefault();
            }
        } else {
            ev.preventDefault();
            pages.changePage(newPage, profileId);
        }
    }
}

export default ReactRedux.connect(stateToProps)(PageLink);