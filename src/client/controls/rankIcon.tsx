import * as React from 'react';
import * as m from '../../shared/messages.model';
import { base } from '../url';

interface Props extends React.HTMLAttributes<HTMLImageElement> {
    league: string;
}

const prefix = `${base}/cdn/ranks/`;

function leagueToImageUrl(league: string) {
    switch (league) {
        case "Grandmaster": return prefix + "stars-stack.svg";
        case "Master": return prefix + "rank-3.svg";
        case "Diamond": return prefix + "rank-2.svg";
        case "Platinum": return prefix + "rank-1.svg";
        case "Gold": return prefix + "sergeant.svg";
        case "Silver": return prefix + "corporal.svg";
        case "Bronze": return prefix + "private.svg";
        case "Wood": return prefix + "person.svg";
        default: return null;
    }
}

export default class RankIcon extends React.PureComponent<Props> {
    render() {
        const league = this.props.league;
        const imageUrl = leagueToImageUrl(league);
        if (imageUrl) {
            return <img className={`rank-icon ${league}`} title={`${league} league`} src={imageUrl} {...this.props} />
        } else {
            return null;
        }
    }
}