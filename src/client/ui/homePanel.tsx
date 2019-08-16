import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as options from '../options';
import * as url from '../url';
import Button from '../controls/button';
import NameConfig from './nameConfig';
import PlayButton from './playButton';
import SocialBar from '../controls/socialBar';
import SpellBtnConfig from './spellConfig';
import Link from '../controls/link';
import NavBar from '../nav/navbar';
import PartyList from './partyList';
import TitleListener from '../controls/titleListener';

const scrollIntoView = require('scroll-into-view');

interface Props {
    isLoggedIn: boolean;
    titleLeft: string;
    titleRight: string;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        isLoggedIn: state.loggedIn,
        titleLeft: state.room.settings.Mod.titleLeft,
        titleRight: state.room.settings.Mod.titleRight,
    };
}

class HomePanel extends React.PureComponent<Props, State> {
    private belowFoldElem: HTMLElement = null;

    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const a = options.getProvider();

        return <div className="content-container">
            <div className="home">
                <TitleListener />
                <NavBar />
                <div className="spacer" />
                <div className="title-row">
                    <video autoPlay muted loop>
                        <source src={`${url.base}/cdn/videos/AcolyteFight5.m4v`} type="video/mp4" />
                    </video>
                    <div className="title"><span className="title-left">{this.props.titleLeft}</span> <span className="title-right">{this.props.titleRight}</span></div>
                    <div className="mask"></div>
                </div>
                <div className="spacer" />
                <div className="primary-button-row button-row">
                    <PlayButton />
                </div>
                <div className="secondary-button-row button-row">
                    <Button onClick={() => this.scrollBelowFold()}>Choose Spells</Button>
                </div>
                <div style={{ flexGrow: 0.1 }} />
                {!a.noPartyLink && <PartyList />}
                <div className="spacer" />
                <div style={{ flexGrow: 0.1 }} />
                {!a.noExternalLinks && <div className="more-io-games">
                    <a href="https://iogames.space">More .io Games</a>
                    <a href="http://io-games.zone">IO Games</a>
                </div>}
                {!a.noExternalLinks && <SocialBar />}
            </div>
            <div className="page" ref={(elem) => this.belowFoldElem = elem}>
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

export default ReactRedux.connect(stateToProps)(HomePanel);