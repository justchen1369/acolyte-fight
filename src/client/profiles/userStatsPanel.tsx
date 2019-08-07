import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as rankings from '../core/rankings';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

import BuildPanel from './buildPanel';
import RankIcon from '../controls/rankIcon';
import TitleListener from '../controls/titleListener';

interface OwnProps {
    profileId: string;
    category: string;
    showNumGames?: boolean;
    showRanking?: boolean;
    showWinRates?: boolean;
    showBuild?: boolean;
    pageTitle?: boolean;
}
interface Props extends OwnProps {
    myProfile: m.GetProfileResponse;
    playerName: string;
    loggedIn: boolean;
    myUserId: string;
    leagues: m.League[];
}

interface State {
    profileId: string;
    profile: m.GetProfileResponse;
    error: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        myProfile: state.profile,
        playerName: state.playerName,
        loggedIn: state.loggedIn,
        myUserId: state.userId,
        leagues: state.leagues,
    };
}

function calculateNextLeague(exposure: number, leagues: m.League[]): m.League {
    const higherLeagues = leagues.filter(x => x.minRating > exposure);
    if (higherLeagues.length === 0) {
        return null;
    }

    const nextLeague = _.minBy(higherLeagues, x => x.minRating);
    return nextLeague;
}

class UserStatsPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            profileId: null,
            profile: null,
            error: null,
        };
    }

    componentWillMount() {
        this.loadDataAsync(this.props.profileId || this.props.myUserId);

        if (!this.props.leagues) {
            rankings.downloadLeagues(); // Don't await
        }
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
                this.setState({ profileId, profile, error: null });
                try {
                    const profile = await rankings.retrieveUserStatsAsync(profileId);
                    if (profile.userId === this.state.profileId) {
                        this.setState({ profile });
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
        return <>
            {this.props.pageTitle && <TitleListener subtitle={profile.name} />}
            {rating ? this.renderRating(profile, rating) : this.renderNoRating(profile)}
        </>
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
        return <div className="user-stats-panel">
            <h1>{profile.name}</h1>
            {this.props.showBuild && <BuildPanel bindings={profile.bindings} />}
            {this.props.showNumGames && this.renderNumGames(rating)}
            {this.props.showRanking && this.renderRankingStats(profile, rating)}
            {this.props.showWinRates && this.renderWinRateStats(rating)}
        </div>
    }

    private renderNumGames(rating: m.UserRating) {
        return <div>
            <div className="stats-card-row">
                <div className="stats-card">
                    <div className="label">Games played</div>
                    <div className="value">{rating.numGames}</div>
                </div>
            </div>
        </div>;
    }

    private renderRankingStats(profile: m.GetProfileResponse, rating: m.UserRating) {
        if (!this.props.leagues) {
            // Leagues haven't loaded yet, can't display
            return null;
        }

        const isMe = profile.userId === this.props.myUserId;
        const league = rankings.getLeagueFromRating(rating.acoExposure, this.props.leagues);
        if (!league) {
            return null;
        }

        return <div>
            {<div className="stats-card-row">
                <div className={`rating-card ${league.name}`} title={`${rating.acoPercentile.toFixed(1)} percentile`}>
                    <RankIcon league={league.name} /> <b>{league.name}</b> {rating.acoExposure.toFixed(0)}
                </div>
            </div>}
            {isMe && this.renderNextLeague(rating)}
        </div>
    }
    
    private renderNextLeague(rating: m.UserRating) {
        if (!(rating && this.props.leagues)) {
            return null;
        }

        const nextLeague = calculateNextLeague(rating.acoExposure, this.props.leagues);
        if (!nextLeague) {
            return null;
        }

        const pointsRemaining = nextLeague.minRating - rating.acoExposure;
        return <div className="points-to-next-league">
            <b>+{Math.ceil(pointsRemaining)}</b> points until you are promoted into the <b>{nextLeague.name}</b> league.
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
        return <div className="user-stats-panel">
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
            {!a.noLogin && !this.props.loggedIn && <p className="login-ad"><span className="btn" onClick={() => window.location.href = "login"}>Login</span> to receive your rating and stats</p>}
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(UserStatsPanel);