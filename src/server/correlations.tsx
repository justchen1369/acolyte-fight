import * as g from './server.model';
import * as transientIds from './transientIds';

const correlations = new Map<number, g.Correlation>();

export function create(socketId: string, gameId: string): g.Correlation {
    const correlation: g.Correlation = {
        id: transientIds.generate(),
        socketId,
        gameId,
    };
    correlations.set(correlation.id, correlation);
    return correlation;
}

export function get(correlationId: number): g.Correlation {
    return correlations.get(correlationId);
}

export function destroy(correlationId: number) {
    correlations.delete(correlationId);
}

export function reap(aliveSocketIds: Set<string>) {
    correlations.forEach(correlation => {
        if (!aliveSocketIds.has(correlation.socketId)) {
            correlations.delete(correlation.id); // Yes you can delete from a map while iterating it
        }
    });
}