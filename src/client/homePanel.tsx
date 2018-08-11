import * as React from 'react';
import * as url from './url';
import * as screenLifecycle from './screenLifecycle';
import { NameConfig } from '../client/nameConfig';
import { SpellConfig } from '../client/spellConfig';

const scrollIntoView = require('scroll-into-view');

interface Props {
    current: url.PathElements;
    changePage: (newPage: string) => void;
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
                    <span className={this.state.joining ? "btn btn-disabled" : "btn"} onClick={(ev) => this.onPlayClicked(ev)}>Play</span>
                </div>
                {this.props.current.room && <div className="private-room-indicator">
                    In private room: <b><a href={this.getCurrentRoomUrl()}>{this.props.current.room}</a></b> (<a href={this.getRoomDetailsUrl()} onClick={(ev) => this.onRoomDetailsClick(ev)}>details</a>)
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

    private onPlayClicked(ev: React.MouseEvent) {
        if (this.state.joining) {
            return;
        }
        this.setState({ joining: true });
        screenLifecycle.enterGame();
        this.props.newGameCallback();
    }

    private getCurrentRoomUrl() {
        return url.getPath(Object.assign({}, this.props.current, { page: null, gameId: null }));
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