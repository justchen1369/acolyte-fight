import _ from 'lodash';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import { HeroColors, Matchmaking } from '../../game/constants';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as matches from '../core/matches';
import * as recording from '../core/recording';
import * as StoreProvider from '../storeProvider';
import InfoPanelPlayer from './infoPanelPlayer';

interface Team {
    teamId: string;
    name: string;
    heroIds: string[];
}

interface Props {
    gameId: string;
    myHeroId: string;
    activePlayers: Immutable.Set<string>;
    players: Immutable.Map<string, w.Player>;
    teams: Team[];
    started: boolean;
    waitingForPlayers: boolean;
    live: boolean;
    mute?: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    return {
        gameId: world.ui.myGameId,
        myHeroId: world.ui.myHeroId,
        activePlayers: world.activePlayers,
        players: world.players,
        teams: calculateTeams(state),
        started: engine.hasGamePrestarted(world),
        waitingForPlayers: world.tick < world.startTick,
        live: world.ui.live,
        mute: state.options && state.options.mute,
    };
}

const calculateTeams = Reselect.createSelector(
    (state: s.State) => state.world.teams,
    (teamAssignments: Immutable.Map<string, string>) => {
        let nextTeamId = 1;
        const result = new Map<string, Team>();
        teamAssignments.forEach((teamId, heroId) => {
            let team: Team = result.get(teamId);
            if (!team) {
                team = { teamId, name: `Team ${nextTeamId++}`, heroIds: [] };
                result.set(teamId, team);
            }
            team.heroIds.push(heroId);
        });
        return [...result.values()];
    }
);

class InfoPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return (
            <div id="info-panel">
                <div className="info-title">
                    <span className="control-bar"><i className={this.props.mute ? "fas fa-volume-mute clickable" : "fas fa-volume clickable"} onClick={() => this.onToggleMute()} /></span>
                    {this.props.waitingForPlayers
                    ? (
                        <span className="waiting-for-players"><i className="fa fa-clock" /> Waiting for players</span>
                    ) : (
                        <span className="player-list-num-players">{this.props.activePlayers.size} players</span>
                    )}
                </div>
                {<div className="player-list">
                    {this.renderPlayerList()}
                </div>}
                {this.renderButtons()}
            </div>
        );
    }

    private renderButtons() {
        if (this.props.myHeroId) {
            if (!this.props.started && this.props.players.size > 1 && this.props.players.valueSeq().every(p => p.isBot)) {
                return <div className="btn play-vs-ai-btn" onClick={() => matches.startCurrentGame()}>Start Game</div>;
            } else if (this.props.waitingForPlayers && this.props.players.size < Matchmaking.TargetGameSize) {
                return <div className="btn play-vs-ai-btn" onClick={() => matches.addBotToCurrentGame()}>Play vs AI</div>;
            } else {
                return null;
            }
        } else {
            if ((!this.props.live || this.props.activePlayers.size === 0) && recording.isRecordingSupported()) {
                return <div className="btn play-vs-ai-btn" onClick={() => this.onRecordClick()}>Save as Video <i className="fas fa-download" /></div>
            } else {
                return null;
            }
        }
    }

    private onRecordClick() {
        matches.leaveCurrentGame(true);
        recording.enterRecording(this.props.gameId);
    }

    private renderPlayerList() {
        let result = new Array<JSX.Element>();

        if (this.props.teams.length === 0) {
            this.props.players.forEach(player => {
                result.push(<InfoPanelPlayer key={player.heroId} heroId={player.heroId} />);
            });
        } else {
            this.props.teams.forEach(team => {
                result.push(<div key={team.teamId} className="team-title">{team.name}</div>);
                team.heroIds.forEach(heroId => {
                    result.push(<InfoPanelPlayer key={heroId} heroId={heroId} />);
                });
            });
        }

        return result;
    }

    private onToggleMute() {
        StoreProvider.dispatch({
            type: "updateOptions",
            options: {
                mute: !this.props.mute,
            },
        });
    }
}

export default ReactRedux.connect(stateToProps)(InfoPanel);