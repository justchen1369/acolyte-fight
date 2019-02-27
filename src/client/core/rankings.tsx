import _ from 'lodash';
import moment from 'moment';
import msgpack from 'msgpack-lite';
import * as constants from '../../game/constants';
import * as credentials from './credentials';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as notifications from './notifications';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

export interface League {
    name: string;
    minPercentile: number;
}
export interface PointsToNextLeague {
    name: string;
    pointsRemaining: number;
}
export interface PointsToNextLeagueLookup {
    [category: string]: PointsToNextLeague;
}

export const leagues = [
    { name: "Grandmaster", minPercentile: constants.Placements.Grandmaster },
    { name: "Master", minPercentile: constants.Placements.Master },
    { name: "Diamond", minPercentile: constants.Placements.Diamond },
    { name: "Platinum", minPercentile: constants.Placements.Platinum },
    { name: "Gold", minPercentile: constants.Placements.Gold },
    { name: "Silver", minPercentile: constants.Placements.Silver },
    { name: "Bronze", minPercentile: constants.Placements.Bronze },
    { name: "Wood", minPercentile: constants.Placements.Wood },
];

export function onNotification(notifs: w.Notification[]) {
    for (const notif of notifs) {
        if (notif.type === "ratingAdjustment") {
            adjustRating(notif);
        }
    }
}

function adjustRating(adjustment: w.RatingAdjustmentNotification) {
    // Incrementally adjust the rating until it's reloaded later
    const state = StoreProvider.getState();
    if (!(state.profile && state.profile.ratings)) {
        return;
    }

    const rating = state.profile.ratings[adjustment.category];
    if (!rating) {
        return;
    }

    const profile: m.GetProfileResponse = {
        ...state.profile,
        ratings: {
            ...state.profile.ratings,
            [adjustment.category]: {
                ...rating,
                acoExposure: rating.acoExposure + adjustment.acoDelta,
            },
        }
    };
    StoreProvider.dispatch({ type: "updateProfile", profile });
}

export function getLeagueName(percentile: number) {
    for (const league of leagues) {
        if (percentile >= league.minPercentile) {
            return league.name;
        }
    }
    return "";
}

function calculateNextLeague(percentile: number): League {
    const higher = leagues.filter(l => percentile < l.minPercentile);
    if (higher.length === 0) {
        return null;
    }

    return _.minBy(higher, l => l.minPercentile);
}


export async function retrieveUserStatsAsync(profileId: string) {
    if (!profileId) {
        return null;
    }

    const res = await fetch(`${url.base}/api/profile?p=${encodeURIComponent(profileId)}`, {
        headers: credentials.headers(),
        credentials: 'same-origin',
    });
    if (res.status === 200) {
        const profile = await res.json() as m.GetProfileResponse;

        // Cache profile if this is the current logged-in user
        const state = StoreProvider.getState();
        if (state.userId === profile.userId) {
            StoreProvider.dispatch({ type: "updateProfile", profile });
        }

        return profile;
    } else {
        throw await res.text();
    }
}

export async function retrievePointsToNextLeagueAsync(ratings: m.UserRatingLookup): Promise<PointsToNextLeagueLookup> {
    const categories = [m.GameCategory.PvP];
    const lookup: PointsToNextLeagueLookup = {};

    if (!ratings) {
        return lookup;
    }

    for (const category of categories) {
        const userRating = ratings[category];
        if (!userRating) {
            continue;
        }

        if (userRating.acoExposure && userRating.acoPercentile >= 0) {
            lookup[category] = await calculatePointsUntilNextLeague(userRating.acoExposure, userRating.acoPercentile, category);
        }
    }
    return lookup;
}

async function retrieveRatingAtPercentile(category: string, percentile: number): Promise<number> {
    const res = await fetch(`${url.base}/api/ratingAtPercentile?category=${encodeURIComponent(category)}&percentile=${percentile}`, {
        headers: credentials.headers(),
        credentials: 'same-origin',
    });
    if (res.status === 200) {
        const json = await res.json() as m.GetRatingAtPercentileResponse;
        return json.rating;
    } else {
        throw await res.text();
    }
}

async function calculatePointsUntilNextLeague(exposure: number, percentile: number, category: string): Promise<PointsToNextLeague> {
    const nextLeague = calculateNextLeague(percentile);
    if (!nextLeague) {
        return null;
    }

    const minRating = await retrieveRatingAtPercentile(category, Math.ceil(nextLeague.minPercentile));
    if (minRating) {
        return {
            name: nextLeague.name,
            pointsRemaining: minRating - exposure,
        };
    } else {
        return null;
    }
}

export async function retrieveLeaderboardAsync(category: string) {
    const res = await fetch(`${url.base}/api/leaderboard?category=${encodeURIComponent(category)}`, {
        headers: credentials.headers(),
        credentials: 'same-origin'
    });
    if (res.status === 200) {
        const buffer = new Uint8Array(await res.arrayBuffer());
        const json = msgpack.decode(buffer) as m.GetLeaderboardResponse;
        return json.leaderboard;
    } else {
        throw await res.text();
    }
}