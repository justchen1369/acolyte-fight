import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as matches from '../core/matches';
import * as storage from '../storage';
import * as url from '../url';

interface Stats {
    wins: number;
    kills: number;
    damage: number;
}

interface GlobalStats {
    players: Map<string, PlayerStats>;
    totals: Stats;
}

interface GameRow {
    id: string;
    createdTimestamp: moment.Moment;

    self: string;
    winner: string;
    players: Map<string, PlayerStats>;
    totals: Stats;

    lengthSeconds: number;
    server: string;
}

interface PlayerStats extends Stats {
    name: string;
    userHash: string;
}

interface Props {
}

interface State {
    self: string;
    games: GameRow[];
    global: GlobalStats;
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

function initStats(): Stats {
    return { wins: 0, kills: 0, damage: 0 };
}

function accumulateStats(accumulator: Stats, addend: Stats) {
    accumulator.wins += addend.wins;
    accumulator.kills += addend.kills;
    accumulator.damage += addend.damage;
}

function convertGame(stats: d.GameStats): GameRow {
    const game: GameRow = {
        id: stats.id,
        createdTimestamp: moment(stats.timestamp),
        players: new Map<string, PlayerStats>(),
        self: null,
        winner: null,
        totals: initStats(),
        lengthSeconds: stats.lengthSeconds,
        server: stats.server,
    };

    for (const userHash in stats.players) {
        const player = stats.players[userHash];
        const cell: PlayerStats = {
            name: player.name,
            userHash: player.userHash,
            wins: player.userHash === stats.winner ? 1 : 0,
            kills: player.kills,
            damage: player.damage,
        };

        game.players.set(userHash, cell);
        accumulateStats(game.totals, cell);

        if (stats.winner === userHash) {
            game.winner = userHash;
        }
        if (stats.self === userHash) {
            game.self = userHash;
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

function calculateGlobalStats(games: GameRow[]): GlobalStats {
    const totals = initStats();
    const players = new Map<string, PlayerStats>();

    for (const game of games) {
        accumulateStats(totals, game.totals);

        for (const gamePlayer of game.players.values()) {
            let globalPlayer = players.get(gamePlayer.userHash);
            if (!globalPlayer) {
                globalPlayer = {
                    name: gamePlayer.name,
                    userHash: gamePlayer.userHash,
                    wins: 0,
                    kills: 0,
                    damage: 0,
                };
                players.set(globalPlayer.userHash, globalPlayer);
            }

            accumulateStats(globalPlayer, gamePlayer);
        }
    }

    return {
        players,
        totals,
    };
}

function findSelf(games: GameRow[]): string {
    for (const game of games) {
        if (game.self) {
            return game.self;
        }
    }
    return null;
}

class RecentGameList extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            self: null,
            games: null,
            global: null,
            availableReplays: new Set<string>(),
            error: null,
        };
    }

    componentDidMount() {
        retrieveGamesAsync().then(games => {
            this.setState({
                games,
                global: calculateGlobalStats(games),
                self: findSelf(games),
            });
        }).then(() => retrieveReplaysAsync()).then(availableReplays => {
            this.setState({ availableReplays });
        }).catch(error => {
            this.setState({ error: `${error}` });
        });
    }

    render() {
        return <div className="recent-game-list-section">
            {this.renderGlobals()}
            {this.renderLeaderboard()}
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

    private renderGlobals(): JSX.Element {
        if (!(this.state.self && this.state.global && this.state.games && this.state.games.length > 0)) {
            return null;
        }

        const size = this.state.games.length; // Use this instead of total.wins as the user may leave early before they see the winner
        const self = this.state.global.players.get(this.state.self);
        const total = this.state.global.totals;
        if (!(self && total)) {
            return null;
        }

        return <div>
            <h1>Previous {this.state.games.length} games</h1>
            <div className="stats-card-row">
                <div className="stats-card" title={`You won ${self.wins} out of ${size} games`}>
                    <div className="label">Win rate</div>
                    <div className="value">{Math.round(100 * self.wins / Math.max(1, size))}%</div>
                </div>
                <div className="stats-card" title={`You scored ${self.kills} kills out of ${total.kills} total`}>
                    <div className="label">Kills per game</div>
                    <div className="value">{(self.kills / size).toFixed(1)}</div>
                </div>
                <div className="stats-card" title={`You did ${Math.round(self.damage)} damage out of ${Math.round(total.damage)} total`}>
                    <div className="label">Damage per game</div>
                    <div className="value">{Math.round(self.damage / size)}</div>
                </div>
            </div>
        </div>
    }

    private renderLeaderboard(): JSX.Element {
        if (!(this.state.self && this.state.global)) {
            return null;
        }

        const MaxLeaderboardLength = 10;
        const self = this.state.self;

        let players = [...this.state.global.players.values()];
        players = players.filter(p => p.wins > 0);
        players = _.sortBy(players, (p: PlayerStats) => -p.wins);
        players = _.take(players, MaxLeaderboardLength);
        if (players.length === 0) {
            return null;
        }

        let position = 0;
        return <div>
            <h1>Leaderboard</h1>
            <div className="leaderboard">
                {players.map((player, index) => (index < MaxLeaderboardLength || player.userHash === self) ?  this.renderLeaderboardRow(player, index) : null)}
            </div>
        </div>;
    }

    private renderLeaderboardRow(player: PlayerStats, index: number) {
        return <div className={index === 0 ? "leaderboard-row leaderboard-best" : "leaderboard-row"}>
            <span className="position">{index + 1}</span>
            <span className="player-name">{player.name}</span>
            <span className="win-count">{player.wins} wins, {player.kills} kills, {Math.round(player.damage)} damage</span>
        </div>
    }
    
    private renderRow(game: GameRow): JSX.Element {
        const self = game.players.get(game.self);
        if (!self) {
            return null;
        }

        return <tr>
            <td title={game.createdTimestamp.toLocaleString()}>{game.createdTimestamp.fromNow()}</td>
            <td>{joinWithComma([...game.players.values()].map(player => this.renderPlayer(player)))}</td>
            <td title={`You scored ${self.kills} kills out of ${game.totals.kills} total`}>{self.kills}</td>
            <td title={`You did ${Math.round(self.damage)} damage out of ${Math.round(game.totals.damage)} total`}>{Math.round(self.damage)}</td>
            <td>{this.state.availableReplays.has(game.id) && <a href={this.gameUrl(game)} onClick={(ev) => this.onWatchGameClicked(ev, game)}>Watch <i className="fa fa-external-link-square-alt" /></a>}</td>
        </tr>
    }

    private renderPlayer(player: PlayerStats): JSX.Element {
        return <span className="player-cell" title={`${player.name}: ${player.wins ? "winner, " : ""}${player.kills} kills, ${Math.round(player.damage)} damage`}>
            <span className={player.wins ? "winner" : ""}>
                {player.wins ? <i className="fas fa-crown" /> : null}
                {player.name}
            </span>
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