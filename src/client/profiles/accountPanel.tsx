import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
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

export class AccountPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return this.props.loggedIn ? this.renderLoggedIn() : null;
    }

    private renderLoggedIn() {
        const a = options.getProvider();
        return <div>
            {!a.noLogin && <div className="btn" onClick={() => this.logout()}>Logout</div>}
        </div>
    }

    private logout() {
        cloud.logout().then(() => pages.changePage(''));
    }
}

export default ReactRedux.connect(stateToProps)(AccountPanel);