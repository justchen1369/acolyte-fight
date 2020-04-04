import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import { heroColor } from '../graphics/render';

interface OwnProps {
    player: w.Player;
}

interface Props extends OwnProps {
    world: w.World;
    players: Immutable.Map<string, w.Player>; // This isn't used, but needs to be here for change detection because world gets mutated
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        world: state.world,
        players: state.world.players,
    };
}

class PlayerName extends React.PureComponent<Props> {
    render() {
        const player = this.props.player;
        const color = heroColor(player.heroId, this.props.world);

        let title = player.name;
        if (player.isBot) {
            title += " is a bot";
        } else if (player.isMobile) {
            title += " is playing on mobile";
        }

        return <span className="player-name" style={{ color }} title={title}>
            {player.name}
            {player.isBot && <i className="fas fa-microchip" title="Bot" />}
            {player.isMobile && <i className="fas fa-mobile" title="Mobile" />}
        </span>;
    }
}

export default ReactRedux.connect(stateToProps)(PlayerName);