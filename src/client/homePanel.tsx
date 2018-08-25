import * as React from 'react';
import * as ai from './ai';
import * as w from '../game/world.model';
import * as url from './url';
import * as screenLifecycle from './screenLifecycle';
import { NameConfig } from '../client/nameConfig';
import { SpellConfig } from '../client/spellConfig';
import { NavBar } from './navbar';

const scrollIntoView = require('scroll-into-view');

interface Props {
    current: url.PathElements;
    world: w.World;
    changePage: (newPage: string) => void;
    newGameCallback: () => void;
}
interface State {
    playingAsAI: boolean;
    joining: boolean;
}

export class HomePanel extends React.Component<Props, State> {
    private belowFoldElem: HTMLElement = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            playingAsAI: ai.playingAsAI(this.props.world.allowBots),
            joining: false,
        };
    }

    render() {
        return <div className="content-container">
            <div className="home">
                <NavBar current={this.props.current} changePage={this.props.changePage} />
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
                    <span className={this.state.joining ? "btn btn-disabled" : "btn"} onClick={(ev) => this.onPlayClicked(ev)}>{this.state.playingAsAI ? "Play as AI" : "Play"}</span>
                </div>
                {this.props.current.room && <div className="private-room-indicator">
                    In private room: <b><a href={this.getRoomDetailsUrl()} onClick={(ev) => this.onRoomDetailsClick(ev)}>{this.props.current.room}</a></b>
                </div>}
                <div className="spacer" />
                <div className="fold-indicator" onClick={() => this.scrollBelowFold()}>
                    <div className="fold-info">choose spells</div>
                    <div className="fold-arrow"><i className="fa fa-chevron-down" /></div>
                </div>
                <div style={{ flexGrow: 0.1 }} />
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
                <SpellConfig settings={this.props.world.settings} />
            </div>
        </div>;
    }

    private onPlayClicked(ev: React.MouseEvent) {
        if (this.state.joining) {
            return;
        }
        this.setState({ joining: true });
        screenLifecycle.enterGame();
        this.props.newGameCallback();
    }

    private getRoomDetailsUrl() {
        return url.getPath(Object.assign({}, this.props.current, { page: "share" }));
    }

    private onRoomDetailsClick(ev: React.MouseEvent<HTMLAnchorElement>) {
        ev.preventDefault();
        return this.props.changePage("share");
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