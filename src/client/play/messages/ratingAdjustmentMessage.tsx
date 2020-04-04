import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as matches from '../../core/matches';
import * as mathUtils from '../../core/mathUtils';
import * as rankings from '../../core/rankings';
import * as StoreProvider from '../../storeProvider';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';

import Link from '../../controls/link';

interface OwnProps {
    message: s.RatingMessage;
}
interface Props extends OwnProps {
    myGameId: string;
    userId: string;
    unranked: boolean;
    leagues: m.League[];
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        myGameId: state.world.ui.myGameId,
        userId: state.userId,
        leagues: state.leagues,
        unranked: state.options.unranked,
    };
}

class RatingAdjustmentMessage extends React.PureComponent<Props, State> {
    componentDidMount() {
        rankings.downloadLeagues(); // Don't await
    }

    render() {
        if (!this.props.leagues) {
            return null;
        }

        const message = this.props.message;

        if (!this.props.unranked) {
            const delta = message.acoDelta;
            const finalAcoExposure = message.initialAcoExposure + delta;
            if (!finalAcoExposure) {
                // Data unavailable for some reason
                return null;
            }

            const league = rankings.getLeagueFromRating(finalAcoExposure, this.props.leagues);
            const nextLeague = rankings.getNextLeagueFromRating(finalAcoExposure, this.props.leagues);

            return <div className="row rating-notification">
                <div>Your rating has changed: <b>{league.name}</b> {Math.floor(finalAcoExposure)} ({this.renderRatingAdjustment(delta)}).</div>
                {nextLeague && <div className="next-league-hint">Points remaining until next league: <b>+{Math.ceil(nextLeague.minRating - finalAcoExposure)}</b>.</div>}
                <div className="unranked-hint"><Link page="profile" profileId={this.props.userId} onClick={() => matches.leaveCurrentGame()}>Go to your profile</Link> to change to unranked mode.</div>
            </div>
        } else {
            return null;
        }
    }

    private renderRatingAdjustment(ratingDelta: number) {
        if (ratingDelta >= 0) {
            return <span className="rating rating-increase">{mathUtils.deltaPrecision(ratingDelta)}</span>
        } else {
            return <span className="rating rating-decrease">{mathUtils.deltaPrecision(ratingDelta)}</span>
        }
    }
}

export default ReactRedux.connect(stateToProps)(RatingAdjustmentMessage);