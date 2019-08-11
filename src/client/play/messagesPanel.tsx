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
import LeftMessage from './messages/leftMessage';
import RatingAdjustmentMessage from './messages/ratingAdjustmentMessage';
import TeamsMessage from './messages/teamsMessage';
import TextMessage from './messages/textMessage';
import PlayerName from './playerNameComponent';

interface Props {
    myGameId: string;
    buttonBar: w.ButtonConfig;
    settings: AcolyteFightSettings;
    options: m.GameOptions;
    items: s.NotificationItem[];
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
        items: state.items,
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
        this.props.items.forEach(item => {
            if (now >= item.expiryTime) {
                return;
            }

            const row = this.renderNotification(item.key, item.notification);
            if (!row) {
                return;
            }

            rows.push(row);
        });

        return <div className="messages-panel">
            {rows}
        </div>;
    }

    private renderNotification(key: string, notification: w.Notification): React.ReactNode {
        switch (notification.type) {
            case "disconnected": return this.renderDisconnectedNotification(key, notification);
            case "text": return <TextMessage key={key} notification={notification} />
            case "teams": return <TeamsMessage key={key} notification={notification} />;
            case "closing": return this.renderClosingNotification(key, notification);
            case "join": return this.renderJoinNotification(key, notification);
            case "bot": return this.renderBotNotification(key, notification);
            case "leave": return <LeftMessage key={key} notification={notification} />
            case "kill": return this.renderKillNotification(key, notification);
            case "ratingAdjustment": return <RatingAdjustmentMessage key={key} notification={notification} />
            default: return null; // Ignore this notification
        }
    }

    private renderDisconnectedNotification(key: string, notification: w.DisconnectedNotification) {
        return <div key={key} className="row error">Disconnected from server. Exit the game and try again.</div>
    }

    private renderClosingNotification(key: string, notification: w.CloseGameNotification) {
        if (notification.ticksUntilClose <= 0) {
            if (notification.teamSizes) {
                return <div key={key} className="row game-started">Team game! Your allies are blue. Defeat your enemies together!</div>
            } else {
                return <div key={key} className="row game-started">Game started. Defeat your enemies!</div>;
            }
        } else if (notification.ticksUntilClose <= Matchmaking.JoinPeriod) {
            return null;
        } else {
            return <div key={key} className="row game-started">Waiting {notification.ticksUntilClose / TicksPerSecond} seconds for more players to join...</div>
        }
    }

    private renderJoinNotification(key: string, notification: w.JoinNotification): React.ReactNode {
        return <div key={key} className="row"><PlayerName player={notification.player} /> joined</div>;
    }

    private renderBotNotification(key: string, notification: w.BotNotification): React.ReactNode {
        return <div key={key} className="row"><PlayerName player={notification.player} /> joined</div>;
    }

    private renderKillNotification(key: string, notification: w.KillNotification) {
        if (!notification.killed) {
            return null;
        }

        if (notification.killer) {
            return <div key={key} className="row">
                {notification.killer && <span key="killer"><PlayerName player={notification.killer} /> killed </span>}
                {notification.killed && <span key="killed"><PlayerName player={notification.killed} /> </span>}
            </div>
        } else {
            return <div key={key} className="row"><PlayerName player={notification.killed} /> died</div>
        }
    }
}

export default ReactRedux.connect(stateToProps)(MessagesPanel);