import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as matches from '../core/matches';
import * as storage from '../storage';
import * as url from '../url';

interface Proportions {
    myWins: number;
    totalWins: number;

    myKills: number;
    totalKills: number;

    myDamage: number;
    totalDamage: number;
}

interface GameRow {
    id: string;
    createdTimestamp: moment.Moment;
    players: PlayerCell[];

    proportions: Proportions;

    lengthSeconds: number;
    server: string;
}

interface PlayerCell {
    name: string;
    isSelf: boolean;
    isWinner: boolean;
    kills: number;
    damage: number;
}

interface Props {
}

interface State {
    games: GameRow[];
    proportions: Proportions;
    error: string;
    availableReplays: Set<string>;
}

function retrieveGamesAsync(): Promise<GameRow[]> {
    return storage.loadAllGameStats().then(gameStats => {
        let games = gameStats.map(convertGame);
        games = _.sortBy(games, (g: GameRow) => -g.createdTimestamp.unix());
        return games;
    });
}

function retrieveReplaysAsync() {
    return fetch('api/games', { credentials: "same-origin" })
        .then(res => res.json())
        .then((data: m.GameListMsg) => {
            let ids = new Set<string>();
            data.games.forEach(g => ids.add(g.id));
            return ids;
        })
}

function convertGame(stats: d.GameStats): GameRow {
    const game: GameRow = {
        id: stats.id,
        createdTimestamp: moment(stats.timestamp),
        players: [],
        proportions: {
            myWins: 0,
            totalWins: 1,
            myDamage: 0,
            totalDamage: 0,
            myKills: 0,
            totalKills: 0,
        },
        lengthSeconds: stats.lengthSeconds,
        server: stats.server,
    };

    for (const userHash in stats.players) {
        const player = stats.players[userHash];
        const cell: PlayerCell = {
            name: player.name,
            isSelf: player.userHash === stats.self,
            isWinner: player.userHash === stats.winner,
            kills: player.kills,
            damage: player.damage,
        };

        game.proportions.totalKills += player.kills;
        game.proportions.totalDamage += player.damage;

        if (stats.winner === userHash) {
            game.players.unshift(cell); // Put winner at start of list
            ++game.proportions.totalWins;
        } else {
            game.players.push(cell);
        }

        if (stats.self === userHash) {
            game.proportions.myKills = player.kills;
            game.proportions.myDamage = player.damage;
            game.proportions.myWins = stats.winner === stats.self ? 1 : 0;
        }
    }

    return game;
}

function joinWithComma(elements: JSX.Element[]): Array<JSX.Element | string> {
    const result = new Array<JSX.Element | string>();
    elements.forEach(elem => {
        if (result.length > 0) {
            result.push(", ");
        }
        result.push(elem);
    });
    return result;
}

function sumProportions(games: GameRow[]): Proportions {
    const proportions: Proportions = {
        myWins: 0,
        totalWins: 0,

        myKills: 0,
        totalKills: 0,

        myDamage: 0,
        totalDamage: 0,
    };
    games.forEach(g => {
        proportions.myWins += g.proportions.myWins;
        proportions.totalWins += g.proportions.totalWins;

        proportions.myKills += g.proportions.myKills;
        proportions.totalKills += g.proportions.totalKills;

        proportions.myDamage += g.proportions.myDamage;
        proportions.totalDamage += g.proportions.totalDamage;
    });
    return proportions;
}

class RecentGameList extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            games: null,
            proportions: null,
            availableReplays: new Set<string>(),
            error: null,
        };
    }

    componentDidMount() {
        retrieveGamesAsync().then(games => {
            this.setState({ games, proportions: sumProportions(games) });
        }).then(() => retrieveReplaysAsync()).then(availableReplays => {
            this.setState({ availableReplays });
        }).catch(error => {
            this.setState({ error: `${error}` });
        });
    }

    render() {
        return <div className="recent-game-list-section">
            {this.renderStats(this.state.proportions)}
            <h1>Stats</h1>
            {this.state.error && <p className="error">Error loading recent games: {this.state.error}</p>}
            {!this.state.games && <p className="loading-text">Loading...</p>}
            {this.state.games && this.state.games.length === 0 && <p>No recent games</p>}
            {this.state.games && this.state.games.length > 0 && <div className="game-list">
                <table style={{width: "100%"}}>
                    <col className="timestamp" />
                    <col />
                    <col />
                    <col />
                    <col className="actions" />
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Players</th>
                            <th>Kills</th>
                            <th>Damage</th>
                            <th>Watch</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.games.map(game => this.renderRow(game))}
                    </tbody>
                </table>
            </div>}
        </div>;
    }

    private renderStats(proportions: Proportions): JSX.Element {
        if (!(proportions && proportions.totalWins > 0)) {
            return null;
        }
        return <div>
            <h1>Previous {proportions.totalWins} games</h1>
            <div className="stats-card-row">
                <div className="stats-card" title={`You won ${proportions.myWins} out of ${proportions.totalWins} games`}>
                    <div className="label">Win rate</div>
                    <div className="value">{Math.round(100 * proportions.myWins / Math.max(1, proportions.totalWins))}%</div>
                </div>
                <div className="stats-card" title={`You scored ${proportions.myKills} kills out of ${proportions.totalKills} total`}>
                    <div className="label">Kills</div>
                    <div className="value">{proportions.myKills}</div>
                </div>
                <div className="stats-card" title={`You did ${Math.round(proportions.myDamage)} damage out of ${Math.round(proportions.totalDamage)} total`}>
                    <div className="label">Damage</div>
                    <div className="value">{Math.round(proportions.myDamage)}</div>
                </div>
            </div>
        </div>
    }

    private renderRow(game: GameRow): JSX.Element {
        return <tr>
            <td title={game.createdTimestamp.toLocaleString()}>{game.createdTimestamp.fromNow()}</td>
            <td>{joinWithComma(game.players.map(player => this.renderPlayer(player)))}</td>
            <td title={`You scored ${game.proportions.myKills} kills out of ${game.proportions.totalKills} total`}>{game.proportions.myKills}</td>
            <td title={`You did ${Math.round(game.proportions.myDamage)} damage out of ${Math.round(game.proportions.totalDamage)} total`}>{Math.round(game.proportions.myDamage)}</td>
            <td>{this.state.availableReplays.has(game.id) && <a href={this.gameUrl(game)} onClick={(ev) => this.onWatchGameClicked(ev, game)}>Watch <i className="fa fa-external-link-square-alt" /></a>}</td>
        </tr>
    }

    private renderPlayer(player: PlayerCell): JSX.Element {
        return <span className="player-cell" title={`${player.name}: ${player.isWinner ? "winner, " : ""}${player.kills} kills, ${Math.round(player.damage)} damage`}>
            <span className={player.isWinner ? "winner" : ""}>{player.name}</span>
        </span>
    }

    private gameUrl(game: GameRow): string {
        return url.getPath({
            gameId: game.id,
            party: null,
            server: game.server,
            page: null,
        });
    }

    private onWatchGameClicked(ev: React.MouseEvent, game: GameRow) {
        ev.preventDefault();

        matches.joinNewGame(game.id);
    }
}

export default RecentGameList;