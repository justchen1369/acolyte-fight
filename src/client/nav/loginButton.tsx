import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as pages from '../core/pages';
import * as url from '../url';
import HrefItem from './hrefItem';
import PageLink from './pageLink';

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

class LoginButton extends React.PureComponent<Props> {
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
        return <HrefItem key="login" className={className} href="login">Login</HrefItem>
    }

    private renderProfileLink() {
        if (this.props.userId) {
            return <PageLink key="profile" page="profile" className="nav-profile-item" profileId={this.props.userId}>{this.props.playerName}</PageLink>
        } else {
            return null;
        }
    }
}

export default ReactRedux.connect(stateToProps)(LoginButton);