import _ from 'lodash';
import classNames from 'classnames';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as p from './profile.model';
import * as s from '../store.model';
import * as constants from '../../game/constants';
import * as mathUtils from '../core/mathUtils';
import * as pages from '../core/pages';
import * as rankings from '../core/rankings';
import * as regions from '../core/regions';
import * as replays from '../core/replays';
import * as stats from '../core/stats';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import GamePlayer from './gamePlayer';

interface OwnProps {
    game: p.GameRow;
}
interface Props extends OwnProps {
    current: s.PathElements;
    region: string;
    hasReplayLookup: Map<string, string>;
}
interface State {
    expand: boolean;
    error: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
        hasReplayLookup: state.hasReplayLookup,
        region: state.region,
    };
}

function joinWithComma(elements: JSX.Element[]): Array<JSX.Element | string> {
    const result = new Array<JSX.Element | string>();
    elements.forEach(elem => {
        if (result.length > 0) {
            result.push(", ");
        }
        result.push(elem);
    });
    return result;
}

class GameRow extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            expand: false,
            error: null,
        };
    }

    render() {
        const game = this.props.game;
        const self = game.players.get(game.self);
        const hasReplay = this.props.hasReplayLookup.get(game.id);
        const hasRating = self && self.acoDelta && !(self.initialNumGames < constants.Placements.MinGames);
        const canExpand = hasRating && self.acoChanges.length > 0;
        return <div key={game.id} className="game-card" onClick={() => this.onToggleExpand()}>
            <div className="game-summary">
                <div className="game-info">
                    <div className="label">
                        <span className="timestamp">{game.createdTimestamp.fromNow()}</span>
                        {hasReplay && <a className="watch" href={this.gameUrl(game)} onClick={(ev) => this.onWatchGameClicked(ev, game)}> - watch <i className="fas fa-video" /></a>}
                    </div>
                    <div className="player-list">{joinWithComma([...game.players.values()].map(player => <GamePlayer key={player.userHash} player={player} />))}</div>
                </div>
                <div className="spacer" />
                {canExpand && <div title="Click for more details" className="expander"><i className="fas fa-caret-down" /></div>}
                {hasRating && this.renderRatingDelta(self.acoDelta)}
            </div>
            {canExpand && this.state.expand && this.renderGameDetail(self)}
        </div>
    }

    private renderRatingDelta(delta: number) {
        const className = classNames({
            'rating': true,
            'rating-increase': delta >= 0,
            'rating-decrease': delta < 0,
        });
        let text = mathUtils.deltaPrecision(delta);
        return <div className="rating-container">
            <div title="Rating adjustment" className={className}>{text}</div>
        </div>
    }

    private renderGameDetail(self: p.PlayerStats) {
        return <div className="game-detail">
            {this.renderActivityGain(self)}
            {self.acoChanges.map(change => this.renderRatingChange(change))}
        </div>
    }

    private renderActivityGain(self: p.PlayerStats) {
        if (self.initialAcoGames < constants.Placements.MaxActivityGames) {
            return <div className="adjustment-detail">
                <div className="adjustment-label">
                    <div className="adjustment-label-title">Activity bonus {self.initialAcoGames + 1}/{constants.Placements.MaxActivityGames}</div>
                    <div className="adjustment-label-subtitle">Expires after {constants.Placements.AcoDecayLengthDays} days</div>
                </div>
                <div className="spacer" />
                {this.renderRatingDelta(constants.Placements.ActivityBonusPerGame)}
            </div>
        } else {
            return null;
        }
    }

    private renderRatingChange(change: m.AcoChangeMsg) {
        const game = this.props.game;
        const others = [...game.players.values()].filter(p => p.teamId === change.otherTeamId).map(p => p.name);

        const odds = (1 / (1 - change.e)) - 1;
        return <div className="adjustment-detail">
            <div className="adjustment-label">
                <div className="adjustment-label-title">{change.delta >= 0 ? "Won vs" : "Lost vs"} {others.join(", ")}</div>
                {change.delta >= 0 && <div className="adjustment-label-subtitle">You would have lost {mathUtils.deltaPrecision(-change.delta * odds)} ({(change.e * 100).toFixed(0)}% win probability)</div>}
                {change.delta < 0 && <div className="adjustment-label-subtitle">You would have gained {mathUtils.deltaPrecision(-change.delta * odds)} ({(change.e * 100).toFixed(0)}% win probability)</div>}
            </div>
            <div className="spacer" />
            {this.renderRatingDelta(change.delta)}
        </div>
    }

    private gameUrl(game: p.GameRow): string {
        const region = regions.getRegion(game.server);
        const origin = regions.getOrigin(region);
        const path = url.getPath({
            gameId: game.id,
            party: null,
            server: null,
            page: null,
        });
        return origin + path;
    }

    private onWatchGameClicked(ev: React.MouseEvent, game: p.GameRow) {
        ev.preventDefault();

        replays.watch(game.id, game.server);
    }

    private onToggleExpand() {
        this.setState({ expand: !this.state.expand });
    }
}

export default ReactRedux.connect(stateToProps)(GameRow);