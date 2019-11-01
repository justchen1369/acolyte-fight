import _ from 'lodash';
import wu from 'wu';
import * as m from '../../shared/messages.model';
import * as aco from '../core/aco';
import * as accumulatorHelpers from './accumulatorHelpers';
import * as constants from '../../game/constants';
import { logger } from '../status/logging';

export interface SpellFrequency {
    spellId: string;
    wins: number;
    usages: number;
}

export interface SpellFrequencyCache {
    category: string;
    minAco: number;
    distribution: Map<string, SpellFrequency>; // spellId -> SpellFrequency
}

export class SpellUsageAccumulator {
    private distribution = new Map<string, SpellFrequency>();

    constructor(public readonly category: string, public readonly minAco: number) {
    }

    accept(game: m.GameStatsMsg) {
        if (!accumulatorHelpers.acceptGame(game, this.category)) {
            return;
        }

        let spellPlayers = game.players.filter(p =>
            !!p.spellIds
            && p.initialNumGames >= constants.SpellFrequencies.MinGames
            && p.initialAco >= this.minAco);
        if (spellPlayers.length <= 1) {
            // Not enough data
            return;
        }

        spellPlayers = _.sortBy(spellPlayers, p => p.rank);
        spellPlayers.forEach((p, index) => {
            const winRate = 1 - (index / (spellPlayers.length - 1));
            p.spellIds.forEach(spellId => {
                let spellFrequency = this.distribution.get(spellId);
                if (!spellFrequency) {
                    spellFrequency = { spellId, wins: 0, usages: 0 };
                    this.distribution.set(spellId, spellFrequency);
                }
                spellFrequency.wins += winRate;
                ++spellFrequency.usages;
            });
        });
    }

    calculate(): SpellFrequencyCache {
        logger.info(`Calculated spell distribution (${this.category}, ${this.minAco}): ${formatSpells(this.distribution)}`);

        return {
            category: this.category,
            minAco: this.minAco,
            distribution: this.distribution,
        };
    }
}

function formatSpells(distribution: Map<string, SpellFrequency>) {
    let result = new Array<string>();
    distribution.forEach(frequency => {
        const winRate = frequency.wins / frequency.usages;
        result.push(`${frequency.spellId}:${(winRate * 100).toFixed(1)}%:${frequency.usages}`);
    });
    return result.join(' ');
}