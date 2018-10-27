import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';
import LoginButton from './loginButton';
import NavBarItem from './navbarItem';

interface Props {
    userId: string;
    isUsingAI: boolean;
    isModded: boolean;
    inParty: boolean;
}

interface State {
    open: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        userId: state.userId,
        isUsingAI: !!state.aiCode,
        isModded: Object.keys(state.room.mod).length > 0,
        inParty: !!state.party,
    };
}

class NavBar extends React.Component<Props, State> {
    private windowClickListener = this.onWindowClick.bind(this);

    constructor(props: Props) {
        super(props);
        this.state = {
            open: false,
        }
    }

    componentWillMount() {
        window.addEventListener('click', this.windowClickListener);
    }

    componentWillUnmount() {
        window.removeEventListener('click', this.windowClickListener);
    }

    render() {
        const verticalClasses = classNames({
            "navbar": true,
            "navbar-vertical": true,
            "navbar-open": this.state.open,
        });
        return <div className="navbar-container">
            <div className="navbar navbar-horizontal">
                <NavBarItem page={null} onClick={(ev) => this.onToggleOpen(ev)}><i className="fas fa-bars" /></NavBarItem>
                <NavBarItem page="">Home</NavBarItem>
                <NavBarItem page="leaderboard" shrink={true}>Leaderboard</NavBarItem>
                <NavBarItem page="regions" shrink={true}>Regions</NavBarItem>
                <NavBarItem page="party" badge={this.props.inParty} shrink={true}>Party</NavBarItem>
                <div className="spacer" />
                <LoginButton />
            </div>
            <div className={verticalClasses} onClick={(ev) => this.stopBubbling(ev)}>
                <NavBarItem page={null} onClick={(ev) => this.onToggleOpen(ev)}><i className="fas fa-bars" /></NavBarItem>
                <NavBarItem page="">Home</NavBarItem>
                <NavBarItem page="leaderboard">Leaderboard</NavBarItem>
                <NavBarItem page="modding" badge={this.props.isModded}>Modding</NavBarItem>
                {this.props.isUsingAI && <NavBarItem page="ai" badge={this.props.isUsingAI}>AI</NavBarItem>}
                <NavBarItem page="regions">Regions</NavBarItem>
                <NavBarItem page="party" badge={this.props.inParty}>Party</NavBarItem>
                <NavBarItem page="settings">Settings</NavBarItem>
                <NavBarItem page="about">About</NavBarItem>
                <div className="spacer" />
            </div>
        </div>
    }

    private stopBubbling(ev: React.MouseEvent) {
        // Stop bubbling so that only clicks outside of the navbar close it
        ev.stopPropagation();
    }

    private onToggleOpen(ev: React.MouseEvent) {
        // Stop bubbling because that would close the navigation bar
        ev.stopPropagation();
        ev.preventDefault();
        this.setState({ open: !this.state.open });
    }

    private onWindowClick() {
        if (this.state.open) {
            this.setState({ open: false });
        }
    }
}

export default ReactRedux.connect(stateToProps)(NavBar);