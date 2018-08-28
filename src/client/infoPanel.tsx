import _ from 'lodash';
import * as React from 'react';
import { HeroColors, Matchmaking } from '../game/constants';
import * as s from './store.model';
import * as w from '../game/world.model';
import { PlayerName } from './playerNameComponent';

interface Props {
    playVsAiCallback: () => void;
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
                {(world.ui.myHeroId && world.players.size === 1) && this.renderPlayVsAiBtn()}
            </div>
        );
    }

    onNotification(notifications: w.Notification[]) {
        this.forceUpdate();
    }

    private renderPlayVsAiBtn() {
        return <div className="btn play-vs-ai-btn" onClick={() => this.onPlayVsAiClick()}>Play vs AI</div>;
    }

    private onPlayVsAiClick() {
        this.props.playVsAiCallback();
    }

    private renderPlayerList(world: w.World) {
        let result = new Array<JSX.Element>();

        world.players.forEach(player => {
            let numKills = 0;
            {
                let scores = world.scores.get(player.heroId);
                if (scores) {
                    numKills = scores.kills;
                }
            }

            const isAlive = world.objects.has(player.heroId);
            const isActive = world.activePlayers.has(player.heroId) || player.isSharedBot;

            let color = player.uiColor;
            if (!(isAlive && isActive)) {
                color = HeroColors.InactiveColor;
            } else if (player.heroId === world.ui.myHeroId) {
                color = HeroColors.MyHeroColor;
            }

            result.push(<div key={player.heroId} className="player-list-row" style={{ opacity: isAlive ? 1.0 : 0.5 }}>
                <span className="player-icons" title={numKills + " kills"}>{_.range(0, numKills).map(x => <i className="ra ra-sword" />)}</span>
                <PlayerName player={player} world={world} />
            </div>);
        });

        return result;
    }
}