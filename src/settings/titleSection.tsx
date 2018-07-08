import * as React from 'react';

interface Props {
}

interface State {
    more: boolean;
}

export class TitleSection extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { more: false };
    }

    render() {
        return <div>
            <h1 className="title">Welcome to Arcane Enigma!</h1>
            <p>
                To win, be the last one standing. 
                You deal more damage as your health gets lower,
                so don't give up, you can always win!
                This game is all about skillshots - those with the best aiming and dodging will prevail.
            </p>
            {this.state.more ? this.renderMore() : <p><a href="#" onClick={() => this.showMore()}>Show more...</a></p>}
        </div>;
    }

    private renderMore() {
        return <div>
            <h2>Credits</h2>
            <p><b>Arcane Enigma</b> was created by <b>Ray Hidayat</b> and was inspired by <a href="http://www.warlockbrawl.com/">Warlocks</a>, originally created by <b>Adynathos</b> and <b>Zymoran</b>.</p>
            <p>
                <ul>
                    <li>Icons created by <a href="http://lorcblog.blogspot.com/">Lorc</a> used under Creative Commons license from <a href="http://game-icons.net">Game-icons.net</a>.</li>
                    <li>Icons created by <a href="https://opengameart.org/content/95-game-icons">sbed</a> used under Creative Commons license from <a href="http://game-icons.net">Game-icons.net</a>.</li>
                    <li>RPG Awesome font used under <a href="https://github.com/nagoshiashumari/Rpg-Awesome">CC 3.0, SIL and MIT license</a>.</li>
                    <li>Font Awesome used under <a href="https://fontawesome.com/license">CC 4.0, SIL and MIT license</a>.</li>
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