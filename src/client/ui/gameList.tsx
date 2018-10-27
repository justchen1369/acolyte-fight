import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as stats from '../core/stats';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

interface Stats {
    games: number;
    wins: number;
    kills: number;
    damage: number;
}

interface GameRow {
    id: string;
    category: string;
    server: string;
    createdTimestamp: moment.Moment;

    self: string;
    winner: string;
    players: Map<string, PlayerStats>;

    lengthSeconds: number;
}

interface PlayerStats extends Stats {
    name: string;
    userId?: string;
    userHash: string;
    ratingDelta: number;
}

interface OwnProps {
    allGameStats: d.GameStats[];
}
interface Props extends OwnProps {
    current: s.PathElements;
    hasReplayLookup: Map<string, boolean>;
}
interface State {
    error: string;
}

function convertGame(stats: d.GameStats): GameRow {
    const game: GameRow = {
        id: stats.id,
        category: stats.category,
        server: stats.server,
        createdTimestamp: moment(stats.timestamp),
        players: new Map<string, PlayerStats>(),
        self: null,
        winner: null,
        lengthSeconds: stats.lengthSeconds,
    };

    for (const userHash in stats.players) {
        const player = stats.players[userHash];
        const cell: PlayerStats = {
            name: player.name,
            userId: player.userId,
            userHash: player.userHash,
            games: 1,
            wins: player.userHash === stats.winner ? 1 : 0,
            kills: player.kills,
            damage: player.damage,
            ratingDelta: player.ratingDelta || 0,
        };

        game.players.set(userHash, cell);

        if (stats.winner === userHash) {
            game.winner = userHash;
        }
        if (stats.self && stats.self === userHash) {
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

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
        hasReplayLookup: state.hasReplayLookup,
    };
}

class GameList extends React.Component<Props, State> {
    private alreadyCheckedReplays = new Set<string>();

    private getGames = Reselect.createSelector(
        (allGameStats: d.GameStats[]) => allGameStats,
        (allGameStats) => {
            let games = allGameStats.map(convertGame);
            games = _.sortBy(games, (g: GameRow) => -g.createdTimestamp.unix());
            return games;
        }
    );

    constructor(props: Props) {
        super(props);
        this.state = {
            error: null,
        };

        for (const gameId of props.hasReplayLookup.keys()) {
            this.alreadyCheckedReplays.add(gameId);
        }
    }

    componentWillReceiveProps(newProps: Props) {
        this.checkForReplays(newProps.allGameStats.map(gameStats => gameStats.id));
    }

    private async checkForReplays(gameIds: string[]) {
        const hasReplayLookup = new Map<string, boolean>();
        for (const gameId of gameIds) {
            if (!this.alreadyCheckedReplays.has(gameId)) {
                hasReplayLookup.set(gameId, false);
                this.alreadyCheckedReplays.add(gameId);
            }
        }

        if (hasReplayLookup.size === 0) {
            return;
        }

        const replayIds = await matches.replays([...hasReplayLookup.keys()]);
        for (const gameId of replayIds) {
            hasReplayLookup.set(gameId, true);
        }
        StoreProvider.dispatch({ type: "updateHasReplay", hasReplayLookup });
    }

    render() {
        return <div className="recent-game-list-section">
            {this.renderGames()}
        </div>;
    }

    private renderGames(): JSX.Element {
        const games = this.getGames(this.props.allGameStats);
        return <div>
            {this.state.error && <p className="error">Error loading recent games: {this.state.error}</p>}
            {!games && <p className="loading-text">Loading...</p>}
            {games && games.length === 0 && <p>No recent games</p>}
            {games && games.length > 0 && <div className="game-list">
                <table style={{width: "100%"}}>
                    <col className="timestamp" />
                    <col />
                    <col />
                    <col className="actions" />
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Players</th>
                            <th>Rating</th>
                            <th>Watch</th>
                        </tr>
                    </thead>
                    <tbody>
                        {games.map(game => this.renderRow(game))}
                    </tbody>
                </table>
            </div>}
        </div>
    }

    private renderRow(game: GameRow): JSX.Element {
        const self = game.players.get(game.self);
        return <tr key={game.id}>
            <td title={game.createdTimestamp.toLocaleString()}>{game.createdTimestamp.fromNow()}</td>
            <td>{joinWithComma([...game.players.values()].map(player => this.renderPlayer(player)))}</td>
            <td>{self && this.renderRatingDelta(self.ratingDelta)}</td>
            <td>{this.props.hasReplayLookup.get(game.id) && <a href={this.gameUrl(game)} onClick={(ev) => this.onWatchGameClicked(ev, game)}>Watch <i className="fa fa-external-link-square-alt" /></a>}</td>
        </tr>
    }

    private renderRatingDelta(ratingDelta: number): JSX.Element {
        if (!ratingDelta) {
            return null;
        }

        if (ratingDelta > 0) {
            return <span className="rating-increase">{ratingDelta.toFixed(0)}</span>
        } else {
            return <span className="rating-decrease">{ratingDelta.toFixed(0)}</span>
        }
    }

    private renderPlayer(player: PlayerStats): JSX.Element {
        const playerUrl = player.userId ? url.getPath({ ...this.props.current, page: "profile", profileId: player.userId }) : null;

        return <span key={player.userHash} className="player-cell" title={`${player.name}: ${player.wins ? "winner, " : ""}${player.kills} kills, ${Math.round(player.damage)} damage`}>
            <a href={playerUrl} onClick={(ev) => this.onPlayerClick(ev, player.userId)} className={`${player.wins ? "winner" : "loser"} ${playerUrl ? "known" : "unknown"}`}>
                {player.wins ? <i className="fas fa-crown" /> : null}
                {player.name}
            </a>
        </span>
    }

    private onPlayerClick(ev: React.MouseEvent, userId: string) {
        if (userId) {
            ev.preventDefault();
            pages.changePage("profile", userId);
        }
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

export default ReactRedux.connect(stateToProps)(GameList);