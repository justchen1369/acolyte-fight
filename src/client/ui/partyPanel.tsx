import * as React from 'react';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as url from '../core/url';

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
            {this.props.party ? this.renderCurrentParty() : this.renderNoParty()}
            <h1>Community</h1>
            <p className="share"><a href="https://discord.gg/sZvgpZk" target="_blank"><i className="fab fa-discord" /><span>Join the chat on Discord!</span></a></p>
            <p className="share"><a href="http://twitter.com/acolytefight" target="_blank"><i className="fab fa-twitter-square" /><span>@acolytefight</span></a></p>
            <p className="share"><a href="http://facebook.com/acolytefight" target="_blank"><i className="fab fa-facebook" /><span>fb.com/acolytefight</span></a></p>
        </div>
    }

    private renderNoParty() {
        return <div>
            <p>Play together with friends as a party. Forming a party ensures that you and your friends are matched to the same game.</p>
            <p><span className={this.state.creating ? "btn btn-disabled" : "btn"} onClick={() => this.onCreatePartyClick()}>Create Party</span></p>
        </div>
    }

    private renderCurrentParty() {
        const currentPartyPath = url.getPartyHomePath(this.props.current);
        return <div>
            <p><b>Currently in party:</b> <span>{this.props.party.members.map(m => m.name).join(", ")}</span></p>
            <p>Invite friends to join your party by sending them this link:</p>
            <p><input className="share-url" type="text" value={window.location.origin + currentPartyPath} readOnly onFocus={ev => ev.target.select()} /></p>
            <p><span className="btn" onClick={() => this.onLeavePartyClick()}>Leave Party</span></p>
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