import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as matches from '../core/matches';
import * as storage from '../storage';
import * as url from '../url';

interface OwnProps {
    profileId: string;
    category: string;
}
interface Props extends OwnProps {
}

interface State {
    profileId: string;
    profile: m.GetProfileResponse;
    error: string;
}

async function retrieveUserStatsAsync(profileId: string) {
    const res = await fetch(`api/profile?p=${encodeURIComponent(profileId)}`, {
        credentials: 'same-origin'
    });
    if (res.status === 200) {
        const json = await res.json() as m.GetProfileResponse;
        return json;
    } else {
        throw await res.text();
    }
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return { ...ownProps };
}

class UserStatsPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            profileId: null,
            profile: null,
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
            this.setState({ profileId, profile: null });
            try {
                const profile = await retrieveUserStatsAsync(profileId);
                if (profile.userId === this.state.profileId) {
                    this.setState({ profile });
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
        return <div>
            <h1>{profile.name}</h1>
            <div>{rating.lowerBound.toFixed(0)} rating</div>
            <h1>Played {rating.numGames} games</h1>
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
        </div>
    }

    private renderNoRating(profile: m.GetProfileResponse) {
        return <div>
            <h1>{profile.name}</h1>
            <p>No stats for this mode yet!</p>
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(UserStatsPanel);