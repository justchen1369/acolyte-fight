import _ from 'lodash';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as m from '../../shared/messages.model';
import * as metrics from './metrics';
import * as playerHelper from './playerHelper';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';
import InfoPanelPlayer from './infoPanelPlayer';

const MinEntries = 1;
const MaxEntries = 30;
const PixelsPerRow = 50; // 2x larger than the row because we only want to take up top half of screen
const SurroundingEntries = 2;

interface OwnProps {
    metric: string;
}
interface Props extends OwnProps {
    myUserHash: string;
    online: Immutable.Map<string, m.OnlinePlayerMsg>;
    playerLookup: Map<string, w.Player>;
}
interface State {
    height: number;
}

interface ScoreboardParameters {
    online: Immutable.Map<string, m.OnlinePlayerMsg>;
    metric: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        myUserHash: state.world.ui.myUserHash,
        online: state.online,
        playerLookup: playerHelper.calculatePlayerLookup(state),
    };
}

const calculateScoreboard = Reselect.createSelector(
    (params: ScoreboardParameters) => params.online,
    (params: ScoreboardParameters) => params.metric,
    (online, metric) => {
        return online.valueSeq().sortBy(p => -metrics.metricToValue(metric, p)).toArray()
    }
);

class InfoPanelPlayerList extends React.PureComponent<Props, State> {
    private resizeListener = this.onResize.bind(this);

    constructor(props: Props) {
        super(props);
        this.state = {
            height: document.body.clientHeight,
        };
    }

    componentWillMount() {
        window.addEventListener('resize', this.resizeListener);

    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeListener);
    }

    render() {
        const scoreboard = calculateScoreboard({
            online: this.props.online,
            metric: this.props.metric,
        });
        const playerLookup = this.props.playerLookup;
        const maxEntries = Math.min(MaxEntries, Math.max(MinEntries, Math.floor(this.state.height / PixelsPerRow)));
        const selfIndex = scoreboard.findIndex(x => x.userHash === this.props.myUserHash);
        return <table className="player-list">
            <tbody>
                {scoreboard.map((score, index) => (
                    (index < maxEntries || Math.abs(index - selfIndex) <= SurroundingEntries || playerLookup.has(score.userHash))
                    && <InfoPanelPlayer key={score.userHash} rank={index + 1} online={score} metric={this.props.metric} />
                ))}
            </tbody>
        </table>
    }

    private onResize() {
        this.setState({
            height: document.body.clientHeight,
        });
    }
}

export default ReactRedux.connect(stateToProps)(InfoPanelPlayerList);