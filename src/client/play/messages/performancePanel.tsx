import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as constants from '../../../game/constants';
import * as StoreProvider from '../../storeProvider';
import Button from '../../controls/button';
import PercentageBar from '../../controls/percentageBar';
import './performancePanel.scss';

const HistorySeconds = constants.PerformanceStats.MaxHistoryLengthMilliseconds / 1000;

interface OwnProps {
}
interface Props extends OwnProps {
    cpuLag: number;
    gpuLag: number;
    networkLag: number;

    globalCpuLag: number;
    globalGpuLag: number;
    globalNetworkLag: number;

    tab: s.PerformanceTab;
}
interface State {
}

interface DetailProps {
    header?: React.ReactNode;
    caption?: React.ReactNode;
    children: React.ReactNode[];
}

function PerformanceTable(props: DetailProps) {
    return <div className="info-panel dialog-panel performance-panel">
        {props.header}
        <div className="body-row">
            <table className="performance-table">
                {props.caption}
                <colgroup>
                    <col className="performance-table-label-col" />
                    <col className="performance-table-percent-col" />
                </colgroup>
                <tbody>
                    {props.children}
                </tbody>
            </table>
        </div>
    </div>
}

function stateToProps(state: s.State): Props {
    return {
        cpuLag: state.performance.cpuLag,
        gpuLag: state.performance.gpuLag,
        networkLag: state.performance.networkLag,
        globalCpuLag: state.globalPerformance.cpuLag,
        globalGpuLag: state.globalPerformance.gpuLag,
        globalNetworkLag: state.globalPerformance.networkLag,
        tab: state.showingPerformance,
    };
}

class PerformancePanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        switch (this.props.tab) {
            case s.PerformanceTab.CPU: return this.renderCPU();
            case s.PerformanceTab.GPU: return this.renderGPU();
            case s.PerformanceTab.Network: return this.renderNetwork();
            default: return this.renderSummary();
        }
    }

    private renderSummary() {
        return <PerformanceTable>
            {this.renderPerformanceRow(s.PerformanceTab.CPU, "CPU lag", this.props.cpuLag)}
            {this.renderPerformanceRow(s.PerformanceTab.GPU, "GPU lag", this.props.gpuLag)}
            {this.renderPerformanceRow(s.PerformanceTab.Network, "Network lag", this.props.networkLag)}
        </PerformanceTable>
    }

    private renderPerformanceRow(tab: s.PerformanceTab, label: string, proportion: number) {
        return <tr className="performance-summary-row" onClick={() => this.onTabSelect(tab)}>
            <td className="performance-table-label"><i className="fas fa-info-square link-btn performance-info-icon" /> <span className="clickable">{label}</span></td>
            <td className="performance-table-percent"><PercentageBar proportion={proportion} /></td>
        </tr>
    }

    private onTabSelect(tab: s.PerformanceTab) {
        StoreProvider.dispatch({ type: "showingPerformance", showingPerformance: tab });
    }

    private renderCPU() {
        const header = <Button className="clickable header-row" onClick={() => this.onTabClear()}><i className="fas fa-chevron-left" /> CPU</Button>;
        const caption = <caption>Proportion of time your CPU was late over the past {HistorySeconds} seconds:</caption>;
        return <PerformanceTable header={header} caption={caption}>
            {this.renderDetailRow("Your lag", this.props.cpuLag)}
            {this.renderDetailRow("Others lag", this.props.globalCpuLag)}
        </PerformanceTable>
    }
    
    private renderGPU() {
        const header = <Button className="clickable header-row" onClick={() => this.onTabClear()}><i className="fas fa-chevron-left" /> GPU</Button>;
        const caption = <caption>Proportion of time your GPU was late over the past {HistorySeconds} seconds:</caption>;
        return <PerformanceTable header={header} caption={caption}>
            {this.renderDetailRow("Your lag", this.props.gpuLag)}
            {this.renderDetailRow("Others lag", this.props.globalGpuLag)}
        </PerformanceTable>
    }
    
    private renderNetwork() {
        const header = <Button className="clickable header-row" onClick={() => this.onTabClear()}><i className="fas fa-chevron-left" /> Network</Button>;
        const caption = <caption>Proportion of time your Network was late over the past {HistorySeconds} seconds:</caption>;
        return <PerformanceTable header={header} caption={caption}>
            {this.renderDetailRow("Your lag", this.props.networkLag)}
            {this.renderDetailRow("Others lag", this.props.globalNetworkLag)}
        </PerformanceTable>
    }

    private renderDetailRow(label: string, proportion: number) {
        return <tr>
            <td className="performance-table-label">{label}</td>
            <td className="performance-table-percent"><PercentageBar proportion={proportion} /></td>
        </tr>
    }

    private onTabClear() {
        StoreProvider.dispatch({ type: "showingPerformance", showingPerformance: s.PerformanceTab.None });
    }
}

export default ReactRedux.connect(stateToProps)(PerformancePanel);