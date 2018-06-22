import * as _ from 'lodash';
import * as React from 'react';
import { Hero } from '../game/constants';
import * as w from '../game/model';

interface Props {
    playerName: string;
    world: w.World;
}
interface State {
    showingPlayerList: boolean;
}

export class InfoPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showingPlayerList: true,
        };
    }

    render() {
        const world = this.props.world;

        let playerListIconClass = this.state.showingPlayerList ? "fa fa-chevron-circle-down" : "fa fa-chevron-circle-up";
        return (
            <div>
                <div>
                    <div>Welcome {this.props.playerName}!</div>
                    <div style={{ fontSize: "80%" }}>
                        <a href="settings.html" target="_blank">
                            Edit Settings <i className="fa fa-external-link-square-alt" />
                        </a>
                    </div>
                </div>
                {world.activePlayers.size > 0 && <div className="player-list">
                    <div>{world.activePlayers.size} players <i className={playerListIconClass} style={{cursor: "hand"}} onClick={() => this.toggleShowPlayers()} /></div>
                    {this.state.showingPlayerList && this.renderPlayerList(world)}
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
                result.push(<div key={player.heroId} style={{color}}>{player.name}</div>);
            }
        });
        return result;
    }

    private toggleShowPlayers() {
        this.setState({
            showingPlayerList: !this.state.showingPlayerList,
        });
    }
}