import _ from 'lodash';
import wu from 'wu';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as constants from '../../game/constants';
import * as rankings from '../core/rankings';
import * as spellFrequencies from '../core/spellFrequencies';
import * as spellUtils from '../core/spellUtils'
import { DefaultSettings } from '../../game/settings';
import { Icons } from '../../game/icons';
import CategorySelector from '../controls/categorySelector';
import PercentageBar from '../controls/percentageBar';
import SpellIcon from '../controls/spellIcon';
import './spellFrequenciesPanel.scss';

interface LeagueStatsLookup {
    [league: string]: LeagueStats;
}

interface LeagueStats {
    league: m.League;
    allStats: SpellBtnStats[];
}

interface SpellBtnStats {
    btn: string;
    frequencies: m.SpellFrequency[];
    maxUsages: number;
}

interface Props {
}

interface State {
    statsLookup?: LeagueStatsLookup;
    league: string;
}

const getLeagues = Reselect.createSelector(
    (statsLookup: LeagueStatsLookup) => statsLookup,
    (statsLookup) => wu(Object.values(statsLookup)).toArray().map(x => x.league),
);

const getLeagueNames = Reselect.createSelector(
    (leagues: m.League[]) => leagues,
    (leagues) => leagues.map(l => l.name),
);

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
            league: null,
        };
    }

    componentDidMount() {
        if (!this.state.statsLookup) {
            this.refreshData(); // Don't await
        }
    }

    private async refreshData() {
        const InitialPercentile = 50;

        const leagues = await rankings.downloadLeagues();
        const availablePercentiles = new Set(constants.SpellFrequencies.MinAcoPercentiles);
        const availableLeagues = leagues.filter(l => availablePercentiles.has(l.minPercentile));

        const statsLookup: LeagueStatsLookup = {};
        for (const league of availableLeagues) {
            const frequencies = await spellFrequencies.retrieveSpellFrequencies(m.GameCategory.PvP, league.minAco);
            const allStats = groupFrequencies(frequencies);
            statsLookup[league.name] = {
                league,
                allStats,
            };
        }

        // Initialise with closest league
        const league = _.minBy(availableLeagues, l => Math.abs(InitialPercentile - l.minPercentile)).name;

        this.setState({ statsLookup, league });
    }

    render() {
        const league = this.state.league;
        const statsLookup = this.state.statsLookup;
        if (statsLookup && league) {
            const leagues = getLeagues(statsLookup);
            const leagueStats = statsLookup[league];
            if (leagues && leagueStats) {
                return this.renderData(leagues, leagueStats);
            }
        }

        return this.renderNoData();
    }

    private renderData(leagues: m.League[], leagueStats: LeagueStats) {
        const leagueNames = getLeagueNames(leagues);
        const allStats = leagueStats.allStats;
        return <div className="spell-frequencies-panel">
            <div className="spell-frequencies-title">
                <h1>Statistics</h1>
                <CategorySelector categories={leagueNames} category={leagueStats.league.name} onCategoryChange={league => this.setState({ league })} />
            </div>
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
        return <PercentageBar proportion={proportion} />
    }

    private renderNoData() {
        return <div className="spell-frequencies-panel">
            <h1>Statistics</h1>
            <p className="loading-text">Loading...</p>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(SpellFrequenciesPanel);