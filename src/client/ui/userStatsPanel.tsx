import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as matches from '../core/matches';
import * as storage from '../storage';
import * as url from '../url';

interface League {
    name: string;
    minPercentile: number;
}
interface PointsToNextLeagueLookup {
    [category: string]: number;
}

interface OwnProps {
    profileId: string;
    category: string;
    more: boolean;
}
interface Props extends OwnProps {
    playerName: string;
    loggedIn: boolean;
    myUserId: string;
}

interface State {
    profileId: string;
    profile: m.GetProfileResponse;
    pointsToNextLeague: PointsToNextLeagueLookup;
    error: string;
}

export const leagues = [
    { name: "Grandmaster", minPercentile: constants.Placements.Grandmaster },
    { name: "Master", minPercentile: constants.Placements.Master },
    { name: "Diamond", minPercentile: constants.Placements.Diamond },
    { name: "Platinum", minPercentile: constants.Placements.Platinum },
    { name: "Gold", minPercentile: constants.Placements.Gold },
    { name: "Silver", minPercentile: constants.Placements.Silver },
    { name: "Bronze", minPercentile: constants.Placements.Bronze },
    { name: "Wood", minPercentile: constants.Placements.Wood },
];

async function retrieveUserStatsAsync(profileId: string) {
    const res = await fetch(`${url.base}/api/profile?p=${encodeURIComponent(profileId)}`, {
        credentials: 'same-origin'
    });
    if (res.status === 200) {
        const json = await res.json() as m.GetProfileResponse;
        return json;
    } else {
        throw await res.text();
    }
}

async function retrievePointsToNextLeagueAsync(profile: m.GetProfileResponse): Promise<PointsToNextLeagueLookup> {
    const categories = [m.GameCategory.PvP];
    const lookup: PointsToNextLeagueLookup = {};
    for (const category of categories) {
        const userRating = profile.ratings[category];
        if (!userRating) {
            continue;
        }

        const ratingLB = userRating.lowerBound;
        const percentile = userRating.percentile;
        if (ratingLB && percentile) {
            lookup[category] = await calculatePointsUntilNextLeague(ratingLB, percentile, category);
        }
    }
    return lookup;
}

async function retrieveRatingAtPercentile(category: string, percentile: number): Promise<number> {
    const res = await fetch(`${url.base}/api/ratingAtPercentile?category=${encodeURIComponent(category)}&percentile=${percentile}`, {
        credentials: 'same-origin',
    });
    if (res.status === 200) {
        const json = await res.json() as m.GetRatingAtPercentileResponse;
        return json.rating;
    } else {
        throw await res.text();
    }
}

async function calculatePointsUntilNextLeague(ratingLB: number, percentile: number, category: string): Promise<number> {
    const nextLeague = calculateNextLeague(percentile);
    if (!nextLeague) {
        return null;
    }

    const minRating = await retrieveRatingAtPercentile(category, Math.ceil(nextLeague.minPercentile));
    if (minRating) {
        return minRating - ratingLB;
    } else {
        return null;
    }
}

function calculateNextLeague(percentile: number): League {
    const higher = leagues.filter(l => percentile < l.minPercentile);
    if (higher.length === 0) {
        return null;
    }

    return _.minBy(higher, l => l.minPercentile);
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        playerName: state.playerName,
        loggedIn: state.loggedIn,
        myUserId: state.userId,
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
        this.loadDataAsync(this.props.profileId);
    }

    componentWillReceiveProps(newProps: Props) {
        this.loadDataAsync(newProps.profileId);
    }

    private async loadDataAsync(profileId: string) {
        if (profileId !== this.state.profileId) {
            this.setState({ profileId, profile: null, error: null });
            try {
                const profile = await retrieveUserStatsAsync(profileId);
                if (profile.userId === this.state.profileId) {
                    this.setState({ profile });
                }

                if (this.props.myUserId === this.props.profileId) {
                    const pointsToNextLeague = await retrievePointsToNextLeagueAsync(profile);
                    this.setState({ pointsToNextLeague });
                }
            } catch(error) {
                console.error("UserStatsPanel error", error);
                this.setState({ error: `${error}` });
            }
        }
    }

    render() {
        if (this.state.error) {
            return this.renderError();
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
            {this.renderRankingStats(profile, rating)}
            {this.props.more && this.renderWinRateStats(rating)}
        </div>
    }

    private renderRankingStats(profile: m.GetProfileResponse, rating: m.UserRating) {
        const isMe = this.props.loggedIn && profile.userId === this.props.myUserId;
        const isPlaced = rating.numGames >= constants.Placements.MinGames;
        const leagueName = this.getLeagueName(rating.percentile);
        const pointsUntilNextLeague = this.state.pointsToNextLeague[this.props.category];
        return <div>
            {rating.numGames < constants.Placements.MinGames && <div className="stats-card-row">
                <div className="stats-card">
                    <div className="label">Placement matches remaining</div>
                    <div className="value">{constants.Placements.MinGames - rating.numGames}</div>
                </div>
            </div>}
            {isPlaced && <div className="stats-card-row">
                <div className="stats-card" title={`${rating.rd.toFixed(0)} rating deviation`}>
                    <div className="label">Rating</div>
                    <div className="value">{rating.lowerBound.toFixed(0)}</div>
                </div>
                <div className="stats-card" title={`${rating.percentile.toFixed(1)} percentile`}>
                    <div className="label">League</div>
                    <div className="value">{leagueName}</div>
                </div>
            </div>}
            {isMe && isPlaced && pointsUntilNextLeague > 0 && <p className="points-to-next-league">
                You are currently in the <b>{leagueName}</b> league. +{Math.ceil(pointsUntilNextLeague)} points until you are promoted into the next league.
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
        </div>
    }

    private getLeagueName(percentile: number) {
        for (const league of leagues) {
            if (percentile >= league.minPercentile) {
                return league.name;
            }
        }
        return "";
    }
}

export default ReactRedux.connect(stateToProps)(UserStatsPanel);