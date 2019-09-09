import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as loader from '../core/loader';
import * as m from '../../shared/messages.model';
import * as parties from '../core/parties';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import * as watcher from '../core/watcher';
import Link from '../controls/link';
import OnlineSegmentListener from '../controls/onlineSegmentListener';
import PartyMemberList from './partyMemberList';
import WatchLooper from '../controls/watchLooper';

interface Props {
    selfId: string;
    numOnline: number;
    party: s.PartyState;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        selfId: state.socketId,
        numOnline: state.online.size,
        party: state.party,
    };
}

class WatchPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    componentDidMount() {
        this.activateObserverMode();
    }

    render() {
        return this.props.party ? this.renderParty() : this.renderNoParty();
    }

    private renderParty() {
        return <div>
            <h1>Spectate</h1>
            <div className="party-panel">
                <PartyMemberList />
            </div>
            <p>{this.props.numOnline} people playing right now.</p>
            {this.props.numOnline > 0 && <p className="loading-text">Searching for match to spectate...</p>} 
            <OnlineSegmentListener />
            <WatchLooper />
        </div>;
    }

    private renderNoParty() {
        return <div>
            <h1>Spectate</h1>
            <p>{this.props.numOnline} players online.</p>
            {this.renderStatus()}
            <OnlineSegmentListener />
            <WatchLooper />
        </div>;
    }

    private renderStatus() {
        if (this.props.numOnline > 0) {
            return <p className="loading-text">Searching for match to spectate...</p>
        } else {
            return <p>There are no live games to watch at the moment in this region, perhaps try another <Link page="regions">region</Link>?</p>
        }
    }

    private async activateObserverMode() {
        if (this.props.party) {
            try {
                await parties.makeObserverAsync(this.props.selfId, true);
            } catch (exception) {
                console.error("Failed to activate observer mode", exception);
            }
        }
    }
}

export default ReactRedux.connect(stateToProps)(WatchPanel);