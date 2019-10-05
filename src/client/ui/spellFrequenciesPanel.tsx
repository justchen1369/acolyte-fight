import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as constants from '../../game/constants';
import * as spellFrequencies from '../core/spellFrequencies';
import { DefaultSettings } from '../../game/settings';

interface SpellBtnStats {
    btn: string;
    frequencies: m.SpellFrequency[];
    maxUsages: number;
}

interface Props {
}

interface State {
    allStats?: SpellBtnStats[];
}

function stateToProps(state: s.State): Props {
    return {
    };
}

function groupFrequencies(frequencies: m.SpellFrequency[]): SpellBtnStats[] {
    const frequencyLookup = _.keyBy(frequencies, x => x.spellId);
    console.log(frequencies, frequencyLookup);
    const choices = DefaultSettings.Choices;

    const allStats = new Array<SpellBtnStats>();
    choices.Keys.forEach(btnConfig => {
        if (!btnConfig) {
            return;
        }

        const spellIds = _.flatten(choices.Options[btnConfig.btn]);
        console.log("spells", btnConfig.btn, spellIds);
        let frequencies = spellIds.map(spellId => frequencyLookup[spellId]).filter(x => !!x);
        frequencies = _.orderBy(frequencies, x => -x.usages);
        const stats: SpellBtnStats = {
            btn: btnConfig.btn,
            maxUsages: _(frequencies).map(x => x.usages).max() || 0,
            frequencies,
        };
        allStats.push(stats);
    });
    return allStats;
}

export class SpellFrequenciesPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    componentDidMount() {
        if (!this.state.allStats) {
            this.refreshData(); // Don't await
        }
    }

    private async refreshData() {
        const frequencies = await spellFrequencies.retrieveSpellFrequencies(m.GameCategory.PvP);
        const allStats = groupFrequencies(frequencies);
        this.setState({ allStats });
    }

    render() {
        const allStats = this.state.allStats;
        if (allStats) {
            return this.renderData(allStats);
        } else {
            return this.renderNoData();
        }
    }

    private renderData(allStats: SpellBtnStats[]) {
        return <div className="spell-frequencies-panel">
            <h1>Statistics</h1>
            {allStats.map(stats => this.renderBtn(stats))}
            <h2>About</h2>
            <p>Calculated from players who have played {constants.SpellFrequencies.MinGames}+ games</p>
        </div>;
    }

    private renderBtn(stats: SpellBtnStats) {
        return <table key={stats.btn} className="spell-frequencies-btn">
            <thead>
                <tr>
                    <th>Spell</th>
                    <th>Popularity</th>
                    <th>Win rate</th>
                </tr>
            </thead>
            <tbody>
                {stats.frequencies.map(f => <tr>
                    <td>{f.spellId}</td>
                    <td>{f.usages}</td>
                    <td>{f.wins}</td>
                </tr>)}
            </tbody>
        </table>
    }

    private renderNoData() {
        return <div className="spell-frequencies-panel">
            <h1>Statistics</h1>
            <p className="loading-text">Loading...</p>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(SpellFrequenciesPanel);