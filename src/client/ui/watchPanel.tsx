import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import * as watcher from '../core/watcher';
import Link from '../controls/link';
import OnlineSegmentListener from '../controls/onlineSegmentListener';
import WatchLooper from '../controls/watchLooper';

interface Props {
    isLoggedIn: boolean;
    numOnline: number;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        isLoggedIn: state.loggedIn,
        numOnline: state.online.size,
    };
}

class WatchPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return this.props.isLoggedIn ? this.renderLoggedIn() : this.renderNotLoggedIn();
    }

    private renderNotLoggedIn() {
        return <div>
            <h1>Spectate</h1>
            <p className="login-ad"><div className="btn" onClick={() => window.location.href = "login"}>Login</div> to spectate live matches.</p>
        </div>;
    }

    private renderLoggedIn() {
        return <div>
            <h1>Spectate</h1>
            <p>{this.props.numOnline} players online.</p>
            {this.props.numOnline > 0 ? <>
                <p className="loading-text">Searching for match to spectate...</p>
            </> : <>
                <p>There are no live games to watch at the moment in this region, perhaps try another <Link page="regions">region</Link>?</p>
            </>}
            <OnlineSegmentListener />
            <WatchLooper />
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(WatchPanel);