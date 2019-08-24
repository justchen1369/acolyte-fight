import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as options from '../options';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as constants from '../../game/constants';
import * as rankings from '../core/rankings';
import RankIcon from '../controls/rankIcon';
import PrivacyPolicyPanel from './privacyPolicyPanel';

interface Props {
    noExternalLinks: boolean,
    settings: AcolyteFightSettings;
    leagues: m.League[];
}

interface State {
}

function stateToProps(state: s.State): Props {
    const a = options.getProvider();
    return {
        noExternalLinks: a.noExternalLinks,
        settings: state.room.settings,
        leagues: state.leagues,
    };
}

export class AboutSection extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    componentDidMount() {
        if (!this.props.leagues) {
            rankings.downloadLeagues(); // Don't await
        }
    }

    render() {
        return <div>
            <h1 className="title">Acolyte Fight!</h1>
            <p>
                Welcome <b>Acolyte</b>! Time to practice your skills.
                In this arena, you'll find others just like you. Will you be the last one standing?
            </p>
            {this.renderRules()}
            {this.renderCommunity()}
            {this.renderRating()}
            {this.renderFAQ()}
            {this.renderCredits()}
            <PrivacyPolicyPanel />
        </div>;
    }

    private renderRules() {
        const Hero = this.props.settings.Hero;
        const World = this.props.settings.World;
        return <div key="rules">
            <p>
                This game is skillshot arena. To hit your enemies, predict how your enemies will move and shoot to where they are going to be!
                This game is about skill! Acolytes who use all the spells badly will be overpowered by those who only use a simple fireball accurately and dodge well.
            </p>
            <h2>Special rules</h2>
            <p>
                The map shrinks over <b>{World.SecondsToShrink} seconds</b>. The area outside of the map is called the void. It does <b>{World.LavaDamagePerSecond}</b> damage per second.
            </p>
            <p>
                Most spells have lifesteal - that means a proportion of damage dealt is added to your health.
                The last player to knockback an enemy receives <b>{100 * World.LavaLifestealProportion}% lifesteal</b> from the void damage.
            </p>
            <p>
                If multiple opponents attack you within <b>{Hero.DamageMitigationTicks / constants.TicksPerSecond} seconds</b>,
                you will only take damage from the opponent who did the most damage.
            </p>
        </div>
    }

    private renderCommunity() {
        if (this.props.noExternalLinks) {
            return null;
        }

        return <div key="community">
            <h1>Community</h1>
            <p className="share"><a href="https://discord.gg/sZvgpZk" target="_blank"><i className="fab fa-discord" /><span>Join the chat on Discord!</span></a></p>
            <p className="share"><a href="http://reddit.com/r/acolytefight" target="_blank"><i className="fab fa-reddit-square" /><span>r/acolytefight</span></a></p>
            <p className="share"><a href="http://twitter.com/acolytefight" target="_blank"><i className="fab fa-twitter-square" /><span>@acolytefight</span></a></p>
            <p className="share"><a href="http://facebook.com/acolytefight" target="_blank"><i className="fab fa-facebook-square" /><span>fb.com/acolytefight</span></a></p>
            <p className="share"><a href="https://www.youtube.com/channel/UCJr11iCM_aigs5mCqhF_H2g" target="_blank"><i className="fab fa-youtube-square" /><span>YouTube: Acolyte Fight!</span></a></p>
        </div>
    }

    private renderRating() {
        return <div key="rating">
            <h1>How does the rating system work?</h1>
            <p>
                The rating system is designed to measure your skill accurately, and is based on {this.renderLink("https://en.wikipedia.org/wiki/Elo_rating_system", "Elo")}.
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
            {this.renderLeagues()}
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
        </div>
    }

    private renderLeagues() {
        if (!this.props.leagues) {
            return null;
        }

        return <div>
            <h2>What is the minimum rating for each league?</h2>
            <div className="leaderboard">
                {this.props.leagues.map(x => <div className={`leaderboard-row rating-card ${x.name}`} key={x.name}>
                    <RankIcon league={x.name} />
                    <span className="player-name">{x.name}</span>
                    <span className="win-count">{x.minRating} rating <span className="leaderboard-num-games">({x.minPercentile} percentile)</span></span>
                </div>)}
            </div>
        </div>
    }

    private renderFAQ() {
        return <div key="faq">
            <h1>FAQ</h1>
            <h2>When does the game start?</h2>
            <p>
                The game starts whenever you want it to - just start casting some spells.
                Within the first 3 seconds of the game, no damage can be done, and some players may still join.
            </p>
            {!this.props.noExternalLinks && <>
                <h2>How can I play this game on my phone?</h2>
                <p>The game already works on mobile, just go to {this.renderLink("http://acolytefight.io", "acolytefight.io")} and click Play.</p>
                <p>
                    To make the game more accessible, add <b>Acolyte Fight!</b> to your homescreen of your mobile device.
                    On iPhone - tap the Share button, click Add to Home Screen.
                    On Android - tap the triple dot menu button, click Add to Home Screen.
                </p>
            </>}
            <h2>How long are replays stored for?</h2>
            <p>
                Replays are stored until the server is updated. This can sometimes be days and sometimes it can be hours.
                Replays cannot be stored across game updates as the game simulation changes with each update and that changes the meaning of the replay data.
                If you want to keep your replay permanently, take a video of your game.
            </p>
        </div>
    }

    private renderCredits() {
        return <div key="credits">
            <h1>Credits</h1>
            <p><b>Acolyte Fight!</b> was created by <b>{this.renderLink("https://twitter.com/raysplacenspace", "raysplaceinspace")}</b> and
            was inspired by the {this.renderLink("http://us.blizzard.com/en-us/games/war3/", "WarCraft III")} map {this.renderLink("http://www.warlockbrawl.com/", "Warlock")},
            originally created by <b>Zymoran</b>, <b>Adynathos</b>, <b>Toraxxx</b> and <b>sides</b>.</p>
            {!this.props.noExternalLinks && <ul>
                <li>{this.renderLink("http://piqnt.com/planck.js/", "Planck.js")} created by Erin Catto and Ali Shakiba and used under zlib license.</li>
                <li>Icons created by {this.renderLink("http://lorcblog.blogspot.com/", "Lorc")} used under Creative Commons license from {this.renderLink("http://game-icons.net", "Game-icons.net")}.</li>
                <li>Icons created by {this.renderLink("https://opengameart.org/content/95-game-icons", "sbed")} used under Creative Commons license from {this.renderLink("http://game-icons.net", "Game-icons.net")}.</li>
                <li>Icons created by {this.renderLink("http://delapouite.com/", "Delapouite")} used under Creative Commons license from {this.renderLink("http://game-icons.net", "Game-icons.net")}.</li>
            </ul>}
        </div>
    }

    private renderLink(href: string, text: string) {
        if (this.props.noExternalLinks) {
            return <b>{text}</b>;
        } else {
            return <a href={href} target="_blank">{text}</a>
        }
    }
}

export default ReactRedux.connect(stateToProps)(AboutSection);