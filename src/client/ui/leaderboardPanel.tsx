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
import * as pages from '../core/pages';
import * as storage from '../storage';
import * as url from '../url';

interface OwnProps {
    category: string;
}
interface Props extends OwnProps {
    current: s.PathElements;
    myUserId: string;
    loggedIn: boolean;
}

interface State {
    category: string;
    leaderboard: m.LeaderboardPlayer[];
    profile: m.GetProfileResponse;
    error: string;
}

async function retrieveLeaderboardAsync(category: string) {
    const res = await fetch(`api/leaderboard?category=${encodeURIComponent(category)}&limit=100`, {
        credentials: 'same-origin'
    });
    if (res.status === 200) {
        const json = await res.json() as m.GetLeaderboardResponse;
        return json.leaderboard;
    } else {
        throw await res.text();
    }
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
    return {
        ...ownProps,
        current: state.current,
        myUserId: state.userId,
        loggedIn: state.loggedIn,
    };
}

class LeaderboardPanel extends React.Component<Props, State> {
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
    }

    componentWillReceiveProps(newProps: Props) {
        const category = newProps.category;
        this.loadDataAsync(category);
    }

    private async loadDataAsync(category: string) {
        if (category !== this.state.category) {
            this.setState({ category, leaderboard: null, error: null });
            try {
                const leaderboard = await retrieveLeaderboardAsync(category);
                if (category === this.state.category) {
                    this.setState({ leaderboard });
                }

                if (this.props.myUserId && this.props.loggedIn) {
                    const profile = await retrieveUserStatsAsync(this.props.myUserId);
                    this.setState({ profile });
                }
            } catch(error) {
                console.error("LeaderboardPanel error", error);
                this.setState({ error: `${error}` });
            }
        }
    }

    render() {
        if (!this.props.loggedIn) {
            return this.renderNotLoggedIn();
        } else if (this.state.error) {
            return this.renderError();
        } else if (!this.state.leaderboard) {
            return this.renderLoading();
        } else {
            return this.renderLeaderboard();
        }
    }

    private renderNotLoggedIn() {
        return <div>
            <h1>Leaderboard</h1>
            <p>The leaderboard shows all players ranked according to the Glicko-2 rating system.</p>
            <p className="login-ad"><div className="btn" onClick={() => window.location.href = "login"}>Login</div> to see the leaderboard</p>
        </div>
    }

    private renderLeaderboard() {
        const category = this.state.category;
        const isOnLeaderboard = this.props.myUserId && this.state.leaderboard.some(p => p.userId === this.props.myUserId);
        return <div>
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

        return <div className={player.userId === this.props.myUserId ? "leaderboard-row leaderboard-self" : "leaderboard-row"} title={`${player.rd.toFixed(0)} ratings deviation`}>
            <span className="position">{position}</span>
            {this.renderPlayerName(player)}
            <span className="win-count">{Math.round(player.lowerBound)} rating <span className="leaderboard-num-games">({player.numGames} games)</span></span>
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

        if (userRating.numGames < constants.Placements.MinGames) {
            return null;
        }

        const result: m.LeaderboardPlayer = {
            userId: profile.userId,
            name: profile.name,
            rating: userRating.rating,
            rd: userRating.rd,
            lowerBound: userRating.lowerBound,
            numGames: userRating.numGames,
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