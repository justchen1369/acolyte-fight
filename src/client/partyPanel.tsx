import * as React from 'react';
import * as facade from './facade';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as url from './url';

interface Props {
    current: url.PathElements;
    changePage: (newPage: string) => void;

    mod: Object;
    allowBots: boolean;

    party: s.PartyState;
    createPartyCallback: () => void;
    leavePartyCallback: (partyId: string) => void;
}
interface State {
    creating: boolean;
    error: string;
}

export class PartyPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            creating: false,
            error: null,
        };
    }

    render() {
        return <div>
            <h1>Party</h1>
            <p>Play together with friends by creating a party.</p>
            {this.props.party ? this.renderCurrentParty() : this.renderNoParty()}
        </div>
    }

    private renderNoParty() {
        return <div>
            <p><span className={this.state.creating ? "btn btn-disabled" : "btn"} onClick={() => this.onCreatePartyClick()}>Create Party</span></p>
        </div>
    }

    private renderCurrentParty() {
        const currentPartyPath = url.getPartyHomePath(this.props.current);
        return <div>
            <p><input className="share-url" type="text" value={window.location.origin + currentPartyPath} readOnly onFocus={ev => ev.target.select()} /></p>
            <p><span className="btn" onClick={() => this.onLeavePartyClick()}>Leave Party</span></p>
            <h2>Party members</h2>
            <p><b>Currently in party:</b> <span>{this.props.party.members.map(m => m.name).join(", ")}</span></p>
            <h2>Party modifications</h2>
            {Object.keys(this.props.mod).length > 0
                ? <p>
                    The following modifications are active in this room:
                    <textarea className="mod-json">{JSON.stringify(this.props.mod, null, 2)}</textarea>
                </p>
                : <p>No <a href="modding" onClick={(ev) => this.anchorClick(ev, "modding")}>modifications</a> are in effect in this party.</p>}
            <h2>Bots</h2>
            <p><a href="ai" onClick={(ev) => this.anchorClick(ev, "ai")}>Bots</a> are {this.props.allowBots ? "allowed" : "not allowed"} in this party.</p>
        </div>
    }

    private onCreatePartyClick() {
        const party = this.props.party;
        if (!party) {
            this.props.createPartyCallback();
        }
    }

    private onLeavePartyClick() {
        const party = this.props.party;
        if (party) {
            this.props.leavePartyCallback(party.id);
        }
    }

    private anchorClick(ev: React.MouseEvent<HTMLAnchorElement>, newPage: string) {
        ev.preventDefault();
        this.props.changePage(newPage);
    }
}