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
                <NavBarItem page=""><i className="fas fa-home" title="Home" /><span className="shrink"> Home</span></NavBarItem>
                <NavBarItem page="leaderboard" shrink={true}><i className="fas fa-star" title="Leaderboard" /><span className="shrink"> Leaderboard</span></NavBarItem>
                <NavBarItem page="regions"><i className="fas fa-globe-americas" title="Regions" /></NavBarItem>
                {this.props.inParty && <NavBarItem page="party" badge={this.props.inParty} shrink={true}><i className="fas fa-user-friends" title="Party" /></NavBarItem>}
                <div className="spacer" />
                <LoginButton />
            </div>
            <div className={verticalClasses} onClick={(ev) => this.stopBubbling(ev)}>
                <NavBarItem page={null} onClick={(ev) => this.onToggleOpen(ev)}><i className="fas fa-bars" /></NavBarItem>
                <NavBarItem page=""><i className="fas fa-home" /> Home</NavBarItem>
                <NavBarItem page="leaderboard"><i className="fas fa-star" /> Leaderboard</NavBarItem>
                <NavBarItem page="profile" className="nav-profile-item" profileId={this.props.userId}><i className="fas fa-video" /> Replays</NavBarItem>
                <NavBarItem page="regions"><i className="fas fa-globe-americas" /> Regions</NavBarItem>
                <NavBarItem page="party" badge={this.props.inParty}><i className="fas fa-user-friends" /> Party</NavBarItem>
                <NavBarItem page="settings"><i className="fas fa-cog" /> Settings</NavBarItem>
                <div className="spacer" />
                <NavBarItem page="modding" badge={this.props.isModded}><i className="fas fa-wrench" /> Modding</NavBarItem>
                <NavBarItem page="ai" badge={this.props.isUsingAI}><i className="fas fa-microchip" /> AI</NavBarItem>
                <NavBarItem page="about"><i className="fas fa-info-circle" /> About</NavBarItem>
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