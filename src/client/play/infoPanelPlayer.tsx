import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import { HeroColors, Matchmaking } from '../../game/constants';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as matches from '../core/matches';
import PlayerName from './playerNameComponent';

interface OwnProps {
    heroId: string;
}
interface Props {
    myHeroId: string;
    isAlive: boolean;
    isActive: boolean;
    player: w.Player;
    numKills: number;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const world = state.world;
    const player = world.players.get(ownProps.heroId);

    let numKills = 0;
    {
        let scores = world.scores.get(player.heroId);
        if (scores) {
            numKills = scores.kills;
        }
    }

    return {
        myHeroId: world.ui.myHeroId,
        player,
        numKills,
        isAlive: world.objects.has(player.heroId),
        isActive: world.activePlayers.has(player.heroId) || player.isSharedBot,
    };
}

class InfoPanelPlayer extends React.Component<Props, State> {
    render() {
        const numKills = this.props.numKills;
        const isAlive = this.props.isAlive;
        const isActive = this.props.isActive;
        const player = this.props.player;

        let colorOverride: string = null;
        if (!(isAlive && isActive)) {
            colorOverride = HeroColors.InactiveColor;
        }

        return <div className="player-list-row" style={{ opacity: isAlive ? 1.0 : 0.5 }}>
            <span className="player-icons" title={numKills + " kills"}>{_.range(0, numKills).map(x => <i key={x} className="ra ra-sword" />)}</span>
            <PlayerName player={player} colorOverride={colorOverride} />
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(InfoPanelPlayer);