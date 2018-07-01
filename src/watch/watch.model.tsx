import moment from 'moment';

export interface Game {
    id: string;
    createdTimestamp: moment.Moment;
    playerNames: string[];
    numActivePlayers: number;
    joinable: boolean;
    numTicks: number;
}