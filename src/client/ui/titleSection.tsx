import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as constants from '../../game/constants';

interface Props {
    settings: AcolyteFightSettings;
}

interface State {
}

function stateToProps(state: s.State): Props {
    return {
        settings: state.room.settings,
    };
}

export class TitleSection extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div>
            <h1 className="title">Acolyte Fight!</h1>
            <p>
                Welcome <b>Acolyte</b>! Time to practice your skills.
                In this arena, you'll find others just like you. Will you be the last one standing?
            </p>
            <p>
                This game is a 2D skillshot arena. To hit your enemies, predict how your enemies will move and shoot to where they are going to be!
                This game is about skill, not about secret combos! Acolytes who use all the spells badly will be overpowered by those who only use a simple fireball accurately and dodge well.
                Acolytes become more dangerous as they lose health - dealing up to {1 + this.props.settings.Hero.AdditionalDamageMultiplier}x more damage!
                This means you can always make a comeback, just keep dodging and aim carefully!
            </p>
            <h1>Community</h1>
            <p className="share"><a href="https://discord.gg/sZvgpZk" target="_blank"><i className="fab fa-discord" /><span>Join the chat on Discord!</span></a></p>
            <p className="share"><a href="http://twitter.com/acolytefight" target="_blank"><i className="fab fa-twitter-square" /><span>@acolytefight</span></a></p>
            <p className="share"><a href="http://facebook.com/acolytefight" target="_blank"><i className="fab fa-facebook" /><span>fb.com/acolytefight</span></a></p>
            <h1>FAQ</h1>
            <h2>When does the game start?</h2>
            <p>
                The game starts whenever you want it to - just start casting some spells.
                Within the first 3 seconds of the game, no damage can be done, and some players may still join.
            </p>
            <h2>How can I play this game on my phone?</h2>
            <p>The game already works on mobile, just go to <a href="http://acolytefight.io" target="_blank">acolytefight.io</a> and click Play.</p>
            <p>
                To make the game more accessible, add <b>Acolyte Fight!</b> to your homescreen of your mobile device.
                On iPhone - tap the Share button, click Add to Home Screen.
                On Android - tap the triple dot menu button, click Add to Home Screen.
            </p>
            <h2>How are the leagues calculated?</h2>
            <p>
                These are the leagues and the minimum percentiles:
                <ul>
                    <li>Grandmaster: {constants.Placements.Grandmaster} percentile</li>
                    <li>Master: {constants.Placements.Master} percentile</li>
                    <li>Diamond {constants.Placements.Diamond} percentile</li>
                    <li>Platinum: {constants.Placements.Platinum} percentile</li>
                    <li>Gold: {constants.Placements.Gold} percentile</li>
                    <li>Silver: {constants.Placements.Silver} percentile</li>
                    <li>Bronze: {constants.Placements.Bronze} percentile</li>
                    <li>Wood: {constants.Placements.Wood} percentile</li>
                </ul>
            </p>
            <h2>How long are replays stored for?</h2>
            <p>
                Replays are stored until the server is updated. This can sometimes be days and sometimes it can be hours.
                Replays cannot be stored across game updates as the game simulation changes with each update and that changes the meaning of the replay data.
                If you want to keep your replay permanently, take a video of your game.
            </p>
            <h2>How is the leaderboard calculated?</h2>
            <p>The leaderboard calculated according to the <a href="https://en.wikipedia.org/wiki/Glicko_rating_system" target="_blank">Glicko-2 rating system</a>.</p>
            <h2>What is the tech stack for this game?</h2>
            <p>Server and client are coded in TypeScript. Canvas is used for graphics, React for UI elements. Networking uses socket.io. Physics engine is Planck.js.</p>
            <h1>Credits</h1>
            <p><b>Acolyte Fight!</b> was created by <b><a href="https://twitter.com/raysplacenspace" target="_blank">raysplaceinspace</a></b> and
            was inspired by the <a href="http://us.blizzard.com/en-us/games/war3/" target="_blank">WarCraft III</a> map <a href="http://www.warlockbrawl.com/" target="_blank">Warlock</a>,
            originally created by <b>Zymoran</b>, <b>Adynathos</b>, <b>Toraxxx</b> and <b>sides</b>.</p>
            <p>
                <ul>
                    <li><a href="http://piqnt.com/planck.js/" target="_blank">Planck.js</a> created by Erin Catto and Ali Shakiba and used under zlib license.</li>
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

export default ReactRedux.connect(stateToProps)(TitleSection);