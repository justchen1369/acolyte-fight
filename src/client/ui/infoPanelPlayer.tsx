import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import { HeroColors, Matchmaking } from '../../game/constants';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as matches from '../core/matches';
import { PlayerName } from './playerNameComponent';

interface OwnProps {
    myHeroId: string;
}
interface Props extends OwnProps {
    isAlive: boolean;
    isActive: boolean;
    player: w.Player;
    numKills: number;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const world = state.world;
    const player = world.players.get(ownProps.myHeroId);

    let numKills = 0;
    {
        let scores = world.scores.get(player.heroId);
        if (scores) {
            numKills = scores.kills;
        }
    }

    return {
        myHeroId: ownProps.myHeroId,
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

        let color = player.uiColor;
        if (!(isAlive && isActive)) {
            color = HeroColors.InactiveColor;
        } else if (player.heroId === this.props.myHeroId) {
            color = HeroColors.MyHeroColor;
        }

        return <div className="player-list-row" style={{ opacity: isAlive ? 1.0 : 0.5 }}>
            <span className="player-icons" title={numKills + " kills"}>{_.range(0, numKills).map(x => <i className="ra ra-sword" />)}</span>
            <PlayerName player={player} myHeroId={this.props.myHeroId}/>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(InfoPanelPlayer);