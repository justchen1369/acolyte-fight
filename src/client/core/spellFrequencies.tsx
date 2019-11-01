import _ from 'lodash';
import wu from 'wu';
import * as constants from '../../game/constants';
import * as credentials from './credentials';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as storage from '../storage';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

export async function retrieveSpellFrequencies(category: string, minAco: number) {
    const res = await fetch(`${url.base}/api/spellFrequencies?category=${encodeURIComponent(category)}&minAco=${encodeURIComponent(minAco)}`, {
        headers: {
            ...credentials.headers(),
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
    });
    if (res.status === 200) {
        const json = await res.json() as m.SpellFrequencyResponse;
        return json.frequencies;
    } else {
        throw await res.text();
    }
}