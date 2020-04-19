import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as cloud from '../core/cloud';
import * as pages from '../core/pages';
import * as url from '../url';
import AccountPanel from './accountPanel';
import BannerAdRow from '../controls/BannerAdRow';
import CategorySelector from '../controls/categorySelector';
import ProfileGameList from './profileGameList';
import RecentGamesList from './recentGameList';
import UnrankedTogglePanel from './unrankedTogglePanel';
import UserStatsPanel from './userStatsPanel';

import './profilePanel.scss';

const categories = [
    m.GameCategory.PvP,
    m.GameCategory.PvAI,
    m.GameCategory.AllCategory,
];

interface Props {
    current: s.PathElements;
    myUserId: string;
    loggedIn: boolean;
    unranked: boolean;
}
interface State {
    category: string;
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        myUserId: state.userId,
        loggedIn: state.loggedIn,
        unranked: state.options.unranked,
    };
}

export class ProfilePanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            category: m.GameCategory.PvP,
        };
    }

    render() {
        const a = options.getProvider();
        const profileId = this.props.current.profileId || this.props.myUserId;
        const isMe = profileId === this.props.myUserId;

        const category = isMe ? this.state.category : m.GameCategory.PvP;
        return <div className="profile-panel">
            {isMe && <CategorySelector categories={categories} category={this.state.category} onCategoryChange={category => this.setState({ category })} />}
            {!a.noLogin && isMe && this.props.loggedIn && <div>
                <h1>Your Account</h1>
                <AccountPanel />
            </div>}
            {!a.noLogin && isMe && !this.props.loggedIn && <div>
                <h1>Your Stats</h1>
                <p className="login-ad"><div className="btn" onClick={() => window.location.href = "login"}>Login</div> to share stats across devices</p>
            </div>}
            {isMe && <UnrankedTogglePanel />}
            <UserStatsPanel
                profileId={profileId}
                category={category}
                showNumGames={isMe ? this.props.unranked : false}
                showRanking={isMe ? !this.props.unranked : true}
                showWinRates={isMe ? !this.props.unranked : true}
                showBuild={true}
                pageTitle={true}
                />
            <BannerAdRow width={728} height={90} />
            <h1>Replays</h1>
            {isMe
                ? <RecentGamesList category={category} />
                : <ProfileGameList profileId={profileId} category={category} /> }
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(ProfilePanel);