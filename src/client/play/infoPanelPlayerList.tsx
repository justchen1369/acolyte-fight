import _ from 'lodash';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';
import Button from '../controls/button';
import InfoPanelPlayer from './infoPanelPlayer';

interface OwnProps {
    metric: string;
}
interface Props extends OwnProps {
    scoreboard: m.OnlinePlayerMsg[];
}
interface State {
    hoveringMetric: string;
    chosenMetric: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        scoreboard: calculateScoreboard(state),
    };
}

const calculateScoreboard = Reselect.createSelector(
    (state: s.State) => state.online,
    (online) => {
        return online.valueSeq().sortBy(p => -p.outlasts).toArray()
    }
);

class InfoPanelPlayerList extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            chosenMetric: s.ScoreboardMetric.Outlasts,
            hoveringMetric: null,
        };
    }

    render() {
        return <table className="player-list">
            <tbody>
                {this.props.scoreboard.map((score, index) => <InfoPanelPlayer key={score.userHash} rank={index + 1} online={score} metric={this.props.metric} />)}
            </tbody>
        </table>
    }
}

export default ReactRedux.connect(stateToProps)(InfoPanelPlayerList);