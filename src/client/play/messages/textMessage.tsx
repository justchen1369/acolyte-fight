import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as chats from '../chats';
import * as playerHelper from '../playerHelper';
import * as StoreProvider from '../../storeProvider';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import PlayerName from '../playerNameComponent';

interface OwnProps {
    message: s.TextMessage;
}
interface Props extends OwnProps {
    myUserHash: string;
    silenced: Set<string>;
    player: w.Player;
    live: boolean;
    touched: boolean;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const playerLookup = playerHelper.calculatePlayerLookup(state);
    return {
        ...ownProps,
        myUserHash: state.world.ui.myUserHash,
        silenced: state.silenced,
        player: playerLookup.get(ownProps.message.userHash),
        live: state.world.ui.live,
        touched: state.touched,
    };
}

class TextMessage extends React.PureComponent<Props, State> {
    render() {
        if (!this.props.live) {
            return null; // Don't show messages in a replay
        }

        const message = this.props.message;
        if (this.props.silenced.has(message.userHash)) {
            return null;
        } else {
            return <div className="row text-row">
                <span>{this.renderPlayerName()}: {this.renderMessage(message.text)}</span>
                {this.renderSilenceBtn()}
            </div>
        }
    }

    private renderMessage(text: string) {
        if (chats.isLink(text)) {
            return <a href={text} target="_blank" className="text-message">{text}</a>
        } else {
            return <span className="text-message">{text}</span>
        }
    }

    private renderPlayerName() {
        const player = this.props.player;
        if (player) {
            return <PlayerName player={player} />;
        } else {
            return <span className="player-name">{this.props.message.name}</span>
        }
    }

    private renderSilenceBtn() {
        if (this.props.touched) {
            return null; // Too easy to click by mistake mid-game
        }

        if (this.props.message.userHash === this.props.myUserHash) {
            return null; // Cannot self-silence
        }

        return <i
            className="silence-btn fas fa-comment-alt-times"
            onClick={() => this.onSilenceClick(this.props.message.userHash)}
            title={`Hide all messages from ${this.props.message.name}`}
            />;
    }

    private onSilenceClick(userHash: string) {
        StoreProvider.dispatch({
            type: "updateSilence",
            add: [userHash],
        });
    }
}

export default ReactRedux.connect(stateToProps)(TextMessage);