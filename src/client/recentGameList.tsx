import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as m from '../game/messages.model';
import { TicksPerSecond } from '../game/constants';

export interface Game {
    id: string;
    createdTimestamp: moment.Moment;
    playerNames: string[];
    numActivePlayers: number;
    joinable: boolean;
    numTicks: number;
}

interface Props {
    watchGameCallback: (gameId: string) => void;
}

interface State {
    games: Game[];
    error: string;
}

function retrieveGamesAsync() {
    return fetch('api/games', { credentials: "same-origin" })
        .then(res => res.json())
        .then((data: m.GameListMsg) => {
            let games = new Array<Game>();
            data.games.forEach(gameMsg => {
                games.push(msgToGame(gameMsg));
            });
            games = _.sortBy(games, (game: Game) => -game.createdTimestamp.unix());
            return games;
        })
}

function msgToGame(msg: m.GameMsg): Game {
    let playerNames = msg.playerNames;
    playerNames = playerNames.sort();
    return {
        id: msg.id,
        createdTimestamp: moment.utc(msg.createdTimestamp),
        playerNames,
        numActivePlayers: msg.numActivePlayers,
        joinable: msg.joinable,
        numTicks: msg.numTicks,
    };
}

export class RecentGameList extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            games: null,
            error: null,
        };
    }

    componentDidMount() {
        retrieveGamesAsync().then(games => {
            this.setState({ games });
        }).catch(error => {
            this.setState({ error: `${error}` });
        });
    }

    render() {
        return <div className="recent-game-list-section">
            <h1>Your Recent Games</h1>
            {this.state.error && <p className="error">Error loading recent games: {this.state.error}</p>}
            {!this.state.games && <p className="loading-text">Loading...</p>}
            {this.state.games && this.state.games.length === 0 && <p>No recent games</p>}
            {this.state.games && this.state.games.length > 0 && <div className="game-list">
                <table style={{width: "100%"}}>
                    <col className="timestamp" />
                    <col className="player-names" />
                    <col className="game-length" />
                    <col className="actions" />
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Players</th>
                            <th>Length</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.games.map(game => <tr>
                            <td>{game.createdTimestamp.fromNow()}</td>
                            <td>{game.playerNames.join(", ")}</td>
                            <td>{game.numActivePlayers > 0 ? "Live" : `${(game.numTicks / TicksPerSecond).toFixed(0)} s`}</td>
                            <td><a href={"game?g=" + game.id} onClick={ev=>this.onWatchClicked(ev, game.id)}>Watch <i className="fa fa-external-link-square-alt" /></a></td>
                        </tr>)}
                    </tbody>
                </table>
            </div>}
        </div>;
    }

    private onWatchClicked(ev: React.MouseEvent, gameId: string) {
        ev.preventDefault();
        this.props.watchGameCallback(gameId);
    }
}