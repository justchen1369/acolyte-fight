import * as m from '../../shared/messages.model';
import * as s from '../store.model';

export function metricToLabel(metric: string) {
    switch (metric) {
        case s.ScoreboardMetric.Outlasts: return "Outlasts";
        case s.ScoreboardMetric.Damage: return "Damage";
        case s.ScoreboardMetric.Kills: return "Kills";
        case s.ScoreboardMetric.Wins: return "Wins";
        case s.ScoreboardMetric.Games: return "Games";
        default: return metric;
    }
}

export function metricToIcon(metric: string) {
    switch (metric) {
        case s.ScoreboardMetric.Outlasts: return "fas fa-skull";
        case s.ScoreboardMetric.Damage: return "fas fa-heart";
        case s.ScoreboardMetric.Kills: return "fas fa-sword";
        case s.ScoreboardMetric.Wins: return "fas fa-crown";
        case s.ScoreboardMetric.Games: return "fas fa-clock";
        default: return metric;
    }
}

export function metricToValue(metric: string, online: m.OnlinePlayerMsg) {
    switch (metric) {
        case s.ScoreboardMetric.Outlasts: return online.outlasts;
        case s.ScoreboardMetric.Damage: return online.damage;
        case s.ScoreboardMetric.Kills: return online.kills;
        case s.ScoreboardMetric.Wins: return online.wins;
        case s.ScoreboardMetric.Games: return online.games;
        default: return online.games;
    }
}