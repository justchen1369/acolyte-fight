import _ from 'lodash';

export interface MessageThrottlerConfig {
    maxCharsPerSecond: number;
    historySeconds: number;
    minCharsPerMessage?: number;
}

interface RecentMessage {
    text: string;
    timestamp: number;
    length: number;
}

export function isLink(text: string) {
    return text.startsWith("http");
}

export class MessageThrottler {
    private maxCharsPerSecond: number;
    private historySeconds: number;
    private minCharsPerMessage?: number;

    private recentMessages = new Array<RecentMessage>();

    public constructor(config: MessageThrottlerConfig) {
        this.maxCharsPerSecond = config.maxCharsPerSecond;
        this.historySeconds = config.historySeconds;
        this.minCharsPerMessage = config.minCharsPerMessage || 0;
    }

    public isTooMany() {
        this.cleanup();

        if (this.recentMessages.length <= 0) {
            return false;
        }

        const total = _(this.recentMessages).map(x => Math.max(this.minCharsPerMessage, x.length)).sum();

        const earliest = this.recentMessages[0];
        const seconds = (Date.now() - earliest.timestamp) / 1000.0;
        return total >= seconds * this.maxCharsPerSecond;
    }

    public isDuplicate(text: string) {
        this.cleanup();

        return this.recentMessages.some(x => x.text === text);
    }

    public add(text: string) {
        this.cleanup();

        this.recentMessages.push({
            timestamp: Date.now(),
            length: text.length,
            text,
        });
    }

    private cleanup() {
        const cutoff = Date.now() - this.historySeconds * 1000;
        while (this.recentMessages.length > 0 && this.recentMessages[0].timestamp < cutoff) {
            this.recentMessages.shift();
        }
    }
}