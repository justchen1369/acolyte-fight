import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as infoPanelHelpers from './metrics';
import * as StoreProvider from '../storeProvider';
import * as m from '../../game/messages.model';
import * as playerHelper from './playerHelper';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import { heroColor } from '../graphics/render';

interface OwnProps {
    metric: string;
    rank: number;
    online: m.OnlinePlayerMsg;
}
interface Props extends OwnProps {
    player: w.Player | null;
    silenced: boolean;
    world: w.World;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const userHash = ownProps.online.userHash;
    const playerLookup = playerHelper.calculatePlayerLookup(state);
    return {
        ...ownProps,
        player: playerLookup.get(userHash),
        silenced: state.silenced.has(userHash),
        world: state.world,
    };
}

class InfoPanelPlayer extends React.PureComponent<Props, State> {
    render() {
        const online = this.props.online;
        const player = this.props.player;

        let color = constants.HeroColors.OnlineColor;
        if (player && !player.dead) {
            color = heroColor(player.heroId, this.props.world);
        }

        const metric = this.props.metric;
        const metricValue = infoPanelHelpers.metricToValue(metric, online);

        return <tr className="player-list-row">
            <td className="player-list-name" >{this.renderUnsilenceBtn()} <span className="player-rank">#{this.props.rank}</span> <span className="player-name" style={{ color }}>{online.name}</span></td>
            <td className="player-list-metric">{metricValue}</td>
        </tr>;
    }

    private renderUnsilenceBtn() {
        if (this.props.silenced) {
            const userHash = this.props.online.userHash;
            return <i className="silence-btn fas fa-comment-alt-times" onClick={() => this.onUnsilenceClick(userHash)} title="Click to unmute player" />;
        } else {
            return null;
        }
    }

    private onUnsilenceClick(userHash: string) {
        StoreProvider.dispatch({
            type: "updateSilence",
            remove: [userHash],
        });
    }
}

export default ReactRedux.connect(stateToProps)(InfoPanelPlayer);