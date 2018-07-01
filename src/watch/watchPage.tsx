import * as React from 'react';
import * as m from '../game/messages.model';
import { Game } from './watch.model';

interface Props {
    games: Game[];
}

interface State {
}

export class WatchPage extends React.Component<Props, State> {
    render() {
        return <div className="watch-page">
            <h1 className="title">Watch previous games</h1>
            <div className="game-list">
                {this.props.games.map(game => <div className="game">
                    <a href={"/?g=" + game.id} target="_blank">{game.playerNames.join(", ") + " at " + game.createdTimestamp.format("YYYY-MM-DD HH:mm")}</a>
                </div>)}
            </div>
        </div>;
    }
}