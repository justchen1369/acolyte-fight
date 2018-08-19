import _ from 'lodash';
import * as React from 'react';
import { HeroColors, Matchmaking } from '../game/constants';
import * as w from '../game/world.model';

interface Props {
    playerName: string;
    world: w.World;
}
interface State {
}

interface PlayerListItem {
    heroId: string;
    name: string;
    isBot: boolean;
    color: string;
}

export class InfoPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const world = this.props.world;

        return (
            <div id="info-panel">
                {world.activePlayers.size > 0 && <div className="player-list">
                    {world.tick < world.startTick 
                    ? (
                        <div className="player-list-title">
                            <span className="waiting-for-players"><i className="fa fa-clock" /> Waiting for players</span>
                        </div>
                    ) : (
                        <div className="player-list-title">
                            <span className="player-list-num-players">{world.activePlayers.size} players</span>
                        </div>
                    )}
                    {this.renderPlayerList(world)}
                </div>}
            </div>
        );
    }

    onNotification(notifications: w.Notification[]) {
        this.forceUpdate();
    }

    private renderPlayerList(world: w.World) {
        let result = new Array<JSX.Element>();

        this.playerListItems(world).forEach(item => {
            let numKills = 0;
            {
                let scores = world.scores.get(item.heroId);
                if (scores) {
                    numKills = scores.kills;
                }
            }

            const isAlive = world.objects.has(item.heroId);

            result.push(<div key={item.heroId} className="player-list-row" style={{ opacity: isAlive ? 1.0 : 0.5 }}>
                <span className="player-icons" title={numKills + " kills"}>{_.range(0, numKills).map(x => <i className="ra ra-sword" />)}</span>
                <span style={{ color: item.color }} className="player-name">{item.name}{item.isBot && <i className="fas fa-microchip bot" />}</span>
            </div>);
        });

        return result;
    }

    private playerListItems(world: w.World): PlayerListItem[] {
        const items = new Array<PlayerListItem>();

        world.players.forEach(player => {
            const isAlive = world.objects.has(player.heroId);
            const isActive = world.activePlayers.has(player.heroId);

            let color = player.uiColor;
            if (!(isAlive && isActive)) {
                color = HeroColors.InactiveColor;
            } else if (player.heroId === world.ui.myHeroId) {
                color = HeroColors.MyHeroColor;
            }

            items.push({
                heroId: player.heroId,
                name: player.name,
                color,
                isBot: false,
            });
        });
        world.bots.forEach(heroId => {
            items.push({
                heroId,
                name: Matchmaking.BotName,
                color: HeroColors.BotColor,
                isBot: true,
            });
        });
        return items;
    }
}