import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as stats from '../core/stats';
import * as url from '../url';
import GameList from './gameList';

const MaxReplaysToDisplay = 50;

interface OwnProps {
    profileId: string;
    category: string;
}
interface Props extends OwnProps {
    current: s.PathElements;
}
interface State {
    profileId: string;
    allGameStats: d.GameStats[];
    loading: boolean;
    category: string;
    error: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
    };
}

class ProfileGameList extends React.PureComponent<Props, State> {
    private getGameSubset = Reselect.createSelector(
        (props: State) => props.category,
        (props: State) => props.allGameStats,
        (category, allGameStats) => {
            if (allGameStats) {
                let replays = allGameStats;
                if (category !== m.GameCategory.AllCategory) {
                    replays = replays.filter(g => g.category === category);
                }
                return replays;
            } else {
                return null;
            }
        });

    constructor(props: Props) {
        super(props);
        this.state = {
            profileId: props.profileId,
            allGameStats: [],
            loading: true,
            category: props.category,
            error: null,
        };
    }

    componentDidMount() {
        this.retrieveData(this.props.profileId);
    }

    componentDidUpdate(prevProps: Props) {
        if (this.props.profileId !== this.state.profileId) {
            this.retrieveData(this.props.profileId);
        }
    }

    private async retrieveData(profileId: string) {
        this.setState({ profileId, allGameStats: [], loading: true, error: null });
        if (!profileId) {
            return;
        }

        try {
            const allGameStats = await cloud.fetchGameStats(profileId, MaxReplaysToDisplay);
            if (this.state.profileId !== profileId) {
                // Stopped showing this profile
                return;
            }

            this.setState({ profileId, allGameStats, loading: false, error: null });
        } catch (error) {
            console.error(error);
            this.setState({ error: `${error}`, loading: false, });
        }
    }

    render() {
        if (this.state.error) {
            return this.renderError(this.state.error);
        } else if (this.state.loading) {
            return this.renderLoading();
        } else {
            return this.renderGames();
        }
    }

    private renderGames() {
        const allGameStats = this.getGameSubset(this.state);
        return <GameList allGameStats={allGameStats} limit={MaxReplaysToDisplay} />
    }

    private renderLoading(): JSX.Element {
        return <p className="loading-text">Loading...</p>;
    }

    private renderError(error: string): JSX.Element {
        return <p className="error">Error loading recent games: {error}</p>;
    }
}

export default ReactRedux.connect(stateToProps)(ProfileGameList);