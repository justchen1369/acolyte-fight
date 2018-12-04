import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as ads from '../core/ads';
import * as url from '../url';
import ControlsPanel from './controlsPanel';
import NameConfig from './nameConfig';
import PlayButton from './playButton';
import SocialBar from './socialBar';
import SpellBtnConfig from './spellConfig';
import Link from './link';
import NavBar from './navbar';
import PartyList from './partyList';

const scrollIntoView = require('scroll-into-view');

interface Props {
    isLoggedIn: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        isLoggedIn: state.loggedIn,
    };
}

class HomePanel extends React.Component<Props, State> {
    private belowFoldElem: HTMLElement = null;

    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const a = ads.getProvider();

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
                {!a.noExternalLinks && <PartyList />}
                <div className="spacer" />
                {!a.noScrolling && <div className="fold-indicator" onClick={() => this.scrollBelowFold()}>
                    <div className="fold-info">choose spells</div>
                    <div className="fold-arrow"><i className="fa fa-chevron-down" /></div>
                </div>}
                <div style={{ flexGrow: 0.1 }} />
                {!a.name && <div className="more-io-games"><a href="https://iogames.space">More .io Games</a></div>}
                {!a.noExternalLinks && <SocialBar />}
            </div>
            {!a.noScrolling && <div className="page" ref={(elem) => this.belowFoldElem = elem}>
                <h1>Welcome Acolyte!</h1>
                <p>
                    Time to practice your skills.
                    In this arena, you'll find others just like you. Will you be the last one standing?
                </p>
                <h2>Your Name</h2>
                <NameConfig />
                <h1>Your Spells</h1>
                <SpellBtnConfig />
                <h1>More Settings</h1>
                <p className="view-more-ad">Go to <Link page="settings">Settings</Link> for more settings</p>
            </div>}
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

export default ReactRedux.connect(stateToProps)(HomePanel);