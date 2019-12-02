import _ from 'lodash';
import wu from 'wu';
import * as m from '../../shared/messages.model';
import * as aco from '../core/aco';
import * as accumulatorHelpers from './accumulatorHelpers';
import * as constants from '../../game/constants';
import { logger } from '../status/logging';

export interface Frequency {
    wins: number;
    usages: number;
    probability: number;
}

export interface SpellFrequency extends Frequency {
    spellId: string;
}

export interface SpellFrequencyCache {
    category: string;
    minAco: number;
    distribution: Map<string, SpellFrequency>; // spellId -> SpellFrequency
}

function initFrequency(): Frequency {
    return { wins: 0, usages: 0, probability: 0 };
}

function accumulateInto(accumulator: Frequency, frequency: Frequency, weight: number = 1) {
    accumulator.usages += weight * frequency.usages;
    accumulator.wins += weight * frequency.wins;
    accumulator.probability += weight * frequency.probability;
}

export class SpellUsageAccumulator {
    private distribution = new Map<string, SpellFrequency>();

    constructor(public readonly category: string, public readonly minAco: number) {
    }

    accept(game: m.GameStatsMsg, distribution: aco.ActualWinRate[]) {
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

        for (const player of spellPlayers) {
            const frequency = initFrequency();
            for (const other of spellPlayers) {
                if (player.userHash === other.userHash
                    || (player.teamId && other.teamId && player.teamId === other.teamId)) {
                    // One player did not beat the other
                    continue;
                }

                const diff = player.initialAco - other.initialAco;

                const usages = 1;
                const wins = player.rank <= other.rank ? 1 : 0;
                const probability = aco.AcoRanked.estimateWinProbability(diff, distribution);

                accumulateInto(frequency, { usages, wins, probability });
            }

            if (frequency.usages > 0) {
                // Player used this spell set once, but against multiple enemies
                const weight = 1 / frequency.usages;
                for (const spellId of player.spellIds) {
                    this.accumulate(spellId, weight, frequency);
                }
            }
        }
    }

    private accumulate(spellId: string, weight: number, frequency: Frequency) {
        let accumulator = this.distribution.get(spellId);
        if (!accumulator) {
            accumulator = { spellId, wins: 0, usages: 0, probability: 0 };
            this.distribution.set(spellId, accumulator);
        }
        accumulateInto(accumulator, frequency, weight);
    }

    calculate(): SpellFrequencyCache {
        return {
            category: this.category,
            minAco: this.minAco,
            distribution: this.distribution,
        };
    }

    log() {
        logger.info(`Calculated spell distribution (${this.category}, ${this.minAco}): ${formatSpells(this.distribution)}`);
    }
}

function formatSpells(distribution: Map<string, SpellFrequency>) {
    let result = new Array<string>();
    distribution.forEach(frequency => {
        const winRate = frequency.wins / frequency.usages;
        const advantage = frequency.wins / frequency.probability;
        result.push(`${frequency.spellId}:${(winRate * 100).toFixed(1)}%:${advantage.toPrecision(2)}:${frequency.usages}`);
    });
    return result.join(' ');
}