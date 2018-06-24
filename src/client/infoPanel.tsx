import _ from 'lodash';
import * as React from 'react';
import { Hero } from '../game/constants';
import * as m from '../game/messages.model';
import * as w from '../game/world.model';

interface Props {
    playerName: string;
    world: w.World;
}
interface State {
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
            <div>
                <div>
                    <div className="welcome-name-label">Welcome {this.props.playerName}!</div>
                    <div className="settings-link">
                        <a href="settings.html" target="_blank">
                            Edit Settings <i className="fa fa-external-link-square-alt" />
                        </a>
                    </div>
                </div>
                {world.activePlayers.size > 0 && <div className="player-list">
                    <div className="player-list-title">
                        {world.tick < world.startTick 
                        ? <span className="waiting-for-players"><i className="fa fa-clock" /> Waiting for players</span>
                        : <span className="player-list-num-players">{world.activePlayers.size} players</span>}
                        
                    </div>
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

        const aliveHeroIds = new Set<string>();
        world.objects.forEach(obj => {
            if (obj.category === "hero") {
                aliveHeroIds.add(obj.id);
            }
        });

        world.players.forEach(player => {
            if (world.activePlayers.has(player.heroId)) {
                let color = player.color;
                if (!aliveHeroIds.has(player.heroId)) {
                    color = Hero.InactiveColor;
                } else if (player.heroId === world.ui.myHeroId) {
                    color = Hero.MyHeroColor;
                }

                result.push(<div key={player.heroId} className="player-list-row">
                    <span style={{color}} className="player-name">{player.name}</span>
                </div>);
            }
        });
        return result;
    }
}