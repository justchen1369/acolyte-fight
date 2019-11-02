import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as cloud from '../../core/cloud';
import * as performance from '../../core/performance';
import * as StoreProvider from '../../storeProvider';
import Button from '../../controls/button';
import PercentageBar from '../../controls/percentageBar';

interface OwnProps {
}
interface Props extends OwnProps {
    cpuLag: number;
    gpuLag: number;
    networkLag: number;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        cpuLag: state.performance.cpuLag,
        gpuLag: state.performance.gpuLag,
        networkLag: state.performance.networkLag,
    };
}

class PerformancePanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div className="info-panel dialog-panel performance-panel">
            <div className="body-row">
                <table className="performance-table">
                    <colgroup>
                        <col className="performance-table-label-col" />
                        <col className="performance-table-percent-col" />
                    </colgroup>
                    <tbody>
                        {this.renderPerformanceRow("CPU lag", this.props.cpuLag)}
                        {this.renderPerformanceRow("GPU lag", this.props.gpuLag)}
                        {this.renderPerformanceRow("Network lag", this.props.networkLag)}
                    </tbody>
                </table>
            </div>
            <div className="info-row">
                {this.formatLagCause()}
            </div>
        </div>
    }

    private formatLagCause() {
        if (this.props.networkLag > 0.1) {
            return "It appears your network is not keeping up.";
        } else if (this.props.gpuLag > 0.1) {
            return "It appears your GPU is not keeping up.";
        } else if (this.props.cpuLag > 0.1) {
            return "It appears your CPU is not keeping up.";
        } else {
            return "This is the proportion of missed frames in the past 10 seconds.";
        }
    }

    private renderPerformanceRow(label: string, proportion: number) {
        return <tr>
            <td className="performance-table-label">{label}</td>
            <td className="performance-table-percent"><PercentageBar proportion={proportion} /></td>
        </tr>
    }
}

export default ReactRedux.connect(stateToProps)(PerformancePanel);