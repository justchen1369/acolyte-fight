import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';

interface Props {
    current: s.PathElements;
}

interface State {
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
    };
}

class NavBar extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        }
    }
    render() {
        return <div className="navbar">
            {this.renderNavBarItem("", "Home")}
            {this.renderNavBarItem("replays", "Replays")}
            {this.renderNavBarItem("modding", "Modding", true)}
            {this.renderNavBarItem("ai", "AI", true)}
            {this.renderNavBarItem("party", "Party")}
            {this.renderNavBarItem("about", "About")}
            <div className="spacer" />
        </div>
    }

    private renderNavBarItem(page: string, label: string, hideOnMobile: boolean = false) {
        const classNames = ["nav-item"];
        if (this.props.current.page === page) {
            classNames.push("nav-item-selected");
        }
        if (hideOnMobile) {
            classNames.push("nav-optional");
        }

        const newPath = url.getPath(Object.assign({}, this.props.current, { page }));
        return <a className={classNames.join(" ")} href={newPath} onClick={(ev) => this.onNavClick(ev, page)}>{label}</a>
    }

    private onNavClick(ev: React.MouseEvent<HTMLAnchorElement>, newPage: string) {
        ev.preventDefault();
        pages.changePage(newPage);
    }
}

export default ReactRedux.connect(stateToProps)(NavBar);