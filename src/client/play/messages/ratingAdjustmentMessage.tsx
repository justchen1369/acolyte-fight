import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as matches from '../../core/matches';
import * as mathUtils from '../../core/mathUtils';
import * as StoreProvider from '../../storeProvider';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';

import Link from '../../controls/link';

interface OwnProps {
    notification: w.RatingAdjustmentNotification;
}
interface Props extends OwnProps {
    myGameId: string;
    userId: string;
    unranked: boolean;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        myGameId: state.world.ui.myGameId,
        userId: state.userId,
        unranked: state.options.unranked,
    };
}

class RatingAdjustmentMessage extends React.PureComponent<Props, State> {
    render() {
        const notification = this.props.notification;

        if (!this.props.unranked && notification.gameId === this.props.myGameId) {
            const delta = notification.acoDelta;
            return <div className="row rating-notification">
                <div>Your rating has changed: {this.renderRatingAdjustment(delta)}.</div>
                <div className="unranked-hint"><Link page="profile" profileId={this.props.userId} onClick={() => matches.leaveCurrentGame()}>Go to your profile</Link> to changed to unranked mode.</div>
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