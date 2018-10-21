import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
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
        return this.props.loggedIn ? this.renderLoggedIn() : this.renderNotLoggedIn();
    }

    private renderNotLoggedIn() {
        const className = classNames({
            "login-btn": true,
            "logging-in": !this.props.loginAttempted,
        });
        return <NavBarItem className={className} page="login" onClick={() => { /* do nothing, just follow the link */ }}>Login</NavBarItem>
    }

    private renderLoggedIn() {
        return <NavBarItem page="profile" className="nav-profile-item" profileId={this.props.userId}>{this.props.playerName}</NavBarItem>
    }
}

export default ReactRedux.connect(stateToProps)(LoginButton);