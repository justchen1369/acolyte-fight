import * as s from '../store.model';
import * as messages from './messages';

const duelPattern = /1v1/i;

export function remindIfNecessary(textMessages: s.TextMessage[]) {
    if (textMessages.some(x => duelPattern.test(x.text))) {
        messages.push({ type: "reminder", text: "This game is a free-for-all, you do not need to respect for 1v1s." });
    }
}