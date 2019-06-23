import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as playerHelper from '../playerHelper';
import * as StoreProvider from '../../storeProvider';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import PlayerName from '../playerNameComponent';

interface OwnProps {
    notification: w.TextNotification;
}
interface Props extends OwnProps {
    silenced: Set<string>;
    player: w.Player;
    live: boolean;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const playerLookup = playerHelper.calculatePlayerLookup(state);
    return {
        ...ownProps,
        silenced: state.silenced,
        player: playerLookup.get(ownProps.notification.userHash),
        live: state.world.ui.live,
    };
}

class TextMessage extends React.PureComponent<Props, State> {
    render() {
        if (!this.props.live) {
            return null; // Don't show messages in a replay
        }

        const notification = this.props.notification;
        if (this.props.silenced.has(notification.userHash)) {
            return null;
        } else {
            return <div className="row text-row">{this.renderPlayerName()}: <span className="text-message">{notification.text}</span> {this.renderSilenceBtn()}</div>
        }
    }

    private renderPlayerName() {
        const player = this.props.player;
        if (player) {
            return <PlayerName player={player} />;
        } else {
            return <span className="player-name">{this.props.notification.name}</span>
        }
    }

    private renderSilenceBtn() {
        return <i className="silence-btn fas fa-comment-alt-times" onClick={() => this.onSilenceClick(this.props.notification.userHash)} title="Hide all messages from this player" />;
    }

    private onSilenceClick(userHash: string) {
        StoreProvider.dispatch({
            type: "updateSilence",
            add: [userHash],
        });
    }
}

export default ReactRedux.connect(stateToProps)(TextMessage);