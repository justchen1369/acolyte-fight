import * as _ from 'lodash';
import * as React from 'react';
import * as c from '../../game/constants';
import * as w from '../world.model';

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
    notification: w.Notification;
    expiryTime: number;
}

export class MessagesPanel extends React.Component<Props, State> {
    private intervalHandle = null;
    
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
        clearInterval(this.intervalHandle);
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
        const world = this.props.world;

        return (
            <div>{this.state.items.map(item => (
                <div style={{ opacity: this.calculateOpacity(item) }}>{this.renderNotification(item.notification)}</div>
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
        const expiryTime = new Date().getTime() + ExpiryMilliseconds;
        const newItems = newNotifications.map(notification => ({ notification, expiryTime } as NotificationItem));
        this.setState({
            items: [ ...this.state.items, ...newItems ],
        });
    }

    private renderNotification(notification: w.Notification) {
        switch (notification.type) {
            case "join": return this.renderJoinNotification(notification);
            case "leave": return this.renderLeaveNotification(notification);
            case "kill": return this.renderKillNotification(notification);
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
        return <span>
            {notification.killer && <span key="killer">{this.renderPlayer(notification.killer)} killed </span>}
            {notification.killed && <span key="killed">{this.renderPlayer(notification.killed)}</span>}
            {notification.assist && <span key="assist"> assist {this.renderPlayer(notification.assist)}</span>}
        </span>
    }

    private renderPlayer(player: w.Player) {
        let color = player.color;
        if (player.heroId === this.state.myHeroId) {
            color = c.Hero.MyHeroColor;
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