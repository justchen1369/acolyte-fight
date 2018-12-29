import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as pages from '../core/pages';
import * as url from '../url';
import { isMobile } from '../core/userAgent';
import LoginButton from './loginButton';
import CustomBar from './customBar';
import PageLink from './pageLink';
import RatingControl from './ratingControl';

interface Props {
    page: string;
    userId: string;
    isUsingAI: boolean;
    isModded: boolean;
    inParty: boolean;
}

interface State {
}

function stateToProps(state: s.State): Props {
    return {
        page: state.current.page,
        userId: state.userId,
        isUsingAI: !!state.aiCode,
        isModded: Object.keys(state.room.mod).length > 0,
        inParty: !!state.party,
    };
}

class NavBar extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        }
    }

    render() {
        if (this.props.page === "") {
            return this.renderNavBar();
        } else {
            return this.renderBackToHome();
        }
    }

    private renderBackToHome() {
        return <CustomBar>
            <PageLink page=""><i className="fas fa-chevron-left" /><span className="shrink"> Back to</span> Home</PageLink>
            <div className="spacer" />
            <LoginButton />
        </CustomBar>
    }

    private renderNavBar() {
        const a = options.getProvider();
        const horizontal = <>
            {!a.noScrolling && <PageLink page="leaderboard" shrink={true}><i className="fas fa-star" title="Leaderboard" /><span className="shrink"> Leaderboard</span></PageLink>}
            {!a.noExternalLinks && <PageLink page="regions"><i className="fas fa-globe-americas" title="Regions" /></PageLink>}
            {this.props.isModded && <PageLink page="modding" badge={this.props.isModded}><i className="icon fas fa-wrench" title="Modding" /></PageLink>}
            {this.props.isUsingAI && <PageLink page="ai" badge={this.props.isUsingAI}><i className="icon fas fa-microchip" title="AI" /></PageLink>}
            {this.props.inParty && <PageLink page="party" badge={this.props.inParty} shrink={true}><i className="fas fa-user-friends" title="Party" /></PageLink>}
            <div className="spacer" />
            <RatingControl />
            <LoginButton />
        </>;

        const vertical = a.noMenu ? null : <>
            <PageLink page=""><i className="icon fas fa-home" /> Home</PageLink>
            {!a.noScrolling && <PageLink page="leaderboard"><i className="icon fas fa-star" /> Leaderboard</PageLink>}
            <PageLink page="profile" className="nav-profile-item" profileId={this.props.userId}><i className="icon fas fa-video" /> Replays</PageLink>
            {!a.noExternalLinks && <PageLink page="regions"><i className="icon fas fa-globe-americas" /> Regions</PageLink>}
            {!a.noExternalLinks && <PageLink page="party" badge={this.props.inParty}><i className="icon fas fa-user-friends" /> Party</PageLink>}
            {!a.noScrolling && <PageLink page="settings"><i className="icon fas fa-cog" /> Settings</PageLink>}
            <div className="spacer" />
            {!a.noAdvanced && !isMobile && <PageLink page="modding" badge={this.props.isModded}><i className="icon fas fa-wrench" /> Modding</PageLink>}
            {!a.noExternalLinks && <PageLink page="about"><i className="icon fas fa-info-circle" /> About</PageLink>}
        </>;
        return <CustomBar vertical={vertical}>{horizontal}</CustomBar>
    }
}

export default ReactRedux.connect(stateToProps)(NavBar);