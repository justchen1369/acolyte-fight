import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as storage from '../storage';
import * as url from '../url';

const RegionUrls = [
    "http://us.acolytefight.io",
    "http://eu.acolytefight.io",
    "http://au.acolytefight.io",
];

interface Region {
    name: string;
    url: string;
    numPlayers: number;
    pingMilliseconds: number;
}

interface Props {
}

interface State {
    regions: Region[];
    error: string;
}

function retrieveRegion(url: string): Promise<Region> {
    const startMilliseconds = Date.now();
    return fetch(`${url}/status`).then(res => res.json()).then((json: m.ExternalStatus) => {
        const pingMilliseconds = Date.now() - startMilliseconds;
        const region: Region = {
            name: json.region,
            numPlayers: json.numPlayers,
            url,
            pingMilliseconds,
        };
        return region;
    });
}

function stateToProps(state: s.State): Props {
    return {
        server: state.server,
    };
}

class RegionList extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            regions: [],
            error: null,
        };
    }

    componentDidMount() {
        Promise.all(RegionUrls.map(
            url => retrieveRegion(url).then(region => this.setState({ regions: [...this.state.regions, region] }))
        )).catch(error => {
            this.setState({ error: `${error}` });
        });
    }

    render() {
        return <div className="region-list-section">
            <h1>Regions</h1>
            <p>Normally, you are automatically connected to your closest server. If there is no one online on your home server, you can try connecting to other regions.</p>
            {this.state.regions.length === 0 && <div className="loading">Loading regions...</div>}
            {this.state.error && <div className="error">{this.state.error}</div>}
            {this.state.regions.map(region => <div className="region">
                <a href={region.url}>Region {region.name}</a>: {region.numPlayers} players online, ping {region.pingMilliseconds} ms
            </div>)}
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(RegionList);