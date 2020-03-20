import _ from 'lodash';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as pages from '../core/pages';
import * as regions from '../core/regions';
import './regionsPanel.scss';

const RetestCount = 3;
const RetestDelayMilliseconds = 1000;

const RegionUrls = [
    regions.getOrigin("eu"),
    regions.getOrigin("us"),
    regions.getOrigin("sg"),
    regions.getOrigin("au"),
];

const RegionNames: { [key: string]: string } = {
    au: "Oceania",
    eu: "Europe",
    sg: "Asia",
    us: "North America",
};

interface Region {
    name: string;
    url: string;
    numPlayers: number;
    pingMilliseconds: number;
}

interface Props {
    server: string;
    region: string;
}

interface State {
    regions: Immutable.Map<string, Region>;
    error: string;
}

function retrieveRegion(url: string): Promise<Region> {
    const startMilliseconds = Date.now();
    return fetch(`${url}/status`).then(res => res.json()).then((json: m.ExternalStatus) => {
        const pingMilliseconds = Date.now() - startMilliseconds;
        const region: Region = {
            name: RegionNames[json.region] || json.region,
            numPlayers: json.numPlayers,
            url,
            pingMilliseconds,
        };
        return region;
    });
}

function delay(milliseconds: number): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

async function measureRegion(url: string, onRegion: (region: Region) => void): Promise<void> {
    try {
        let minPing = Infinity;
        for (let repeat = 0; repeat < RetestCount; ++repeat) {
            const region = await retrieveRegion(url);
            if (region.pingMilliseconds < minPing) {
                minPing = region.pingMilliseconds;
                onRegion(region);
            }

            await delay(RetestDelayMilliseconds);
        }
    } catch (exception) {
        console.error("Unable to connect to region", exception);
    }
}

function stateToProps(state: s.State): Props {
    return {
        server: state.server,
        region: state.region,
    };
}

class RegionList extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            regions: Immutable.Map<string, Region>(),
            error: null,
        };
    }

    componentDidMount() {
        Promise.all(RegionUrls.map(
            url => measureRegion(url, region => this.setState({
                regions: this.state.regions.set(region.name, region),
            }))
        )).catch(error => {
            this.setState({ error: `${error}` });
        });
    }

    render() {
        return <div className="region-list-section">
            <h1>Regions</h1>
            <p>You are automatically connected to your closest region. If there is no one online on your home region, you can try connecting to other regions.</p>
            {this.props.server && this.props.region && <p>You are currently connected to <b>{RegionNames[this.props.region] || this.props.region}</b></p>}
            {this.state.regions.size === 0 && <div className="loading">Loading regions...</div>}
            {this.state.error && <div className="error">{this.state.error}</div>}
            {this.state.regions.valueSeq().map(region => <a className="region" key={region.name} href={region.url} onClick={(ev) => this.onRegionClick(ev, region)}>
                <span className="region-name">{region.name}</span>: <span className="region-details">{region.numPlayers} players online, ping {region.pingMilliseconds} ms</span>
            </a>).toArray()}
        </div>;
    }

    private async onRegionClick(ev: React.MouseEvent, region: Region) {
        const a = options.getProvider();

        if (a.noExternalLinks) {
            ev.preventDefault();

            try {
                console.log("Changing region...", region.url);
                await regions.connectToServer(region.url);
                pages.changePage("");
            } catch (exception) {
                console.error("Failed to connect to region", region.url);
                window.location.href = region.url;
            }
        }
    }
}

export default ReactRedux.connect(stateToProps)(RegionList);