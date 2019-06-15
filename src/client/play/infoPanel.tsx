import _ from 'lodash';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import { HeroColors, Matchmaking } from '../../game/constants';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as matches from '../core/matches';
import * as recording from '../core/recording';
import * as StoreProvider from '../storeProvider';
import Button from '../controls/button';
import InfoPanelPlayer from './infoPanelPlayer';

interface Props {
    gameId: string;
    myHeroId: string;
    scoreboard: m.OnlinePlayerMsg[];
}
interface State {
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    return {
        gameId: world.ui.myGameId,
        myHeroId: world.ui.myHeroId,
        scoreboard: calculateScoreboard(state),
    };
}

const calculateScoreboard = Reselect.createSelector(
    (state: s.State) => state.online,
    (online) => {
        return online.valueSeq().sortBy(p => -p.outlasts).toArray()
    }
);

class InfoPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return (
            <div id="info-panel">
                <table className="player-list">
                    <thead>
                        <tr className="player-list-header">
                            <th className="player-list-rank">Rank</th>
                            <th className="player-list-name">Name</th>
                            <th className="player-list-outlasts">Outlasts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.props.scoreboard.map((score, index) => <InfoPanelPlayer key={score.userHash} rank={index + 1} online={score} />)}
                    </tbody>
                </table>
            </div>
        );
    }
}

export default ReactRedux.connect(stateToProps)(InfoPanel);