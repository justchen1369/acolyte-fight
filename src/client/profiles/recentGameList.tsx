import _ from 'lodash';
import moment from 'moment';
import wu from 'wu';
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
    category: string;
}
interface Props extends OwnProps {
    current: s.PathElements;
    allGameStats: Map<string, d.GameStats>;
}
interface State {
    error: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
        allGameStats: state.allGameStats,
    };
}

class RecentGameList extends React.PureComponent<Props, State> {
    private getGameSubset = Reselect.createSelector(
        (props: Props) => props.category,
        (props: Props) => props.allGameStats,
        (category, allGameStats) => {
            if (allGameStats) {
                let replays = wu(allGameStats.values()).toArray();
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
            error: null,
        };
    }

    componentDidMount() {
        this.retrieveData();
    }

    private async retrieveData() {
        try {
            await stats.loadAllGameStats();
            await cloud.downloadGameStats();
        } catch (error) {
            console.error(error);
            this.setState({ error: `${error}` });
        }
    }

    render() {
        const allGameStats = this.getGameSubset(this.props);
        return <GameList allGameStats={allGameStats} limit={MaxReplaysToDisplay} />
    }
}

export default ReactRedux.connect(stateToProps)(RecentGameList);