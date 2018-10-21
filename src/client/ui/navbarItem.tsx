import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';

interface OwnProps {
    page: string;
    profileId?: string;
    className?: string;
    shrink?: boolean;
    badge?: boolean;
    onClick?: (ev: React.MouseEvent) => void;
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

class NavBarItem extends React.Component<Props> {
    render() {
        const page = this.props.page;
        const profileId = this.props.profileId || null;

        const classNames = ["nav-item"];
        if (this.props.className) {
            classNames.push(this.props.className);
        }
        if (this.props.current.page === page) {
            classNames.push("nav-item-selected");
        }
        if (this.props.shrink) {
            classNames.push("nav-optional");
        }

        const newPath = url.getPath(Object.assign({}, this.props.current, { page, profileId }));
        return <a className={classNames.join(" ")} href={newPath} onClick={(ev) => this.onNavClick(ev, page, profileId)}>
            <span className="nav-item-label">
                {this.props.children}
                {this.props.badge && <i className="badge fas fa-circle" />}
            </span>
        </a>
    }

    private onNavClick(ev: React.MouseEvent<HTMLAnchorElement>, newPage: string, profileId: string) {
        if (this.props.onClick) {
            this.props.onClick(ev);
        } else {
            ev.preventDefault();
            pages.changePage(newPage, profileId);
        }
    }
}

export default ReactRedux.connect(stateToProps)(NavBarItem);