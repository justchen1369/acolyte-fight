import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../core/cloud';
import * as constants from '../../game/constants';
import * as m from '../../game/messages.model';
import * as pages from '../core/pages';
import * as s from '../store.model';
import * as rankings from '../core/rankings';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import HrefItem from './hrefItem';
import PageLink from './pageLink';
import { isMobile } from '../core/userAgent';

interface Props {
    userId: string;
    profile: m.GetProfileResponse;
    unranked: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        userId: state.userId,
        profile: state.profile,
        unranked: state.options.unranked,
    };
}

class RatingControl extends React.Component<Props> {
    private uploadSettingsDebounced = _.debounce(() => cloud.uploadSettings(), 200);

    constructor(props: Props) {
        super(props);
        this.state = {
        }
    }

    render() {
        const rating = this.getRating();
        if (rating) {
            if (this.props.unranked) {
                return this.renderUnrankedToggle();
            } else {
                return <>
                    {this.renderRankedToggle()}
                    {this.renderRank(rating)}
                </>
            }
        } else {
            return null;
        }
    }

    private renderUnrankedToggle() {
        return <HrefItem
            key="unranked-toggle"
            className="nav-item-unranked-toggle"
            title="You are currently in unranked mode - you will not gain or lose rating points. Click to switch to Ranked Mode"
            onClick={ev => this.onUnrankedToggleClick(ev)}>
            <i className="fas fa-gamepad" style={{ marginRight: 4 }} /><span className="shrink"> Unranked Mode</span>
        </HrefItem>
    }

    private renderRankedToggle() {
        return <HrefItem
            key="unranked-toggle"
            className="nav-item-unranked-toggle"
            title="Switch to Unranked Mode"
            onClick={ev => this.onUnrankedToggleClick(ev)}>
            <i className="fas fa-trophy-alt" />
        </HrefItem>
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

    private onUnrankedToggleClick(ev: React.MouseEvent) {
        ev.preventDefault();
        if (isMobile) { // Can't display tooltips on mobile so take them to the relevant page instead
            pages.changePage("profile", this.props.userId);
        } else {
            StoreProvider.dispatch({
                type: "updateOptions",
                options: {
                    unranked: !this.props.unranked,
                },
            });
            this.uploadSettingsDebounced();
        }
    }
}

export default ReactRedux.connect(stateToProps)(RatingControl);