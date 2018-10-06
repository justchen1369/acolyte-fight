import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';
import NavBarItem from './navbarItem';

interface Props {
    loginAttempted: boolean;
    loggedIn: boolean;
    playerName: string;
}

function stateToProps(state: s.State): Props {
    return {
        loginAttempted: state.userId !== undefined,
        loggedIn: !!state.userId,
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
        if (this.props.loginAttempted) {
            return this.props.loggedIn ? this.renderLoggedIn() : this.renderNotLoggedIn();
        } else {
            return null;
        }
    }

    private renderNotLoggedIn() {
        return <NavBarItem page="login" onClick={() => { /* do nothing, just follow the link */ }}>Login</NavBarItem>
    }

    private renderLoggedIn() {
        return <NavBarItem className="nav-profile-item" page="profile">{this.props.playerName}</NavBarItem>
    }
}

export default ReactRedux.connect(stateToProps)(LoginButton);