import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as constants from '../../game/constants';
import PrivacyPolicyPanel from './privacyPolicyPanel';

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

export class TitleSection extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const Hero = this.props.settings.Hero;
        return <div>
            <h1 className="title">Acolyte Fight!</h1>
            <p>
                Welcome <b>Acolyte</b>! Time to practice your skills.
                In this arena, you'll find others just like you. Will you be the last one standing?
            </p>
            <p>
                This game is a 2D skillshot arena. To hit your enemies, predict how your enemies will move and shoot to where they are going to be!
                This game is about skill, not about secret combos! Acolytes who use all the spells badly will be overpowered by those who only use a simple fireball accurately and dodge well.
            </p>
            <h2>Special rules</h2>
            <p>
                If multiple opponents attack you within {this.props.settings.Hero.DamageMitigationTicks / constants.TicksPerSecond} seconds,
                you will only take damage from the opponent who did the most damage.
            </p>
            <h1>Community</h1>
            <p className="share"><a href="https://discord.gg/sZvgpZk" target="_blank"><i className="fab fa-discord" /><span>Join the chat on Discord!</span></a></p>
            <p className="share"><a href="http://reddit.com/r/acolytefight" target="_blank"><i className="fab fa-reddit-square" /><span>r/acolytefight</span></a></p>
            <p className="share"><a href="http://twitter.com/acolytefight" target="_blank"><i className="fab fa-twitter-square" /><span>@acolytefight</span></a></p>
            <p className="share"><a href="http://facebook.com/acolytefight" target="_blank"><i className="fab fa-facebook" /><span>fb.com/acolytefight</span></a></p>
            <p className="share"><a href="https://www.youtube.com/channel/UCJr11iCM_aigs5mCqhF_H2g" target="_blank"><i className="fab fa-youtube-square" /><span>YouTube: Acolyte Fight!</span></a></p>
            <h1>How does the rating system work?</h1>
            <p>
                The rating system is designed to measure your skill accurately, and is based on <a href="https://en.wikipedia.org/wiki/Elo_rating_system" target="_blank">Elo</a>.
                The rating system looks at all games played in the past 7 days, and awards you points based on how your performance compares to other similar players of your rating.
                For example, the rating might understand that when an 1800 player fights a 1300 player, on average they win 76% of the time.
                If you win more often than that, then on average, you will move up.
            </p>
            <p>
                If you manage to get on the leaderboard (top 100), then your rating will decay by {constants.Placements.AcoDeflatePerDay} points per day.
                However, there is also an activity bonus of up to {constants.Placements.AcoDeflatePerDay} points per day,
                so if you play at least {constants.Placements.AcoDeflatePerDay} games a day, your rating will not decay at all.
                This is to encourage high-ranked players to defend their title.
            </p>
            <h2>How do I get rated against multiple players in one game?</h2>
            <p>
                You will be considered to have "won" against every you outlasted, and "lost" against everyone who lived longer than you.
                In a game with more than 2 people:
            </p>
            <ul>
                <li>You only gain from the individual player who adds the most points. This is the person with the highest rating who you defeated..</li>
                <li>You only lose from the individual player who subtracts the most points. This is the person with the most similar rating to yours who defeated you.</li>
            </ul>
            <p>
                That means if there are 4 players in the game, and you are in last place,
                you only lose points for being below the player most similar to your skill level.
                This is to discourage "noob hunting". There is nothing to be gained from defeating the newbies first when there are people more similar to your skill level in the same game.
            </p>
            <h2>How are the leagues calculated?</h2>
            <p>
                These are the leagues and the minimum percentiles:
            </p>
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
            <p>In other words, to reach Grandmaster, your rating must be in the top {100 - constants.Placements.Grandmaster}% of players.</p>
            <h2>I did a lot of damage/got a lot of kills, why did I lose points?</h2>
            <p>
                No other factors are considered in the rating - kills do not matter, damage does not matter - the game is to be the last one standing
                and that is how it is rated. A lot of other games have experimented with performance-based rankings and
                found the ratings no longer measured skill accurately,
                as everyone was incentivised to somewhat ignore the primary objective in favour of performance metrics.
            </p>
            <h2>Why do I lose so many more points for losing and gain so few points for winning?</h2>
            <p>
                All Elo rating systems work like this.
                If you win 10 times more than you lose against a particular player,
                than for each loss, you will lose 10x more points, against that particular player.
                This creates equilibrium.
                Any other system would cause for rating inflation,
                which would mean the game is not measuring skill,
                instead it would be measuring how many games you have played.
                The points gained/lost depends on the relative skill levels of both players.
                If a Master beats a Bronze, they will gain almost nothing.
                If a Bronze beats a Master, they will gain a lot of points.
                If you want to rank up the leaderboard,
                the fastest way is to play at peak times when there are higher level players online.
                If you are a Master repeatedly beating newbies,
                at some point you will rank up so high that you stop gaining any points from them.
            </p>
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
            <h2>How long are replays stored for?</h2>
            <p>
                Replays are stored until the server is updated. This can sometimes be days and sometimes it can be hours.
                Replays cannot be stored across game updates as the game simulation changes with each update and that changes the meaning of the replay data.
                If you want to keep your replay permanently, take a video of your game.
            </p>
            <h1>Credits</h1>
            <p><b>Acolyte Fight!</b> was created by <b><a href="https://twitter.com/raysplacenspace" target="_blank">raysplaceinspace</a></b> and
            was inspired by the <a href="http://us.blizzard.com/en-us/games/war3/" target="_blank">WarCraft III</a> map <a href="http://www.warlockbrawl.com/" target="_blank">Warlock</a>,
            originally created by <b>Zymoran</b>, <b>Adynathos</b>, <b>Toraxxx</b> and <b>sides</b>.</p>
            <p>
                <ul>
                    <li><a href="http://piqnt.com/planck.js/" target="_blank">Planck.js</a> created by Erin Catto and Ali Shakiba and used under zlib license.</li>
                    <li>Icons created by <a href="http://lorcblog.blogspot.com/" target="_blank">Lorc</a> used under Creative Commons license from <a href="http://game-icons.net" target="_blank">Game-icons.net</a>.</li>
                    <li>Icons created by <a href="https://opengameart.org/content/95-game-icons" target="_blank">sbed</a> used under Creative Commons license from <a href="http://game-icons.net" target="_blank">Game-icons.net</a>.</li>
                    <li>Icons created by <a href="http://delapouite.com/" target="_blank">Delapouite</a> used under Creative Commons license from <a href="http://game-icons.net" target="_blank">Game-icons.net</a>.</li>
                    <li>RPG Awesome font used under <a href="https://github.com/nagoshiashumari/Rpg-Awesome" target="_blank">CC 3.0, SIL and MIT license</a>.</li>
                    <li>Font Awesome used under <a href="https://fontawesome.com/license" target="_blank">CC 4.0, SIL and MIT license</a>.</li>
                </ul>
            </p>
            <PrivacyPolicyPanel />
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(TitleSection);