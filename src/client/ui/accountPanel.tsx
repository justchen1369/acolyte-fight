import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as ads from '../core/ads';
import * as cloud from '../core/cloud';
import * as pages from '../core/pages';
import * as url from '../url';

interface Props {
    loggedIn: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        loggedIn: state.loggedIn,
    };
}

export class LogoutPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return this.props.loggedIn ? this.renderLoggedIn() : null;
    }

    private renderLoggedIn() {
        const a = ads.getProvider();
        return <div>
            {!a.noLogin && <p><div className="btn" onClick={() => this.logout()}>Logout</div></p>}
        </div>
    }

    private logout() {
        cloud.logout().then(() => pages.changePage(''));
    }
}

export default ReactRedux.connect(stateToProps)(LogoutPanel);