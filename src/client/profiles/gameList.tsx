import _ from 'lodash';
import classNames from 'classnames';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as p from './profile.model';
import * as s from '../store.model';
import * as constants from '../../game/constants';
import * as replays from '../core/replays';
import * as stats from '../core/stats';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import GameRow from './gameRow';

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

function convertGame(stats: d.GameStats): p.GameRow {
    const game: p.GameRow = {
        id: stats.id,
        category: stats.category,
        server: stats.server,
        createdTimestamp: moment(stats.timestamp),
        players: new Map<string, p.PlayerStats>(),
        self: null,
        winner: null,
        lengthSeconds: stats.lengthSeconds,
    };

    for (const userHash in stats.players) {
        const player = stats.players[userHash];
        const cell: p.PlayerStats = {
            name: player.name,
            userId: player.userId,
            userHash: player.userHash,
            teamId: player.teamId || player.userHash,
            games: 1,
            wins: (player.userHash === stats.winner || (stats.winners && stats.winners.some(winner => player.userHash === winner))) ? 1 : 0,
            kills: player.kills,
            damage: player.damage,
            initialNumGames: player.initialNumGames,
            initialAco: player.initialAco,
            initialAcoGames: player.initialAcoGames,
            initialAcoExposure: player.initialAcoExposure,
            acoChanges: player.acoChanges || [],
            acoDelta: player.acoDelta,
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

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
        hasReplayLookup: state.hasReplayLookup,
        region: state.region,
    };
}

class GameList extends React.PureComponent<Props, State> {
    private getGames = Reselect.createSelector(
        (props: Props) => props.allGameStats,
        (props: Props) => props.limit,
        (allGameStats, limit) => {
            let games = allGameStats.map(convertGame);
            games = _.sortBy(games, (g: p.GameRow) => -g.createdTimestamp.unix());
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
                {games.map(game => <GameRow key={game.id} game={game} />)}
            </div>}
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(GameList);