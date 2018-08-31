import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as url from '../url';

interface Props {
    current: s.PathElements;
    party: s.PartyState;
}
interface State {
    loading: boolean;
    error: string;
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        party: state.party,
    };
}

export class PartyPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
        };
    }

    render() {
        return <div>
            <h1>Party</h1>
            {this.props.party ? this.renderCurrentParty() : this.renderNoParty()}
        </div>
    }

    private renderNoParty() {
        return <div>
            <p>Play together with friends as a party. Forming a party ensures that you and your friends are matched to the same game.</p>
            <p><span className={this.state.loading ? "btn btn-disabled" : "btn"} onClick={() => parties.createPartyAsync()}>Create Party</span></p>
        </div>
    }

    private renderCurrentParty() {
        const currentPartyPath = parties.getPartyHomePath(this.props.current);
        return <div>
            <p>Forming a party ensures that you and your friends are matched to the same game. Invite friends to join your party by sending them this link:</p>
            <p><input className="share-url" type="text" value={window.location.origin + currentPartyPath} readOnly onFocus={ev => ev.target.select()} /></p>
            <p><span className="btn" onClick={() => parties.leavePartyAsync()}>Leave Party</span></p>
            {this.props.party.isPrivate ? this.renderPrivateParty() : this.renderPublicParty()}
            <h2>Observer Mode {this.props.party.observing ? <i className="fas fa-eye" /> : <i className="fas fa-eye-slash" />}</h2>
            <p>Observer mode lets you join the party games as an observer.</p>
            {this.props.party.observing
                ? <p><span className="btn" onClick={() => parties.updatePartyAsync({ ready: false, observing: false })}>Deactivate Observer Mode</span></p>
                : <p><span className="btn" onClick={() => parties.updatePartyAsync({ ready: false, observing: true })}>Activate Observer Mode</span></p>}
        </div>
    }

    private renderPrivateParty() {
        return <div>
            <h2>Private Party <i className="fas fa-lock" /></h2>
            <p>Your party is <b>private</b>: your games will only contain the players in your party.</p>
            <p><span className={this.state.loading ? "btn btn-disabled" : "btn"} onClick={() => parties.privatePartyAsync(false)}>Make Public</span></p>
        </div>
    }

    private renderPublicParty() {
        return <div>
            <h2>Private Party <i className="fa fa-lock-open" /> </h2>
            <p>Your party is <b>public</b>: your party will be matched with other players on the public server.</p>
            <p><span className={this.state.loading ? "btn btn-disabled" : "btn"} onClick={() => parties.privatePartyAsync(true)}>Make Private</span></p>
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(PartyPanel);