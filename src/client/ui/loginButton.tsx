import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as rankings from '../core/rankings';
import * as url from '../url';
import NavBarItem from './navbarItem';
import { isFacebook } from '../core/userAgent';

interface Props {
    loginAttempted: boolean;
    userId: string;
    loggedIn: boolean;
    playerName: string;
    profile: m.GetProfileResponse;
}

function stateToProps(state: s.State): Props {
    return {
        loginAttempted: state.userId !== undefined,
        userId: state.userId,
        loggedIn: state.loggedIn,
        playerName: state.playerName,
        profile: state.profile,
    };
}

class LoginButton extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
        this.state = {
        }
    }

    render() {
        return this.props.loggedIn ? this.renderLoggedIn() : this.renderNotLoggedIn();
    }

    private renderNotLoggedIn() {
        if (isFacebook) {
            // Can't force a login when playing through Facebook instant games - it happens automatically after NumVerificationGames
            return null;
        }

        const className = classNames({
            "login-btn": true,
            "logging-in": !this.props.loginAttempted,
        });
        return <NavBarItem className={className} page="login" onClick={() => { /* do nothing, just follow the link */ }}>Login</NavBarItem>
    }

    private renderUnrankedLoggedIn() {
        return <NavBarItem page="profile" className="nav-profile-item" profileId={this.props.userId}>{this.props.playerName}</NavBarItem>
    }

    private renderLoggedIn() {
        const profile = this.props.profile;
        if (!(profile && profile.ratings)) {
            return this.renderUnrankedLoggedIn();
        }

        const rating = profile.ratings[m.GameCategory.PvP];
        if (!(rating && rating.lowerBound && rating.percentile >= 0)) {
            return this.renderUnrankedLoggedIn();
        }

        const league = rankings.getLeagueName(rating.percentile);
        return <NavBarItem page="profile" className="nav-profile-item nav-item-ranking" profileId={this.props.userId}>
            You: <b>{league}</b> {rating.lowerBound.toFixed(0)}
        </NavBarItem>
    }
}

export default ReactRedux.connect(stateToProps)(LoginButton);