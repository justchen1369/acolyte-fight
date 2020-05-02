import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as infoPanelHelpers from './metrics';
import * as StoreProvider from '../storeProvider';
import * as m from '../../shared/messages.model';
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
    color: string;
    silenced: boolean;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const world = state.world;
    const userHash = ownProps.online.userHash;

    const playerLookup = playerHelper.calculatePlayerLookup(state);
    const player = playerLookup.get(userHash);

    const Visuals = world.settings.Visuals;
    let color = Visuals.OnlineColor;
    if (userHash === state.world.ui.myUserHash) {
        color = Visuals.MyHeroColor;
    } else if (player && !player.dead) {
        color = heroColor(player.heroId, state.world).string();
    }

    return {
        ...ownProps,
        color,
        silenced: state.silenced.has(userHash),
    };
}

class InfoPanelPlayer extends React.PureComponent<Props, State> {
    render() {
        const color = this.props.color;
        const online = this.props.online;

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