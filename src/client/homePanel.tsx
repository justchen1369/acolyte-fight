
import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import * as url from './url';
import { NameConfig } from '../client/nameConfig';
import { SpellConfig } from '../client/spellConfig';
import { isMobile } from './userAgent';

const scrollIntoView = require('scroll-into-view');

interface Props {
    room: string;
    server: string;
    newGameCallback: () => void;
}
interface State {
    joining: boolean;
}

export class HomePanel extends React.Component<Props, State> {
    private belowFoldElem: HTMLElement = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            joining: false,
        };
    }

    render() {
        return <div className="content-container">
            <div className="home">
                <div className="spacer" />
                <div className="title">Acolyte Fight!</div>
                <div className="spacer" />
                <div className="button-row">
                    {!this.state.joining && <span className="btn" onClick={() => this.props.newGameCallback()}>Play</span>}
                    {this.state.joining && <span className="btn disabled">Play</span>}
                </div>
                {this.props.room && <div className="private-room-indicator">
                    In private room: <b><a href={this.createRoomUrl()}>{this.props.room}</a></b> (<a href="?">exit room</a>)
                </div>}
                <div className="spacer" />
                <div className="fold-indicator" onClick={() => this.scrollBelowFold()}><i className="fa fa-chevron-down" /></div>
                <div className="spacer" />
            </div>
            <div className="page" ref={(elem) => this.belowFoldElem = elem}>
                <h1>Welcome Acolyte!</h1>
                <p>
                    Time to practice your skills.
                    In this arena, you'll find others just like you. Will you be the last one standing?
                </p>
                <NameConfig />
                <SpellConfig />
            </div>
        </div>;
    }

    private createRoomUrl() {
        return url.getPath({ room: this.props.room, server: this.props.server });
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