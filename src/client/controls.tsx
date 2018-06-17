import * as _ from 'lodash';
import * as React from 'react';
import * as c from '../game/constants';
import * as w from './world.model';

interface Props {
    playerName: string;
    world: w.World;
}
interface State {
    showingPlayerList: boolean;
}

export class Controls extends React.Component<Props, State> {
    private refreshTimer = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            showingPlayerList: true,
        };
    }

    componentDidMount() {
        this.refreshTimer = setInterval(() => this.onRefreshInterval(), 1000);
    }

    componentWillUnmount() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
    }

    render() {
        const world = this.props.world;

        let heroes = new Array<w.Hero>();
        world.objects.forEach(obj => {
            if (obj.category === "hero" && world.activePlayers.has(obj.id)) {
                heroes.push(obj);
            }
        });

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
                {heroes.length > 0 && <div style={{marginTop: 40}}>
                    <div>{heroes.length} players <i className={playerListIconClass} onClick={() => this.toggleShowPlayers()} /></div>
                    {this.state.showingPlayerList && heroes.map(hero => {
                        const color = hero.id === world.ui.myHeroId ? c.Hero.MyHeroColor : hero.fillStyle;
                        return <div style={{color}}>{hero.name}</div>
                    })}
                </div>}
            </div>
        );
    }

    private toggleShowPlayers() {
        this.setState({
            showingPlayerList: !this.state.showingPlayerList,
        });
    }

    private onRefreshInterval() {
        this.forceUpdate();
    }
}