import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as constants from '../../game/constants';
import * as options from '../options';
import * as StoreProvider from '../storeProvider';
import { Matchmaking, TicksPerSecond } from '../../game/constants';
import JoinMessage from './messages/joinMessage';
import LeftMessage from './messages/leftMessage';
import RatingAdjustmentMessage from './messages/ratingAdjustmentMessage';
import SplitMessage from './messages/splitMessage';
import TextMessage from './messages/textMessage';
import PlayerName from './playerNameComponent';

interface Props {
    myGameId: string;
    buttonBar: w.ButtonConfig;
    settings: AcolyteFightSettings;
    options: m.GameOptions;
    messages: s.MessageItem[];
}
interface State {
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    return {
        myGameId: world.ui.myGameId,
        buttonBar: world.ui.buttonBar,
        settings: world.settings,
        options: state.options,
        messages: state.messages,
    };
}

class MessagesPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            spectatingGameId: null,
        };
    }

    render() {
        let rows = new Array<React.ReactNode>();
        const now = new Date().getTime();
        this.props.messages.forEach(msg => {
            if (now >= msg.expiryTime) {
                return;
            }

            const row = this.renderMessage(msg.key, msg.message);
            if (!row) {
                return;
            }

            rows.push(row);
        });

        return <div className="messages-panel">
            {rows}
        </div>;
    }

    private renderMessage(key: string, message: s.Message): React.ReactNode {
        switch (message.type) {
            case "disconnected": return this.renderDisconnectedNotification(key, message);
            case "text": return <TextMessage key={key} message={message} />
            case "starting": return this.renderStartingNotification(key, message);
            case "join": return <JoinMessage key={key} message={message} />
            case "split": return <SplitMessage key={key} message={message} />
            case "leave": return <LeftMessage key={key} message={message} />
            case "kill": return this.renderKillNotification(key, message);
            case "ratingAdjustment": return <RatingAdjustmentMessage key={key} message={message} />
            default: return null; // Ignore this notification
        }
    }

    private renderDisconnectedNotification(key: string, message: s.DisconnectedMessage) {
        return <div key={key} className="row error">Disconnected from server. Exit the game and try again.</div>
    }

    private renderStartingNotification(key: string, message: s.StartingMessage) {
        if (message.ticksUntilClose <= 0) {
            return <div key={key} className="row game-started">{message.message}</div>;
        } else if (message.ticksUntilClose <= Matchmaking.JoinPeriod) {
            return null;
        } else {
            return <div key={key} className="row game-started">Waiting {message.ticksUntilClose / TicksPerSecond} seconds for more players to join...</div>
        }
    }

    private renderKillNotification(key: string, message: s.KillMessage) {
        if (!message.killed) {
            return null;
        }

        if (message.killer) {
            return <div key={key} className="row">
                {message.killer && <span key="killer"><PlayerName player={message.killer} /> killed </span>}
                {message.killed && <span key="killed"><PlayerName player={message.killed} /> </span>}
            </div>
        } else {
            return <div key={key} className="row"><PlayerName player={message.killed} /> died</div>
        }
    }
}

export default ReactRedux.connect(stateToProps)(MessagesPanel);