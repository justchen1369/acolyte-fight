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
import CustomBar from './customBar';
import NavBarItem from './navbarItem';
import RatingControl from './ratingControl';

interface Props {
    page: string;
    userId: string;
    isUsingAI: boolean;
    isModded: boolean;
    inParty: boolean;
}

interface State {
}

function stateToProps(state: s.State): Props {
    return {
        page: state.current.page,
        userId: state.userId,
        isUsingAI: !!state.aiCode,
        isModded: Object.keys(state.room.mod).length > 0,
        inParty: !!state.party,
    };
}

class NavBar extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        }
    }

    render() {
        if (this.props.page === "") {
            return this.renderNavBar();
        } else {
            return this.renderBackToHome();
        }
    }

    private renderBackToHome() {
        return <CustomBar>
            <NavBarItem page=""><i className="fas fa-chevron-left" /><span className="shrink"> Back to</span> Home</NavBarItem>
            <div className="spacer" />
            <LoginButton />
        </CustomBar>
    }

    private renderNavBar() {
        const a = options.getProvider();
        const horizontal = <>
            {!a.noScrolling && <NavBarItem page="leaderboard" shrink={true}><i className="fas fa-star" title="Leaderboard" /><span className="shrink"> Leaderboard</span></NavBarItem>}
            {!a.noExternalLinks && <NavBarItem page="regions"><i className="fas fa-globe-americas" title="Regions" /></NavBarItem>}
            {this.props.isModded && <NavBarItem page="modding" badge={this.props.isModded}><i className="icon fas fa-wrench" title="Modding" /></NavBarItem>}
            {this.props.isUsingAI && <NavBarItem page="ai" badge={this.props.isUsingAI}><i className="icon fas fa-microchip" title="AI" /></NavBarItem>}
            {this.props.inParty && <NavBarItem page="party" badge={this.props.inParty} shrink={true}><i className="fas fa-user-friends" title="Party" /></NavBarItem>}
            <div className="spacer" />
            <RatingControl />
            <LoginButton />
        </>;

        const vertical = a.noMenu ? null : <>
            <NavBarItem page=""><i className="icon fas fa-home" /> Home</NavBarItem>
            {!a.noScrolling && <NavBarItem page="leaderboard"><i className="icon fas fa-star" /> Leaderboard</NavBarItem>}
            <NavBarItem page="profile" className="nav-profile-item" profileId={this.props.userId}><i className="icon fas fa-video" /> Replays</NavBarItem>
            {!a.noExternalLinks && <NavBarItem page="regions"><i className="icon fas fa-globe-americas" /> Regions</NavBarItem>}
            {!a.noExternalLinks && <NavBarItem page="party" badge={this.props.inParty}><i className="icon fas fa-user-friends" /> Party</NavBarItem>}
            {!a.noScrolling && <NavBarItem page="settings"><i className="icon fas fa-cog" /> Settings</NavBarItem>}
            <div className="spacer" />
            {!a.noAdvanced && !isMobile && <NavBarItem page="modding" badge={this.props.isModded}><i className="icon fas fa-wrench" /> Modding</NavBarItem>}
            {!a.noExternalLinks && <NavBarItem page="about"><i className="icon fas fa-info-circle" /> About</NavBarItem>}
        </>;
        return <CustomBar vertical={vertical}>{horizontal}</CustomBar>
    }
}

export default ReactRedux.connect(stateToProps)(NavBar);