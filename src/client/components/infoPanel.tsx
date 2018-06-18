import * as _ from 'lodash';
import * as React from 'react';
import * as c from '../../game/constants';
import * as w from '../world.model';

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
            <div className="controls">
                <div>
                    <div>Welcome {this.props.playerName}!</div>
                    <div style={{ fontSize: "80%" }}>
                        <a href="settings.html" target="_blank">
                            Edit Settings <i className="fa fa-external-link-square-alt" />
                        </a>
                    </div>
                </div>
                {world.activePlayers.size > 0 && <div style={{marginTop: 40}}>
                    <div>{world.activePlayers.size} players <i className={playerListIconClass} style={{cursor: "hand"}} onClick={() => this.toggleShowPlayers()} /></div>
                    {this.state.showingPlayerList && this.renderPlayerList(world)}
                </div>}
            </div>
        );
    }

    onNotificationsChanged() {
        this.forceUpdate();
    }

    private renderPlayerList(world: w.World) {
        let result = new Array<JSX.Element>();
        world.players.forEach(player => {
            if (world.activePlayers.has(player.heroId)) {
                let color = player.color;
                if (player.heroId === world.ui.myHeroId) {
                    color = c.Hero.MyHeroColor;
                }
                result.push(<div style={{color}}>{player.name}</div>);
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