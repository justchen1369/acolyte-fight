import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as playerHelper from '../playerHelper';
import * as StoreProvider from '../../storeProvider';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import Interspersed from '../../controls/interspersed';
import PlayerName from '../playerNameComponent';

interface OwnProps {
    message: s.JoinMessage;
}
interface Props extends OwnProps {
    activePlayers: Immutable.Set<number>;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        activePlayers: state.world.activePlayers,
    };
}

class JoinMessage extends React.PureComponent<Props, State> {
    render() {
        const activePlayers = this.props.message.players.filter(p => this.props.activePlayers.has(p.heroId));
        if (activePlayers.length > 0) {
            return <div className="row">
                <Interspersed items={activePlayers.map(player => <PlayerName key={player.heroId} player={player} />)} /> joined
            </div>
        } else {
            return null;
        }
    }
}

export default ReactRedux.connect(stateToProps)(JoinMessage);