import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as pages from '../core/pages';
import * as rankings from '../core/rankings';
import * as url from '../url';
import Link from '../controls/link';
import RankIcon from '../controls/rankIcon';
import UnrankedTogglePanel from './unrankedTogglePanel';
import UserStatsPanel from './userStatsPanel';

interface OwnProps {
    category: string;
}
interface Props extends OwnProps {
    current: s.PathElements;
    myUserId: string;
    loggedIn: boolean;
    unranked: boolean;
    leagues: m.League[];
}

interface State {
    category: string;
    leaderboard: m.LeaderboardPlayer[];
    profile: m.GetProfileResponse;
    error: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
        myUserId: state.userId,
        loggedIn: state.loggedIn,
        unranked: state.options.unranked,
        leagues: state.leagues,
    };
}

class LeaderboardPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            category: null,
            leaderboard: null,
            profile: null,
            error: null,
        };
    }

    componentWillMount() {
        this.loadDataAsync(this.props.category);

        if (!this.props.leagues) {
            rankings.downloadLeagues(); // Don't await
        }
    }

    componentWillReceiveProps(newProps: Props) {
        const category = newProps.category;
        this.loadDataAsync(category);
    }

    private async loadDataAsync(category: string) {
        if (category !== this.state.category) {
            this.setState({ category, leaderboard: null, error: null });
            try {
                const leaderboard = await rankings.retrieveLeaderboardAsync(category);
                if (category === this.state.category) {
                    this.setState({ leaderboard });
                }

                if (this.props.myUserId && this.props.loggedIn) {
                    const profile = await rankings.retrieveUserStatsAsync(this.props.myUserId);
                    this.setState({ profile });
                }
            } catch(error) {
                console.error("LeaderboardPanel error", error);
                this.setState({ error: `${error}` });
            }
        }
    }

    render() {
        if (this.state.error) {
            return this.renderError();
        } else if (!this.state.leaderboard) {
            return this.renderLoading();
        } else {
            return this.renderLeaderboard();
        }
    }

    private renderLeaderboard() {
        const a = options.getProvider();
        const category = this.state.category;
        const isOnLeaderboard = this.props.myUserId && this.state.leaderboard.some(p => p.userId === this.props.myUserId);
        return <div>
            {!!this.props.myUserId && <UnrankedTogglePanel />}
            {!this.props.unranked && <>
                <UserStatsPanel profileId={this.props.myUserId} category={category} showRanking={true} />
                <p className="view-more-ad">Go to <Link page="profile" profileId={this.props.myUserId}>your profile</Link> for more stats and replays</p>
            </>}
            <h1>Leaderboard</h1>
            <div className="leaderboard">
                {this.state.leaderboard.map((player, index) => this.renderRow(player, index + 1))}
                {!isOnLeaderboard && this.props.loggedIn && this.renderRow(this.createSelfPlayer(this.state.profile, category), null)}
            </div>
        </div>
    }

    private renderRow(player: m.LeaderboardPlayer, position: number) {
        if (!player) {
            return null;
        }

        const title = [
            `${(player.winRate * 100).toFixed(0)}% win rate`,
            `${player.killsPerGame.toFixed(1)} kills per game`,
            `${player.damagePerGame.toFixed(1)} damage per game`,
        ].filter(x => !!x).join(', ');

        const league = this.props.leagues ? rankings.getLeagueFromRating(player.acoExposure, this.props.leagues) : null;

        let className = classNames({
            'leaderboard-row': true,
            'leaderboard-self': player.userId === this.props.myUserId,
        });

        if (league) {
            className += " " + league.name;
        }

        return <div key={player.userId} className={className} title={title}>
            <span className="position">{position}</span>
            {league && <RankIcon league={league.name} />}
            {this.renderPlayerName(player)}
            <span className="win-count">{Math.round(player.acoExposure)} rating <span className="leaderboard-num-games">({player.numGames} games)</span></span>
        </div>
    }

    private createSelfPlayer(profile: m.GetProfileResponse, category: string): m.LeaderboardPlayer {
        if (!profile) {
            return null;
        }

        const userRating = profile.ratings[category];
        if (!userRating) {
            return null;
        }

        const result: m.LeaderboardPlayer = {
            userId: profile.userId,
            name: profile.name,

            aco: userRating.aco,
            acoGames: userRating.acoGames,
            acoExposure: userRating.acoExposure,

            numGames: userRating.numGames,
            winRate: userRating.winRate,
            killsPerGame: userRating.killsPerGame,
            damagePerGame: userRating.damagePerGame,
        };
        return result;
    }

    private renderPlayerName(player: m.LeaderboardPlayer) {
        if (player.userId) {
            const playerUrl = url.getPath({ ...this.props.current, page: "profile", profileId: player.userId });
            return <span className="player-name">
                <a href={playerUrl} onClick={(ev) => this.onPlayerClick(ev, player.userId)}>{player.name}</a>
            </span>
        } else {
            return <span className="player-name">{player.name}</span>
        }
    }

    private onPlayerClick(ev: React.MouseEvent, userId: string) {
        if (userId) {
            ev.preventDefault();
            pages.changePage("profile", userId);
        }
    }

    private renderLoading() {
        return <div>
            <h1>Leaderboard</h1>
            <p className="loading-text">Loading...</p>
        </div>
    }

    private renderError() {
        return <div>
            <h1>Leaderboard</h1>
            <p className="error">Unable to load leaderboard: {this.state.error}</p>
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(LeaderboardPanel);