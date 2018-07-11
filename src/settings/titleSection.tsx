import * as React from 'react';
import * as m from '../game/messages.model';

interface Props {
}

interface State {
    roomUrl: string;
    more: boolean;
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
            more: false,
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
            <h1 className="title">Welcome to Arcane Enigma!</h1>
            <p>
                To win, be the last one standing. 
                You deal more damage as your health gets lower,
                so don't give up, you can always win!
                This game is all about skillshots - those with the best aiming and dodging will prevail. {!this.state.more && <a href="#" onClick={() => this.showMore()}>Show more...</a>}
            </p>
            {this.state.more && this.renderMore()}
            <h2>Share this game</h2>
            <p>
                {this.state.roomUrl
                ? <a href={this.state.roomUrl} target="_blank">Click here to create a private room.</a>
                : <span>Generating private room URL...</span>}
                {' '}
                Share this link with your friends to play against them!</p>
        </div>;
    }

    private renderMore() {
        return <div>
            <h2>Credits</h2>
            <p><b>Arcane Enigma</b> was created by <b>Ray Hidayat</b> and was inspired by <a href="http://www.warlockbrawl.com/" target="_blank">Warlocks</a>, originally created by <b>Zymoran</b> and <b>Adynathos</b>.</p>
            <p>
                <ul>
                    <li>Icons created by <a href="http://lorcblog.blogspot.com/" target="_blank">Lorc</a> used under Creative Commons license from <a href="http://game-icons.net" target="_blank">Game-icons.net</a>.</li>
                    <li>Icons created by <a href="https://opengameart.org/content/95-game-icons" target="_blank">sbed</a> used under Creative Commons license from <a href="http://game-icons.net" target="_blank">Game-icons.net</a>.</li>
                    <li>RPG Awesome font used under <a href="https://github.com/nagoshiashumari/Rpg-Awesome" target="_blank">CC 3.0, SIL and MIT license</a>.</li>
                    <li>Font Awesome used under <a href="https://fontawesome.com/license" target="_blank">CC 4.0, SIL and MIT license</a>.</li>
                </ul>
            </p>
            <h2>Privacy Policy</h2>
            <p>
                Replays and game stats are collected are collected for the purpose of balancing the game and making it better.
                Your user profile is stored via cookies and browser local storage.
                No data is given to third parties.
            </p>
        </div>;
    }

    private showMore() {
        this.setState({ more: true });
    }
}