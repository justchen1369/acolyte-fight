import * as _ from 'lodash';
import * as React from 'react';
import * as w from '../game/world.model';
import { Hero, TicksPerSecond } from '../game/constants';

const ExpiryMilliseconds = 15000;
const FadeoutMilliseconds = 5000;

interface Props {
    world: w.World;
}
interface State {
    items: NotificationItem[];
    myHeroId: string;
    now: number;
}

interface NotificationItem {
    element: JSX.Element;
    expiryTime: number;
}

export class MessagesPanel extends React.Component<Props, State> {
    private intervalHandle: NodeJS.Timer = null;
    
    constructor(props: Props) {
        super(props);
        this.state = {
            items: [],
            myHeroId: null,
            now: new Date().getTime(),
        };
    }

    componentDidMount() {
        this.intervalHandle = setInterval(() => this.onInterval(), 100);
    }

    componentWillUnmount() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
        }
    }

    private onInterval() {
        if (this.state.items.length === 0) {
            return;
        }

        const now = new Date().getTime();
        let items = new Array<NotificationItem>();
        this.state.items.forEach(item => {
            if (item.expiryTime > now) {
                items.push(item);
            }
        });
        this.setState({ now, items });
    }

    render() {
        return (
            <div>{this.state.items.map(item => (
                <div style={{ opacity: this.calculateOpacity(item) }}>{item.element}</div>
            ))}</div>
        );
    }

    onNotification(newNotifications: w.Notification[]) {
        // Detect if my hero ID has changed
        newNotifications.forEach(n => {
            if (n.type === "myHero") {
                this.setState({ myHeroId: n.heroId });
            }
        });

        // Add notifications to list
        this.addNotifications(...newNotifications.map(n => this.renderNotification(n)));
    }

    private addNotifications(...notificationElements: JSX.Element[]) {
        const expiryTime = new Date().getTime() + ExpiryMilliseconds;
        const newItems = [...this.state.items];
        notificationElements.forEach(element => {
            newItems.push({ element, expiryTime });
        });
        this.setState({ items: newItems });
    }

    private renderNotification(notification: w.Notification) {
        switch (notification.type) {
            case "help": return this.renderHelpNotification(notification);
            case "closing": return this.renderClosingNotification(notification);
            case "join": return this.renderJoinNotification(notification);
            case "leave": return this.renderLeaveNotification(notification);
            case "kill": return this.renderKillNotification(notification);
            default: return null; // Ignore this notification
        }
    }

    private renderHelpNotification(notification: w.HelpNotification) {
        return <span className="help-text">Use the mouse to move!</span>
    }

    private renderClosingNotification(notification: w.CloseGameNotification) {
        if (notification.ticksUntilClose <= 0) {
            return <span className="game-started">Game started</span>
        } else {
            return null;
        }
    }

    private renderJoinNotification(notification: w.JoinNotification) {
        return <span>
            {this.renderPlayer(notification.player)} joined
        </span>
    }

    private renderLeaveNotification(notification: w.LeaveNotification) {
        return <span>
            {this.renderPlayer(notification.player)} left
        </span>
    }

    private renderKillNotification(notification: w.KillNotification) {
        if (!notification.killed) {
            return null;
        }

        if (notification.killer) {
            return <span>
                {notification.killer && <span key="killer">{this.renderPlayer(notification.killer)} killed </span>}
                {notification.killed && <span key="killed">{this.renderPlayer(notification.killed)} </span>}
                {notification.assist && <span key="assist">assist {this.renderPlayer(notification.assist)} </span>}
            </span>
        } else {
            return <span key="killed">{this.renderPlayer(notification.killed)} died</span>
        }
    }

    private renderPlayer(player: w.Player) {
        let color = player.color;
        if (player.heroId === this.state.myHeroId) {
            color = Hero.MyHeroColor;
        }
        return <span className="player-name" style={{ color }}>{player.name}</span>;
    }

    private calculateOpacity(item: NotificationItem): number {
        const millisecondsToExpiry = item.expiryTime - this.state.now;
        if (millisecondsToExpiry <= 0) {
            return 0;
        } else if (millisecondsToExpiry < FadeoutMilliseconds) {
            const proportion = 1.0 * millisecondsToExpiry / FadeoutMilliseconds;
            return proportion;
        } else {
            return 1;
        }
    }
}