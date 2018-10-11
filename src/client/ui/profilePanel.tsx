import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as pages from '../core/pages';
import * as url from '../url';

interface Props {
    current: s.PathElements;
    loggedIn: boolean;
    playerName: string;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        loggedIn: !!state.userId,
        playerName: state.playerName,
    };
}

export class ProfilePanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            leaderboard: null,
            error: null,
        };
    }

    render() {
        return this.props.loggedIn ? this.renderLoggedIn() : null;
    }

    private renderLoggedIn() {
        return <div>
            <h1>{this.props.playerName}</h1>
            <p><div className="btn" onClick={() => this.logout()}>Logout</div></p>
        </div>
    }

    private logout() {
        cloud.logout().then(() => pages.changePage(''));
    }
}

export default ReactRedux.connect(stateToProps)(ProfilePanel);