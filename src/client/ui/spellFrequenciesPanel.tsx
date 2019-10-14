import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as constants from '../../game/constants';
import * as spellFrequencies from '../core/spellFrequencies';
import * as spellUtils from '../core/spellUtils'
import { DefaultSettings } from '../../game/settings';
import { Icons } from '../../game/icons';
import SpellIcon from '../controls/spellIcon';

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
    const choices = DefaultSettings.Choices;

    const allStats = new Array<SpellBtnStats>();
    choices.Keys.forEach(btnConfig => {
        if (!btnConfig) {
            return;
        }

        const spellIds = _.flatten(choices.Options[btnConfig.btn]);
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
            <p>Calculated from matches over the past {constants.MaxGameAgeInDays} days. Only includes players who have played {constants.SpellFrequencies.MinGames} or more games.</p>
        </div>;
    }

    private renderBtn(stats: SpellBtnStats) {
        return <table key={stats.btn} className="spell-frequencies-table">
            <colgroup>
                <col className="spell-frequencies-col-icon" />
                <col className="spell-frequencies-col-name" />
                <col className="spell-frequencies-col-popularity" />
                <col className="spell-frequencies-col-win-rate" />
                <col className="spell-frequencies-col-spacer" />
            </colgroup>
            <thead>
                <tr>
                    <th></th>
                    <th>Spell</th>
                    <th>Popularity</th>
                    <th>Outlast rate</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {stats.frequencies.map(f => this.renderSpellRow(stats, f))}
            </tbody>
        </table>
    }

    private renderSpellRow(stats: SpellBtnStats, freq: m.SpellFrequency) {
        const Spells = DefaultSettings.Spells;

        const spellId = freq.spellId;
        const spell = Spells[spellId];
        if (!spell) {
            return null;
        }

        const spellName = spellUtils.spellName(spell);
        return <tr key={freq.spellId} title={`${spellName}: ${freq.usages} games`}>
            <td className="spell-frequencies-icon">{this.renderSpellIcon(spell)}</td>
            <td className="spell-frequencies-name">{spellName}</td>
            <td className="spell-frequencies-popularity">{this.renderPercentage(freq.usages / stats.maxUsages)}</td>
            <td className="spell-frequencies-win-rate">{this.renderPercentage(freq.wins / freq.usages)}</td>
            <td></td>
        </tr>
    }

    private renderSpellIcon(spell: Spell) {
        const icon = Icons[spell.icon];
        if (!icon) {
            return null;
        }
        const path = new Path2D(icon.path);
        return <SpellIcon icon={path} color={spell.color} size={32} />
    }

    private renderPercentage(proportion: number) {
        const percentageFormatted = `${((proportion || 0) * 100).toFixed(1)}%`;
        return <div className="percentage-bar-container">
            <div className="percentage-bar">
                <div className="percentage-bar-fill" style={{ width: percentageFormatted }}></div>
            </div>
            <div className="percentage-bar-label">
                {percentageFormatted}
            </div>
        </div>
    }

    private renderNoData() {
        return <div className="spell-frequencies-panel">
            <h1>Statistics</h1>
            <p className="loading-text">Loading...</p>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(SpellFrequenciesPanel);