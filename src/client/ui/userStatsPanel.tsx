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

interface OwnProps {
    profileId: string;
    category: string;
    more: boolean;
}
interface Props extends OwnProps {
    loggedIn: boolean;
    myUserId: string;
}

interface State {
    profileId: string;
    profile: m.GetProfileResponse;
    distributions: m.GetDistributionsResponse;
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

async function retrieveDistributionsAsync() {
    const res = await fetch(`${url.base}/api/distributions`, {
        credentials: 'same-origin'
    });
    if (res.status === 200) {
        const json = await res.json() as m.GetDistributionsResponse;
        return json;
    } else {
        throw await res.text();
    }
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
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
            distributions: null,
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
                    const distributions = await retrieveDistributionsAsync();
                    this.setState({ distributions });
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
            <h1>Profile</h1>
            <p className="error">Unable to load data for user: {this.state.error}</p>
        </div>
    }

    private renderLoading() {
        return <div>
            <h1>Profile</h1>
            <p className="loading-text">Loading...</p>
        </div>
    }

    private renderRating(profile: m.GetProfileResponse, rating: m.UserRating) {
        const isMe = this.props.loggedIn && profile.userId === this.props.myUserId;
        const isPlaced = rating.numGames >= constants.Placements.MinGames;
        const leagueName = this.getLeagueName(rating.percentile);
        const pointsUntilNextLeague = this.calculatePointsUntilNextLeague(rating.lowerBound, rating.percentile, this.props.category);
        return <div>
            <h1>{profile.name}</h1>
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
            {this.props.more && <h2>Previous {rating.numGames} games</h2>}
            {this.props.more && <div className="stats-card-row">
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
            </div>}
        </div>
    }

    private calculatePointsUntilNextLeague(ratingLB: number, percentile: number, category: string): number | null {
        const nextLeague = this.calculateNextLeague(percentile);
        if (!nextLeague) {
            return null;
        }

        const distribution = this.state.distributions && this.state.distributions[category];
        if (!distribution) {
            return null;
        }

        const minRating = distribution[Math.ceil(nextLeague.minPercentile)];
        if (minRating) {
            return minRating - ratingLB;
        } else {
            return null;
        }
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

    private calculateNextLeague(percentile: number): League {
        const higher = leagues.filter(l => percentile < l.minPercentile);
        if (higher.length === 0) {
            return null;
        }

        return _.minBy(higher, l => l.minPercentile);
    }
}

export default ReactRedux.connect(stateToProps)(UserStatsPanel);