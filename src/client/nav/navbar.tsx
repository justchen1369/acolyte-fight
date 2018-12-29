import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as pages from '../core/pages';
import * as url from '../url';
import { isMobile } from '../core/userAgent';
import LoginButton from './loginButton';
import NavBarItem from './navbarItem';
import RatingControl from './ratingControl';

interface OwnProps {
    children?: React.ReactFragment;
}
interface Props {
    page: string;
    userId: string;
    isUsingAI: boolean;
    isModded: boolean;
    inParty: boolean;
    children?: React.ReactFragment;
}

interface State {
    open: boolean;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        page: state.current.page,
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
        if (this.props.children) {
            return this.renderCustom();
        } else if (this.props.page === "") {
            return this.renderNavBar();
        } else {
            return this.renderBackToHome();
        }
    }

    private renderCustom() {
        return <div className="navbar-container">
            <div className="navbar navbar-horizontal">
                {this.props.children}
            </div>
        </div>
    }

    private renderBackToHome() {
        return <div className="navbar-container">
            <div className="navbar navbar-horizontal">
                <NavBarItem page=""><i className="fas fa-chevron-left" /><span className="shrink"> Back to</span> Home</NavBarItem>
                <div className="spacer" />
                <LoginButton />
            </div>
        </div>
    }

    private renderNavBar() {
        const a = options.getProvider();
        const verticalClasses = classNames({
            "navbar": true,
            "navbar-vertical": true,
            "navbar-open": this.state.open,
        });
        return <div className="navbar-container">
            <div className="navbar navbar-horizontal">
                {!a.noMenu && <NavBarItem page={null} onClick={(ev) => this.onToggleOpen(ev)}><i className="fas fa-bars" /></NavBarItem>}
                {!a.noScrolling && <NavBarItem page="leaderboard" shrink={true}><i className="fas fa-star" title="Leaderboard" /><span className="shrink"> Leaderboard</span></NavBarItem>}
                {!a.noExternalLinks && <NavBarItem page="regions"><i className="fas fa-globe-americas" title="Regions" /></NavBarItem>}
                {this.props.isModded && <NavBarItem page="modding" badge={this.props.isModded}><i className="icon fas fa-wrench" title="Modding" /></NavBarItem>}
                {this.props.isUsingAI && <NavBarItem page="ai" badge={this.props.isUsingAI}><i className="icon fas fa-microchip" title="AI" /></NavBarItem>}
                {this.props.inParty && <NavBarItem page="party" badge={this.props.inParty} shrink={true}><i className="fas fa-user-friends" title="Party" /></NavBarItem>}
                <div className="spacer" />
                <RatingControl />
                <LoginButton />
            </div>
            <div className={verticalClasses} onClick={(ev) => this.stopBubbling(ev)}>
                <NavBarItem page={null} onClick={(ev) => this.onToggleOpen(ev)}><i className="fas fa-bars" /></NavBarItem>
                <NavBarItem page=""><i className="icon fas fa-home" /> Home</NavBarItem>
                {!a.noScrolling && <NavBarItem page="leaderboard"><i className="icon fas fa-star" /> Leaderboard</NavBarItem>}
                <NavBarItem page="profile" className="nav-profile-item" profileId={this.props.userId}><i className="icon fas fa-video" /> Replays</NavBarItem>
                {!a.noExternalLinks && <NavBarItem page="regions"><i className="icon fas fa-globe-americas" /> Regions</NavBarItem>}
                {!a.noExternalLinks && <NavBarItem page="party" badge={this.props.inParty}><i className="icon fas fa-user-friends" /> Party</NavBarItem>}
                {!a.noScrolling && <NavBarItem page="settings"><i className="icon fas fa-cog" /> Settings</NavBarItem>}
                <div className="spacer" />
                {!a.noAdvanced && !isMobile && <NavBarItem page="modding" badge={this.props.isModded}><i className="icon fas fa-wrench" /> Modding</NavBarItem>}
                {!a.noExternalLinks && <NavBarItem page="about"><i className="icon fas fa-info-circle" /> About</NavBarItem>}
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