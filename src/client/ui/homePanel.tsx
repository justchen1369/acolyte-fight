import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as ai from '../core/ai';
import * as pages from '../core/pages';
import * as url from '../url';
import { NameConfig } from './nameConfig';
import { PlayButton } from './playButton';
import { SpellConfig } from './spellConfig';
import NavBar from './navbar';

const scrollIntoView = require('scroll-into-view');

interface Props {
    current: s.PathElements;
    party: s.PartyState;
    settings: AcolyteFightSettings;
    playingAsAI: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        party: state.party,
        settings: state.world.settings,
        playingAsAI: ai.playingAsAI(state),
    };
}

class HomePanel extends React.Component<Props, State> {
    private belowFoldElem: HTMLElement = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            playingAsAI: ai.playingAsAI(),
        };
    }

    render() {
        return <div className="content-container">
            <div className="home">
                <NavBar />
                <div className="spacer" />
                <div className="title-row">
                    <video autoPlay muted loop>
                        <source src="static/video/AcolyteFight1.mp4" type="video/mp4" />
                    </video>
                    <div className="title">Acolyte Fight!</div>
                    <div className="mask"></div>
                </div>
                <div className="spacer" />
                <div className="button-row">
                    <PlayButton
                        label={this.props.playingAsAI ? "Play as AI" : "Play"}
                        party={this.props.party}
                    />
                </div>
                <div style={{ flexGrow: 0.1 }} />
                {this.props.party ? this.renderParty() : this.renderNoParty()}
                <div className="spacer" />
                <div className="fold-indicator" onClick={() => this.scrollBelowFold()}>
                    <div className="fold-info">choose spells</div>
                    <div className="fold-arrow"><i className="fa fa-chevron-down" /></div>
                </div>
                <div style={{ flexGrow: 0.1 }} />
                <div className="social-bar">
                    <a href="http://facebook.com/acolytefight" target="_blank" title="Facebook"><i className="fab fa-facebook" /></a>
                    <a href="http://twitter.com/acolytefight" target="_blank" title="Twitter"><i className="fab fa-twitter-square" /></a>
                    <a href="https://discord.gg/sZvgpZk" target="_blank" title="Chat on Discord!"><i className="fab fa-discord" /></a>
                </div>
            </div>
            <div className="page" ref={(elem) => this.belowFoldElem = elem}>
                <h1>Welcome Acolyte!</h1>
                <p>
                    Time to practice your skills.
                    In this arena, you'll find others just like you. Will you be the last one standing?
                </p>
                <h2>Your Name</h2>
                <NameConfig />
                <h1>Your Spell Configuration</h1>
                <SpellConfig settings={this.props.settings} />
            </div>
        </div>;
    }

    private renderParty() {
        return <div className="party-list">
            <b>Current party (<a href={this.getPartyDetailsUrl()} onClick={(ev) => this.onPartyDetailsClick(ev)}>settings</a>): </b>
            {" "}
            {this.props.party.members.map(member => this.renderMember(member))}
        </div>
    }

    private renderNoParty() {
        return <div className="party-invite">Invite friends to <b><a href={this.getPartyDetailsUrl()} onClick={ev => this.onPartyDetailsClick(ev)}>party</a>!</b></div>
    }

    private renderMember(member: w.PartyMemberState) {
        return <div className={member.ready ? "party-member party-member-ready" : "party-member party-member-not-ready"} title={`${member.name}: ${member.ready ? "Ready" : "Not Ready"}`}>
            {member.ready ? <i className="fas fa-check-square" /> : <i className="fas fa-square" />} 
            <span className="party-member-name">{member.name}</span>
        </div>
    }

    private getPartyDetailsUrl() {
        return url.getPath(Object.assign({}, this.props.current, { page: "party" }));
    }

    private onPartyDetailsClick(ev: React.MouseEvent<HTMLAnchorElement>) {
        ev.preventDefault();
        pages.changePage("party");
    }

    private scrollBelowFold() {
        if (this.belowFoldElem) {
            scrollIntoView(this.belowFoldElem, {
                time: 500,
                align: { top: 0 },
            });
        }
    }
}

export default ReactRedux.connect(stateToProps)(HomePanel);