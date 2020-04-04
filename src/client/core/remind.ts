import * as s from '../store.model';
import * as messages from './messages';

const duelPattern = /1vs?1/i;

export function remindIfNecessary(textMessages: s.TextMessage[]) {
    if (textMessages.some(x => duelPattern.test(x.text))) {
        messages.replace({ type: "reminder", reminder: "ffa" });
    }
}