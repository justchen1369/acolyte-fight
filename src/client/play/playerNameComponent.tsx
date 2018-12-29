import * as _ from 'lodash';
import * as React from 'react';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import { HeroColors } from '../../game/constants';

interface Props {
    player: w.Player;
    myHeroId: string;
    colorOverride?: string;
}

export class PlayerName extends React.PureComponent<Props> {
    render() {
        const player = this.props.player;
        
        let color;
        if (this.props.colorOverride) {
            color = this.props.colorOverride;
        } else if (player.heroId === this.props.myHeroId) {
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