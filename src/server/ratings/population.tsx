import * as db from '../storage/db.model';

export interface PopulationCache {
    numUsers: number;
}

export class NumUsersAccumulator {
    private numUsers = 0;

    accept(user: db.User) {
        this.numUsers++;
    }

    finish(): PopulationCache {
        return {
            numUsers: this.numUsers
        }
    }
}

export function estimateNumUsers(cache: PopulationCache): number {
    if (cache) {
        return cache.numUsers;
    } else {
        return 0;
    }
}