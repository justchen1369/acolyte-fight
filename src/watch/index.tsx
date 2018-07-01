import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as m from '../game/messages.model';
import { Game } from './watch.model';
import { WatchPage } from './watchPage';

let games = new Array<Game>();

rerender();

fetch('games', { credentials: "same-origin" })
    .then(res => res.json())
    .then((data: m.GameListMsg) => {
        data.games.forEach(gameMsg => {
            games.push(msgToGame(gameMsg));
        });
        games = _.sortBy(games, (game: Game) => -game.createdTimestamp.unix());
    })
    .then(() => rerender());

function rerender() {
    ReactDOM.render(
        <WatchPage games={games} />,
        document.getElementById("root")
    );
}

function msgToGame(msg: m.GameMsg): Game {
    let playerNames = msg.playerNames;
    playerNames = playerNames.sort();
    return {
        id: msg.id,
        createdTimestamp: moment(msg.createdTimestamp),
        playerNames,
        numActivePlayers: msg.numActivePlayers,
        joinable: msg.joinable,
        numTicks: msg.numTicks,
    };
}