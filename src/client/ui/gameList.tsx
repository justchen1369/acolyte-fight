import _ from 'lodash';
import classNames from 'classnames';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as matches from '../core/matches';
import * as mathUtils from '../core/mathUtils';
import * as pages from '../core/pages';
import * as replays from '../core/replays';
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
    limit: number;
}
interface Props extends OwnProps {
    current: s.PathElements;
    region: string;
    hasReplayLookup: Map<string, string>;
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
        region: state.region,
    };
}

class GameList extends React.Component<Props, State> {
    private getGames = Reselect.createSelector(
        (props: Props) => props.allGameStats,
        (props: Props) => props.limit,
        (allGameStats, limit) => {
            let games = allGameStats.map(convertGame);
            games = _.sortBy(games, (g: GameRow) => -g.createdTimestamp.unix());
            games = _.take(games, limit);
            return games;
        }
    );

    constructor(props: Props) {
        super(props);
        this.state = {
            error: null,
        };

        replays.checkForReplays(props.allGameStats);
    }

    componentWillReceiveProps(newProps: Props) {
        replays.checkForReplays(newProps.allGameStats);
    }

    render() {
        return <div className="recent-game-list-section">
            {this.renderGames()}
        </div>;
    }

    private renderGames(): JSX.Element {
        const games = this.getGames(this.props);
        return <div>
            {this.state.error && <p className="error">Error loading recent games: {this.state.error}</p>}
            {!games && <p className="loading-text">Loading...</p>}
            {games && games.length === 0 && <p>No recent games</p>}
            {games && games.length > 0 && <div className="game-list">
                {games.map(game => this.renderRow(game))}
            </div>}
        </div>
    }

    private renderRow(game: GameRow): JSX.Element {
        const self = game.players.get(game.self);
        const hasReplay = this.props.hasReplayLookup.get(game.id);
        return <div key={game.id} className="game-card">
            <div className="game-info">
                <div className="label">
                    <span className="timestamp">{game.createdTimestamp.fromNow()}</span>
                    {hasReplay && <a className="watch" href={this.gameUrl(game)} onClick={(ev) => this.onWatchGameClicked(ev, game)}> - watch <i className="fas fa-video" /></a>}
                </div>
                <div className="player-list">{joinWithComma([...game.players.values()].map(player => this.renderPlayer(player)))}</div>
            </div>
            <div className="spacer" />
            <div title="Rating adjustment">{self && this.renderRatingDelta(self.ratingDelta)}</div>
        </div>
    }

    private renderRatingDelta(ratingDelta: number): JSX.Element {
        if (!ratingDelta) {
            return null;
        }

        const className = classNames({
            'rating': true,
            'rating-increase': ratingDelta >= 0,
            'rating-decrease': ratingDelta < 0,
        });
        let text = mathUtils.deltaPrecision(ratingDelta);
        return <div className="rating-container">
            <div className={className}>{text}</div>
        </div>
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
        const region = url.getRegion(game.server) || this.props.region;
        const origin = url.getOrigin(region);
        const path = url.getPath({
            gameId: game.id,
            party: null,
            server: game.server,
            page: null,
        });
        return origin + path;
    }

    private onWatchGameClicked(ev: React.MouseEvent, game: GameRow) {
        ev.preventDefault();

        replays.watch(game.id, game.server);
    }
}

export default ReactRedux.connect(stateToProps)(GameList);