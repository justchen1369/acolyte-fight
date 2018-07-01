import * as React from 'react';
import { Game } from './watch.model';

interface Props {
    games: Game[];
}

interface State {
}

export class WatchPage extends React.Component<Props, State> {
    render() {
        return <div className="watch-page">
            <h1 className="title">Your recent games</h1>
            <div className="game-list">
                <table style={{width: "100%"}}>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Players</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.props.games.map(game => <tr>
                            <td>{game.createdTimestamp.fromNow()}</td>
                            <td>{game.playerNames.join(", ")}</td>
                            <td><a href={"/?g=" + game.id} target="_blank">Watch</a></td>
                        </tr>)}
                    </tbody>
                </table>
            </div>
        </div>;
    }
}