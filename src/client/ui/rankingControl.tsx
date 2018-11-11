import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as rankings from '../core/rankings';
import * as url from '../url';
import NavBarItem from './navbarItem';

interface Props {
    userId: string;
    profile: m.GetProfileResponse;
}

function stateToProps(state: s.State): Props {
    return {
        userId: state.userId,
        profile: state.profile,
    };
}

class RankingControl extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
        this.state = {
        }
    }

    render() {
        const profile = this.props.profile;
        if (!(profile && profile.ratings)) {
            return null;
        }

        const rating = profile.ratings[m.GameCategory.PvP];
        if (!(rating && rating.lowerBound && rating.percentile >= 0)) {
            return null;
        }

        const league = rankings.getLeagueName(rating.percentile);
        return <NavBarItem page="profile" profileId={this.props.userId} className="nav-item-ranking" shrink={true}><span className="ranking-league">{league}</span> <span className="ranking-rating">{rating.lowerBound.toFixed(0)}</span></NavBarItem>
    }
}

export default ReactRedux.connect(stateToProps)(RankingControl);