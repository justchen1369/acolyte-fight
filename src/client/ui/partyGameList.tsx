import _ from 'lodash';
import wu from 'wu';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as pages from '../core/pages';
import * as stats from '../core/stats';
import * as url from '../url';
import GameList from '../profiles/gameList';

const MaxReplaysToDisplay = 100;

interface OwnProps {
    partyId: string;
}
interface Props extends OwnProps {
    allGameStats: Map<string, d.GameStats>;
}
interface State {
    error: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        allGameStats: state.allGameStats,
    };
}

class PartyGameList extends React.PureComponent<Props, State> {
    private getGameSubset = Reselect.createSelector(
        (props: Props) => props.partyId,
        (props: Props) => props.allGameStats,
        (partyId, allGameStats) => {
            if (partyId && allGameStats) {
                return wu(allGameStats.values()).filter(g => g.partyId === partyId).toArray();
            } else {
                return [];
            }
        });

    constructor(props: Props) {
        super(props);
        this.state = {
            error: null,
        };
    }

    render() {
        const allGameStats = this.getGameSubset(this.props);
        return <GameList allGameStats={allGameStats} limit={MaxReplaysToDisplay} />
    }
}

export default ReactRedux.connect(stateToProps)(PartyGameList);