
import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import { NameConfig } from '../client/nameConfig';
import { SpellConfig } from '../client/spellConfig';
import { isMobile } from './userAgent';

const scrollIntoView = require('scroll-into-view');

interface Props {
    room: string;
    newGameCallback: () => void;
}
interface State {
}

export class HomePanel extends React.Component<Props, State> {
    private belowFoldElem: HTMLElement = null;

    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div className="content-container">
            <div className="home">
                <div className="spacer" />
                <div className="title">Acolyte Fight!</div>
                <div className="spacer" />
                <div className="button-row">
                    <span className="btn primary" onClick={() => this.props.newGameCallback()}>Play</span>
                </div>
                {this.props.room && <div className="private-room-indicator">In private room: <b>{this.props.room}</b> (<a href="?">exit room</a>)</div>}
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

    private scrollBelowFold() {
        if (this.belowFoldElem) {
            scrollIntoView(this.belowFoldElem, {
                time: 500,
                align: { top: 0 },
            });
        }
    }
}