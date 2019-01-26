import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as rankings from '../core/rankings';
import * as url from '../url';
import PageLink from './pageLink';

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

class RatingControl extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
        this.state = {
        }
    }

    render() {
        const rating = this.getRating();
        if (rating) {
            return this.renderRank(rating);
        } else {
            return null;
        }
    }

    private renderRank(rating: rankings.Rating) {
        const league = rankings.getLeagueName(rating.percentile);
        return <PageLink shrink={true} key="rank" page="profile" className="nav-item-ranking" profileId={this.props.userId}>
            <b>{league}</b> {rating.exposure.toFixed(0)}
        </PageLink>
    }

    private getRating() {
        const profile = this.props.profile;
        if (!(profile && profile.ratings)) {
            return null;
        }

        const rating = profile.ratings[m.GameCategory.PvP];
        if (!(rating && rating.numGames >= constants.Placements.MinGames)) {
            return null;
        }

        const values: rankings.Rating = rankings.getRating(rating);
        if (!(values.exposure && values.percentile >= 0)) {
            return null;
        }

        return values;
    }
}

export default ReactRedux.connect(stateToProps)(RatingControl);