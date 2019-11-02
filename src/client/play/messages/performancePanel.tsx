import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as cloud from '../../core/cloud';
import * as StoreProvider from '../../storeProvider';
import Button from '../../controls/Button';
import PercentageBar from '../../controls/percentageBar';

interface OwnProps {
}
interface Props extends OwnProps {
    performance: boolean;
    cpuLag: number;
    gpuLag: number;
    networkLag: number;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        performance: state.options.performance,
        cpuLag: state.performance.cpuLag,
        gpuLag: state.performance.gpuLag,
        networkLag: state.performance.networkLag,
    };
}

class PerformancePanel extends React.PureComponent<Props, State> {
    render() {
        if (this.props.performance) {
            return this.renderPerformance();
        } else {
            return null;
        }
    }

    private renderPerformance() {
        return <div className="info-panel dialog-panel performance-panel">
            <div className="header-row">Performance <Button className="close-btn clickable" onClick={() => this.onHideClick()}><i className="fas fa-times" /></Button></div>
            <div className="body-row">
                <table className="performance-table">
                    <colgroup>
                        <col className="performance-table-label-col" />
                        <col className="performance-table-percent-col" />
                    </colgroup>
                    <caption>Frames missed:</caption>
                    <tbody>
                        {this.renderPerformanceRow("CPU", this.props.cpuLag)}
                        {this.renderPerformanceRow("GPU", this.props.gpuLag)}
                        {this.renderPerformanceRow("Network", this.props.networkLag)}
                    </tbody>
                </table>
            </div>
        </div>
    }

    private renderPerformanceRow(label: string, proportion: number) {
        return <tr>
            <td className="performance-table-label">{label}</td>
            <td className="performance-table-percent"><PercentageBar proportion={proportion} /></td>
        </tr>
    }

    private async onHideClick() {
        StoreProvider.dispatch({
            type: "updateOptions",
            options: { performance: false },
        });
        await cloud.uploadSettings();
    }
}

export default ReactRedux.connect(stateToProps)(PerformancePanel);