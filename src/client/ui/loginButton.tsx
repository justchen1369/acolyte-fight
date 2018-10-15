import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';
import NavBarItem from './navbarItem';

interface Props {
    loginAttempted: boolean;
    userId: string;
    playerName: string;
}

function stateToProps(state: s.State): Props {
    return {
        loginAttempted: state.userId !== undefined,
        userId: state.userId,
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
        return this.props.userId ? this.renderLoggedIn() : this.renderNotLoggedIn();
    }

    private renderNotLoggedIn() {
        return <NavBarItem className={this.props.loginAttempted ? null : "logging-in"} page="login" onClick={() => { /* do nothing, just follow the link */ }}>Login</NavBarItem>
    }

    private renderLoggedIn() {
        return <NavBarItem className="nav-profile-item" page="account" profileId={this.props.userId}>{this.props.playerName}</NavBarItem>
    }
}

export default ReactRedux.connect(stateToProps)(LoginButton);