import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';

type MessageType = s.Message['type'];
type DiscriminateMessage<T extends MessageType> = Extract<s.Message, {type: T}>

const ExpireInterval = 1000;
const ExpiryMilliseconds = 15000;
const RatingAdjustmentMilliseconds = 30000;
const TeamsSplashMilliseconds = 4000;
const TextMilliseconds = 60000;

let nextMsgId = 0;

export function startTimers() {
    setInterval(messageCleanup, ExpireInterval);
}

function initItem(message: s.Message): s.MessageItem {
    const duration = calculateDuration(message);
    const expiryTime = Date.now() + duration;
    return { 
        key: "item" + (nextMsgId++),
        message,
        duration,
        expiryTime,
    };
}

export function push(message: s.Message) {
    const store = StoreProvider.getState();
    const messages = [...store.messages];
    messages.push(initItem(message));
    StoreProvider.dispatch({ type: "messages", messages });
}

export function update<K extends MessageType, T extends DiscriminateMessage<K>>(type: K, callback: (msg: T) => T) {
    const store = StoreProvider.getState();

    let messages = [...store.messages];

    // Remove previous
    const previous = messages.find(x => x.message.type === type);
    if (previous) {
        messages = messages.filter(x => x !== previous);
    }

    // Add new
    const previousMessage = previous ? previous.message as T : null;
    const newMessage = callback(previousMessage);
    if (newMessage) {
        messages.push(initItem(newMessage));
    }

    StoreProvider.dispatch({ type: "messages", messages });
}

export function replace(message: s.Message) {
    update(message.type, () => message);
}

function calculateDuration(message: s.Message): number {
    switch (message.type) {
        case "win": return 1e9;
        case "disconnected": return 1e9;
        case "teams": return TeamsSplashMilliseconds;
        case "text": return TextMilliseconds;
        case "ratingAdjustment": return RatingAdjustmentMilliseconds;
        default: return ExpiryMilliseconds;
    }
}

function messageCleanup() {
    const store = StoreProvider.getState();

    if (store.messages.length === 0) {
        return;
    }

    const now = new Date().getTime();
    const messages = store.messages.filter(item => item.expiryTime > now);
    if (messages.length < store.messages.length) {
        StoreProvider.dispatch({ type: "messages", messages });
    }
}