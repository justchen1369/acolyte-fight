import classNames from 'classnames';
import QRious from 'qrious';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as regions from '../core/regions';
import * as screenLifecycle from './screenLifecycle';
import * as url from '../url';
import Link from '../controls/link';
import PartyGameList from './partyGameList';
import PartyMemberControl from './partyMemberControl';

interface Props {
    selfId: string
    current: s.PathElements;
    party: s.PartyState;
    maxPlayers: number;
}
interface State {
    loading: boolean;
    advanced: boolean;
    error: string;
}

function stateToProps(state: s.State): Props {
    return {
        selfId: state.socketId,
        current: state.current,
        party: state.party,
        maxPlayers: state.room.settings.Matchmaking.MaxPlayers,
    };
}

function PartyMode(props: { selected: boolean, onClick: () => void, children?: React.ReactFragment }) {
    const className = classNames({
        'party-mode-row': true,
        'party-mode-selected': props.selected,
    });
    return <div className={className} onClick={props.onClick}>
        {props.selected && <i className="check-icon fas fa-check-square" />} 
        {!props.selected && <i className="check-icon fas fa-square" />}
        {props.children}
    </div>
}

export class PartyPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            loading: false,
            advanced: false,
            error: null,
        };
    }

    render() {
        return <div className="party-panel">
            <h1>Party</h1>
            {this.props.party ? this.renderCurrentParty() : this.renderNoParty()}
        </div>
    }

    private renderNoParty() {
        return <div>
            <p>
                Play together with friends as a party. Forming a party ensures that you and your friends are matched to the same game.
            </p>
            <p><span className={this.state.loading ? "btn btn-disabled" : "btn"} onClick={() => parties.createPartyAsync()}>Create Party</span></p>
        </div>
    }

    private renderCurrentParty() {
        const party = this.props.party;
        const currentPartyPath = url.getPath({ ...this.props.current, page: null, party: party.id, server: null, gclid: null });
        const self = party.members.find(m => m.socketId === this.props.selfId);
        if (!self) {
            return this.renderNoParty();
        }

        const origin = regions.getOrigin(party.region);
        const partyUrl = origin + currentPartyPath;
        return <div>
            <p>Forming a party ensures that you and your friends are matched to the same game. Invite friends to join your party by sending them this link, or ask them to scan the QR code with their phone camera:</p>
            <p><input className="share-url" type="text" value={partyUrl} readOnly onFocus={ev => ev.target.select()} /></p>
            <canvas className="party-qr" ref={(elem) => this.renderQR(elem, partyUrl)} />
            <p><span className="btn" onClick={() => this.onLeaveParty()}>Leave Party</span></p>
            {this.props.party.members.length >= this.props.maxPlayers && <p>If your party is larger than {this.props.maxPlayers} players, the party will be split across multiple games.</p>}
            {this.props.party.roomId !== m.DefaultRoomId && <p>A <Link page="modding">mod</Link> is active for your party. This can be controlled by the party leader.</p>}
            <div className="clear" />
            {this.renderPartyMode()}
            {this.renderAdvancedIndicator()}
            {this.state.advanced && this.renderAdvancedSettings()}
            <h1>Players</h1>
            <div className="party-list">
                {party.members.map(m => <PartyMemberControl
                    key={m.socketId}
                    member={m}
                    editable={self.isLeader || (!party.isLocked && m.socketId === self.socketId)}
                    isSelf={m.socketId === self.socketId}
                    showAll={true}
                />)}
            </div>
            <h1>Games</h1>
            <PartyGameList partyId={party.id} />
        </div>
    }

    private renderQR(element: HTMLCanvasElement, partyUrl: string) {
        new QRious({ element, value: partyUrl, size: 192 });
    }

    private renderPartyMode() {
        const party = this.props.party;
        return <div>
            <h2>Party mode</h2>
            <PartyMode selected={!party.isPrivate} onClick={() => this.updateSettings({ isPrivate: false })} >
                <span className="party-mode-label"><b>Public</b>: your party will be matched with other players on the public server.</span>
            </PartyMode>
            <PartyMode selected={party.isPrivate} onClick={() => this.updateSettings({ isPrivate: true })} >
                <span className="party-mode-label"><b>Private</b>: your games will only contain the players in your party.</span>
            </PartyMode>
        </div>
    }

    private renderAdvancedIndicator() {
        if (this.state.advanced) {
            return <div className="btn" onClick={() => this.setState({ advanced: false })}>
                <i className="fas fa-chevron-up" /> Hide Advanced Settings
            </div>
        } else {
            return <div className="btn" onClick={() => this.setState({ advanced: true })}>
                <i className="fas fa-chevron-down" /> Show Advanced Settings
            </div>
        }
    }

    private renderAdvancedSettings() {
        const party = this.props.party;
        return <div>
            <>
                <h3>Who can play?</h3>
                <PartyMode selected={!party.isLocked} onClick={() => this.updateSettings({ isLocked: false })} >
                    <span className="party-mode-label"><b>Everyone</b>: all players can freely change between playing and observing.</span>
                </PartyMode>
                <PartyMode selected={party.isLocked} onClick={() => this.updateSettings({ isLocked: true })} >
                    <span className="party-mode-label"><b>Leader decides</b>: only the party leader can decide who plays and observes.</span>
                </PartyMode>
            </>
            <>
                <h3>Default to playing or observing?</h3>
                <PartyMode selected={!party.initialObserver} onClick={() => this.updateSettings({ initialObserver: false })} >
                    <span className="party-mode-label"><b>Playing</b>: players who join the party begin as players.</span>
                </PartyMode>
                <PartyMode selected={party.initialObserver} onClick={() => this.updateSettings({ initialObserver: true })} >
                    <span className="party-mode-label"><b>Observing</b>: players who join the party begin as observers.</span>
                </PartyMode>
            </>
            {party.isPrivate && <>
                <h3>When to start games?</h3>
                <PartyMode selected={!party.waitForPlayers} onClick={() => this.updateSettings({ waitForPlayers: false })} >
                    <span className="party-mode-label"><b>Start immediately</b>: players join the game immediately. If they start playing, other players may have to wait until the next game.</span>
                </PartyMode>
                <PartyMode selected={party.waitForPlayers} onClick={() => this.updateSettings({ waitForPlayers: true })} >
                    <span className="party-mode-label"><b>Wait for all players</b>: wait until all players are ready before adding them to the game. Useful for tournaments.</span>
                </PartyMode>
            </>}
        </div>
    }

    private async updateSettings(settings: Partial<m.PartySettingsRequest>) {
        const self = this.props.party.members.find(m => m.socketId === this.props.selfId);
        if (self.isLeader) {
            parties.updatePartySettingsAsync({
                partyId: this.props.party.id,
                ...settings,
            });
        }
    }

    private async onLeaveParty() {
        await parties.leavePartyAsync();
        pages.changePage("");
    }
}

export default ReactRedux.connect(stateToProps)(PartyPanel);