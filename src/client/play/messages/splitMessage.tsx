import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as playerHelper from '../playerHelper';
import * as StoreProvider from '../../storeProvider';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import Interspersed from '../../controls/interspersed';
import PlayerName from '../playerNameComponent';

interface OwnProps {
    message: s.SplitMessage;
}

export default class SplitMessage extends React.PureComponent<OwnProps> {
    render() {
        const message = this.props.message;
        const players = message.players.filter(p => !p.isBot);
        return <div className="row">
            <Interspersed items={players.map(player => <PlayerName key={player.heroId} player={player} />)} /> rematched
        </div>
    }
}