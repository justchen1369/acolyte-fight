import classNames from 'classnames';
import QRious from 'qrious';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as regions from '../core/regions';
import * as screenLifecycle from './screenLifecycle';
import * as url from '../url';
import Link from '../controls/link';
import PartyGameList from './partyGameList';
import PartyMemberList from './partyMemberList';
import './partyPanel.scss';

enum PartyModeType {
    Room = "room",
    Teams = "party",
    Tournament = "tournament",
}

interface Props {
    selfId: string
    current: s.PathElements;
    party: s.PartyState;
    maxPlayers: number;
}
interface State {
    loading: boolean;
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

function PartyMode(props: { showAll: boolean, selected: boolean, onClick: () => void, children?: React.ReactFragment }) {
    if (!(props.showAll || props.selected)) {
        return null;
    }

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
            {this.renderPartySettings(self.isLeader)}
            {this.renderObserving(self)}
            <h1>Players</h1>
            <PartyMemberList />
            <h1>Games</h1>
            <PartyGameList partyId={party.id} />
        </div>
    }

    private renderQR(element: HTMLCanvasElement, partyUrl: string) {
        new QRious({ element, value: partyUrl, size: 192 });
    }

    private renderPartySettings(showAll: boolean) {
        const party = this.props.party;

        let partyMode: PartyModeType;
        if (!party.waitForPlayers) {
            partyMode = PartyModeType.Room;
        } else if (!party.isLocked) {
            partyMode = PartyModeType.Teams;
        } else {
            partyMode = PartyModeType.Tournament;
        }

        return <div>
            <>
                <h2>Party mode</h2>
                <PartyMode showAll={showAll} selected={partyMode === PartyModeType.Room} onClick={() => this.updateSettings({ initialObserver: false, isLocked: false, waitForPlayers: false })} >
                    <span className="party-mode-label"><b>Open</b> <i className="fas fa-sword" />: players join the game immediately, no waiting.</span>
                </PartyMode>
                <PartyMode showAll={showAll} selected={partyMode === PartyModeType.Teams} onClick={() => this.updateSettings({ initialObserver: false, isLocked: false, waitForPlayers: true })} >
                    <span className="party-mode-label"><b>Teams</b> <i className="fas fa-flag" />: wait until all players are ready before adding them to the game. Players may choose their teams.</span>
                </PartyMode>
                <PartyMode showAll={showAll} selected={partyMode === PartyModeType.Tournament} onClick={() => this.updateSettings({ initialObserver: true, isLocked: true, waitForPlayers: true })} >
                    <span className="party-mode-label"><b>Tournament</b> <i className="fas fa-trophy" />: only the party leader decides who can play and what the teams are. Everyone else observes.</span>
                </PartyMode>
            </>
        </div>
    }

    private renderObserving(self: s.PartyMemberState) {
        const party = this.props.party;
        if (!party.isLocked || self.isLeader) {
            if (self.isObserver) {
                return <div>
                    <h2>Observer Mode: On <i className="fas fa-eye" /></h2>
                    <p>You are <b>observing</b>.</p>
                    <p><span className="btn" onClick={() => parties.makeObserverAsync(self.socketId, false)}><i className="fas fa-gamepad" /> Switch to Playing Mode</span></p>
                </div>
            } else {
                return <div>
                    <h2>Observer Mode: Off <i className="fas fa-gamepad" /></h2>
                    <p>You are <b>playing</b>.</p>
                    <p><span className="btn" onClick={() => parties.makeObserverAsync(self.socketId, true)}><i className="fas fa-eye" /> Switch to Observer Mode</span></p>
                </div>
            }
        } else {
            return null;
        }
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