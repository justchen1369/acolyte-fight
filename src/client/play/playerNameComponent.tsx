import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import { anonymize } from './anonymizer';
import { HeroColors } from '../../game/constants';

interface OwnProps {
    player: w.Player;
    colorOverride?: string;
}
interface Props extends OwnProps {
    myHeroId: string;
    anonymous: boolean;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        myHeroId: state.world.ui.myHeroId,
        anonymous: anonymize(ownProps.player, state.world),
    };
}

class PlayerName extends React.PureComponent<Props> {
    render() {
        const player = this.props.player;
        
        let color;
        if (this.props.colorOverride) {
            color = this.props.colorOverride;
        } else if (this.props.anonymous) {
            color = HeroColors.AnonymousColor;
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

export default ReactRedux.connect(stateToProps)(PlayerName);