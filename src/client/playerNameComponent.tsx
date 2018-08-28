import * as _ from 'lodash';
import * as React from 'react';
import * as s from './store.model';
import * as w from '../game/world.model';
import { HeroColors, Matchmaking } from '../game/constants';
import { PlayButton } from './playButton';
import { isMobile } from './userAgent';

interface Props {
    player: w.Player;
    world: w.World;
}

export class PlayerName extends React.Component<Props> {
    render() {
        const player = this.props.player;
        const world = this.props.world;
        
        let color;
        if (player.heroId === world.ui.myHeroId) {
            color = HeroColors.MyHeroColor;
        } else {
            color = player.uiColor;
        }

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