import * as React from 'react';
import { Hero } from '../game/settings';
import * as m from '../game/messages.model';

interface Props {
}

interface State {
    roomUrl: string;
}

function retrieveLocationAsync() {
    return fetch('location', { credentials: "same-origin" })
        .then(res => res.json())
        .then((msg: m.LocationMsg) => msg);
}

export class TitleSection extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            roomUrl: null,
        };
    }

    componentDidMount() {
        retrieveLocationAsync().then(locationMsg => {
            const room = Math.floor(Math.random() * 1e9).toString(36);
            const server = locationMsg.currentServer;

            let roomUrl = `play?room=${room}`;
            if (locationMsg.currentServer) {
                roomUrl = `${roomUrl}&server=${encodeURIComponent(server)}`;
            }
            this.setState({ roomUrl });
        }).catch((error) => {
            console.error("Unable to generate room URL", error);
        });
    }

    render() {
        return <div>
            <h1 className="title">Acolyte Fight!</h1>
            <p>
                Welcome <b>Acolyte</b>! Time to practice your skills.
                In this arena, you'll find others just like you. Will you be the last one standing?
            </p>
            <p>
                This is a game of skillshots. To land spells, you've got to successfully predict how your enemy will move.
                This game is about skill, not about secret combos! Acolytes who use all the spells badly will be overpowered by those who only use a simple fireball accurately and dodge well.
                Acolytes become more dangerous as they lose health - dealing up to {1 + Hero.AdditionalDamageMultiplier}x more damage!
                This means you can always make a comeback, just keep dodging and aim carefully!
            </p>
            <h1>Credits</h1>
            <p><b>Acolyte Fight!</b> was created by <b><a href="https://twitter.com/raysplacenspace" target="_blank">raysplaceinspace</a></b> and was inspired by <a href="http://www.warlockbrawl.com/" target="_blank">Warlocks</a>, originally created by <b>Zymoran</b> and <b>Adynathos</b>.</p>
            <p>
                <ul>
                    <li>Icons created by <a href="http://lorcblog.blogspot.com/" target="_blank">Lorc</a> used under Creative Commons license from <a href="http://game-icons.net" target="_blank">Game-icons.net</a>.</li>
                    <li>Icons created by <a href="https://opengameart.org/content/95-game-icons" target="_blank">sbed</a> used under Creative Commons license from <a href="http://game-icons.net" target="_blank">Game-icons.net</a>.</li>
                    <li>RPG Awesome font used under <a href="https://github.com/nagoshiashumari/Rpg-Awesome" target="_blank">CC 3.0, SIL and MIT license</a>.</li>
                    <li>Font Awesome used under <a href="https://fontawesome.com/license" target="_blank">CC 4.0, SIL and MIT license</a>.</li>
                </ul>
            </p>
            <h1>Privacy Policy</h1>
            <p>
                Replays and game stats are collected are collected for the purpose of balancing the game and making it better.
                Your user profile is stored via cookies and browser local storage.
                No data is given to third parties.
            </p>
        </div>;
    }
}