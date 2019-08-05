import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as loader from '../core/loader';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import * as rankings from '../core/rankings';
import * as watcher from '../core/watcher';
import Link from '../controls/link';
import OnlineSegmentListener from '../controls/onlineSegmentListener';
import WatchLooper from '../controls/watchLooper';

interface Props {
    profile: m.GetProfileResponse;
    isLoggedIn: boolean;
    allowedToWatch: boolean;
    numMatches: number;
    numOnline: number;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        profile: state.profile,
        isLoggedIn: state.loggedIn,
        numMatches: watcher.numMatches(state),
        allowedToWatch: watcher.allowedToWatch(state),
        numOnline: state.online.size,
    };
}

class WatchPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            statsRetrieved: false,
        };
    }

    componentWillMount() {
        this.retrieveStatsIfNecessary();
    }

    private async retrieveStatsIfNecessary() {
        if (!this.props.profile) {
            await loader.loaded();
            await rankings.retrieveMyStatsAsync();
            this.setState({ statsRetrieved: true });
        }
    }

    render() {
        if (this.props.isLoggedIn) {
            if (!this.props.profile) {
                return this.renderLoadingStats();
            } else if (this.props.allowedToWatch) {
                return this.renderWatching();
            } else {
                return this.renderNotAllowedYet();
            }
        } else {
            return this.renderNotLoggedIn();
        }
    }

    private renderNotLoggedIn() {
        return <div>
            <h1>Spectate</h1>
            <p className="login-ad"><div className="btn" onClick={() => window.location.href = "login"}>Login</div> to spectate live matches.</p>
        </div>;
    }

    private renderLoadingStats() {
        return <div>
            <h1>Spectate</h1>
            <p className="loading-text">Loading...</p>
        </div>;
    }

    private renderNotAllowedYet() {
        return <div>
            <h1>Spectate</h1>
            <p>Watch all live games here!</p>
            <p>Spectator mode is only available to players who have played more than 1000 PvP matches. <Link page="profile">You have played {this.props.numMatches} matches.</Link></p>
        </div>;
    }

    private renderWatching() {
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