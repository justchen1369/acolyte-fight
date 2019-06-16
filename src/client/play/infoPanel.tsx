import _ from 'lodash';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as infoPanelHelpers from './metrics';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';
import Button from '../controls/button';
import InfoPanelPlayerList from './infoPanelPlayerList';

interface Props {
}
interface State {
    hoveringMetric: string;
    selectedMetric: string;
}

function stateToProps(state: s.State): Props {
    return {
    };
}

class InfoPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedMetric: s.ScoreboardMetric.Outlasts,
            hoveringMetric: null,
        };
    }

    render() {
        const selectedMetric = this.state.hoveringMetric || this.state.selectedMetric;
        return (
            <div id="info-panel">
                <div className="info-title">
                    <div className="player-list-header">
                        <div className="player-list-options">
                            {this.renderButton(s.ScoreboardMetric.Games, selectedMetric)}
                            {this.renderButton(s.ScoreboardMetric.Wins, selectedMetric)}
                            {this.renderButton(s.ScoreboardMetric.Kills, selectedMetric)}
                            {this.renderButton(s.ScoreboardMetric.Damage, selectedMetric)}
                            {this.renderButton(s.ScoreboardMetric.Outlasts, selectedMetric)}
                        </div>
                        <div className="player-list-title">Most {infoPanelHelpers.metricToLabel(selectedMetric)}</div>
                    </div>
                </div>
                <InfoPanelPlayerList metric={selectedMetric} />
            </div>
        );
    }

    private renderButton(metric: string, selectedMetric: string) {
        const icon = infoPanelHelpers.metricToIcon(metric);
        return <Button
            className={`${icon} clickable ${metric === selectedMetric ? 'selected' : ''}`}
            onClick={() => this.setState({ selectedMetric: metric })}
            onMouseEnter={() => this.setState({ hoveringMetric: metric })}
            onMouseLeave={() => this.setState({ hoveringMetric: null })}
        />;
    }
}

export default ReactRedux.connect(stateToProps)(InfoPanel);