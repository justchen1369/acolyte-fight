import * as React from 'react';
import * as url from './url';

interface Props {
    current: url.PathElements;
    changePage: (newPage: string) => void;
}

interface State {
}

export class NavBar extends React.Component<Props, State> {
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
            {this.renderNavBarItem("share", "Share")}
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
        this.props.changePage(newPage);
    }
}