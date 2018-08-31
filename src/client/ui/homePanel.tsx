import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as ai from '../core/ai';
import * as pages from '../core/pages';
import * as url from '../url';
import { NameConfig } from './nameConfig';
import PlayButton from './playButton';
import SpellConfig from './spellConfig';
import NavBar from './navbar';
import PartyList from './partyList';

const scrollIntoView = require('scroll-into-view');

interface Props {
}
interface State {
}

class HomePanel extends React.Component<Props, State> {
    private belowFoldElem: HTMLElement = null;

    constructor(props: Props) {
        super(props);
        this.state = {
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
                    <PlayButton />
                </div>
                <div style={{ flexGrow: 0.1 }} />
                <PartyList />
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

export default HomePanel;