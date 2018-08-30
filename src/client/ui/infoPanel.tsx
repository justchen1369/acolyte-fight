import _ from 'lodash';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import { HeroColors, Matchmaking } from '../../game/constants';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as matches from '../core/matches';
import InfoPanelPlayer from './infoPanelPlayer';

interface Props {
    myHeroId: string;
    activePlayers: Immutable.Set<string>;
    players: Immutable.Map<string, w.Player>;
    started: boolean;
    waitingForPlayers: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    return {
        myHeroId: world.ui.myHeroId,
        activePlayers: world.activePlayers,
        players: world.players,
        started: engine.hasGameStarted(world),
        waitingForPlayers: world.tick < world.startTick,
    };
}

class InfoPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return (
            <div id="info-panel">
                {this.props.activePlayers.size > 0 && <div className="player-list">
                    {this.props.waitingForPlayers
                    ? (
                        <div className="player-list-title">
                            <span className="waiting-for-players"><i className="fa fa-clock" /> Waiting for players</span>
                        </div>
                    ) : (
                        <div className="player-list-title">
                            <span className="player-list-num-players">{this.props.activePlayers.size} players</span>
                        </div>
                    )}
                    {this.renderPlayerList()}
                </div>}
                {this.renderButtons()}
            </div>
        );
    }

    private renderButtons() {
        if (this.props.started || !this.props.myHeroId) {
            return null;
        }

        if (this.props.players.size === 1) {
            return <div className="btn play-vs-ai-btn" onClick={() => matches.addBotToCurrentGame()}>Play vs AI</div>;
        } else if (this.props.players.size > 1 && this.props.players.valueSeq().every(p => p.isBot)) {
            return <div className="btn play-vs-ai-btn" onClick={() => matches.startCurrentGame()}>Start Game</div>;
        } else {
            return null;
        }
    }

    private renderPlayerList() {
        let result = new Array<JSX.Element>();

        this.props.players.forEach(player => {
            result.push(<InfoPanelPlayer key={player.heroId} heroId={player.heroId} />);
        });

        return result;
    }
}

export default ReactRedux.connect(stateToProps)(InfoPanel);