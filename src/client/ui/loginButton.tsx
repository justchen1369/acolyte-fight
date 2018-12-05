import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as options from '../core/options';
import * as pages from '../core/pages';
import * as url from '../url';
import NavBarItem from './navbarItem';

interface Props {
    loginAttempted: boolean;
    userId: string;
    loggedIn: boolean;
    playerName: string;
}

function stateToProps(state: s.State): Props {
    return {
        loginAttempted: state.userId !== undefined,
        userId: state.userId,
        loggedIn: state.loggedIn,
        playerName: state.playerName,
    };
}

class LoginButton extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
        this.state = {
        }
    }

    render() {
        return this.props.loggedIn ? this.renderProfileLink() : this.renderLoginBtn();
    }

    private renderLoginBtn() {
        if (options.getProvider().noLogin) {
            // Can't force a login when playing through Facebook instant games - it happens automatically after NumVerificationGames
            return null;
        }

        const className = classNames({
            "login-btn": true,
            "logging-in": !this.props.loginAttempted,
        });
        return <NavBarItem key="login" className={className} page="login" onClick={() => { /* do nothing, just follow the link */ }}>Login</NavBarItem>
    }

    private renderProfileLink() {
        if (this.props.userId) {
            return <NavBarItem key="profile" page="profile" className="nav-profile-item" profileId={this.props.userId}>{this.props.playerName}</NavBarItem>
        } else {
            return null;
        }
    }
}

export default ReactRedux.connect(stateToProps)(LoginButton);