import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as credentials from '../core/credentials';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as cloud from '../core/cloud';
import * as matches from '../core/matches';
import * as rankings from '../core/rankings';
import * as storage from '../storage';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

interface OwnProps {
    profileId: string;
    category: string;
    showRanking?: boolean;
    showWinRates?: boolean;
}
interface Props extends OwnProps {
    myProfile: m.GetProfileResponse;
    playerName: string;
    loggedIn: boolean;
    myUserId: string;
    system: string;
}

interface State {
    profileId: string;
    profile: m.GetProfileResponse;
    pointsToNextLeague: rankings.PointsToNextLeagueLookup;
    error: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        myProfile: state.profile,
        playerName: state.playerName,
        loggedIn: state.loggedIn,
        myUserId: state.userId,
        system: rankings.systemOrDefault(state.options.ratingSystem),
    };
}

class UserStatsPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            profileId: null,
            profile: null,
            pointsToNextLeague: {},
            error: null,
        };
    }

    componentWillMount() {
        this.loadDataAsync(this.props.profileId || this.props.myUserId);
    }

    componentWillReceiveProps(newProps: Props) {
        this.loadDataAsync(newProps.profileId || this.props.myUserId);
    }

    private async loadDataAsync(profileId: string) {
        if (profileId !== this.state.profileId) {
            if (profileId) {
                let profile: m.GetProfileResponse = null;
                if (this.props.myProfile && this.props.myProfile.userId === profileId) {
                    profile = this.props.myProfile;
                }
                this.setState({ profileId, profile, pointsToNextLeague: {}, error: null });
                try {
                    const profile = await rankings.retrieveUserStatsAsync(profileId);
                    if (profile.userId === this.state.profileId) {
                        this.setState({ profile });
                    }

                    if (profile.userId === this.props.myUserId) {
                        const pointsToNextLeague = await rankings.retrievePointsToNextLeagueAsync(profile.ratings, this.props.system);
                        if (profile.userId === this.state.profileId) {
                            this.setState({ pointsToNextLeague });
                        }
                    }
                } catch(error) {
                    console.error("UserStatsPanel error", error);
                    this.setState({ error: `${error}` });
                }
            } else {
                this.setState({ profileId, profile: null, error: null });
            }
        }
    }

    render() {
        if (this.state.error) {
            return this.renderError();
        } else if (!this.state.profileId) {
            return this.renderNoProfile();
        } else if (!this.state.profile) {
            return this.renderLoading();
        }

        const profile = this.state.profile;
        const rating = profile.ratings[this.props.category];
        return rating ? this.renderRating(profile, rating) : this.renderNoRating(profile);
    }

    private renderError() {
        return <div>
            <h1>{this.props.playerName}</h1>
            <p className="error">Unable to load data for user: {this.state.error}</p>
        </div>
    }

    private renderLoading() {
        return <div>
            <h1>{this.props.playerName}</h1>
            <p className="loading-text">Loading...</p>
        </div>
    }

    private renderRating(profile: m.GetProfileResponse, rating: m.UserRating) {
        return <div>
            <h1>{profile.name}</h1>
            {this.props.showRanking && this.renderRankingStats(profile, rating)}
            {this.props.showWinRates && this.renderWinRateStats(rating)}
        </div>
    }

    private renderRankingStats(profile: m.GetProfileResponse, rating: m.UserRating) {
        const isMe = profile.userId === this.props.myUserId;
        const isPlaced = rating.numGames >= constants.Placements.MinGames;
        const system = this.props.system;
        const leagueName = system === m.RatingSystem.Glicko ? rankings.getLeagueName(rating.percentile) : rankings.getLeagueName(rating.acoPercentile);
        const nextLeague = this.state.pointsToNextLeague[this.props.category];

        return <div>
            {rating.numGames < constants.Placements.MinGames && <div className="stats-card-row">
                <div className="stats-card">
                    <div className="label">Placement matches remaining</div>
                    <div className="value">{constants.Placements.MinGames - rating.numGames}</div>
                </div>
            </div>}
            {isPlaced && system === m.RatingSystem.Glicko && <div className="stats-card-row">
                <div className="stats-card" title={`${rating.rd.toFixed(0)} rating deviation`}>
                    <div className="label">Rating</div>
                    <div className="value">{rating.lowerBound.toFixed(0)}</div>
                </div>
                <div className="stats-card" title={`${rating.percentile.toFixed(1)} percentile`}>
                    <div className="label">League</div>
                    <div className="value">{leagueName}</div>
                </div>
            </div>}
            {isPlaced && system === m.RatingSystem.Aco && <div className="stats-card-row">
                <div className="stats-card" title={`${rating.aco.toFixed(0)} skill points`}>
                    <div className="label">Rating</div>
                    <div className="value">{rating.acoExposure.toFixed(0)}</div>
                </div>
                <div className="stats-card" title={`${rating.acoPercentile.toFixed(1)} percentile`}>
                    <div className="label">League</div>
                    <div className="value">{leagueName}</div>
                </div>
            </div>}
            {isMe && isPlaced && nextLeague && <p className="points-to-next-league">
                You are currently in the <b>{leagueName}</b> league. +{Math.ceil(nextLeague.pointsRemaining)} points until you are promoted into the {nextLeague.name} league.
            </p>}
        </div>
    }

    private renderWinRateStats(rating: m.UserRating) {
        return <div>
            <h2>Previous {rating.numGames} games</h2>
            <div className="stats-card-row">
                <div className="stats-card">
                    <div className="label">Win rate</div>
                    <div className="value">{Math.round(100 * rating.winRate)}%</div>
                </div>
                <div className="stats-card">
                    <div className="label">Kills per game</div>
                    <div className="value">{rating.killsPerGame.toFixed(1)}</div>
                </div>
                <div className="stats-card">
                    <div className="label">Damage per game</div>
                    <div className="value">{Math.round(rating.damagePerGame)}</div>
                </div>
            </div>
        </div>;
    }

    private renderNoRating(profile: m.GetProfileResponse) {
        return <div>
            <h1>{profile.name}</h1>
            {this.props.category === m.GameCategory.PvP && <div className="stats-card-row">
                <div className="stats-card">
                    <div className="label">Placement matches remaining</div>
                    <div className="value">{constants.Placements.MinGames}</div>
                </div>
            </div>}
        </div>
    }

    private renderNoProfile() {
        const a = options.getProvider();
        return <div>
            <h1>{this.props.playerName}</h1>
            {!a.noLogin && !this.props.loggedIn && <p className="login-ad"><div className="btn" onClick={() => window.location.href = "login"}>Login</div> to receive your rating and stats</p>}
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(UserStatsPanel);