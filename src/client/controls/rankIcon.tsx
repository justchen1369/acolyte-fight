import * as React from 'react';
import * as m from '../../shared/messages.model';

interface Props extends React.HTMLAttributes<HTMLImageElement> {
    league: string;
}

const base = "https://storage.googleapis.com/acolytefight.io/ranks/";

function leagueToImageUrl(league: string) {
    switch (league) {
        case "Grandmaster": return base + "stars-stack.svg";
        case "Master": return base + "rank-3.svg";
        case "Diamond": return base + "rank-2.svg";
        case "Platinum": return base + "rank-1.svg";
        case "Gold": return base + "sergeant.svg";
        case "Silver": return base + "corporal.svg";
        case "Bronze": return base + "private.svg";
        case "Wood": return base + "person.svg";
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