import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as pages from '../core/pages';
import * as url from '../url';
import AccountPanel from './accountPanel';
import CategorySelector from './categorySelector';
import RecentGamesList from './recentGameList';
import UserStatsPanel from './userStatsPanel';
import { isMobile } from '../core/userAgent';

interface Props {
    current: s.PathElements;
    myUserId: string;
    loggedIn: boolean;
}
interface State {
    category: string;
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        myUserId: state.userId,
        loggedIn: state.loggedIn,
    };
}

export class ProfilePanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            category: m.GameCategory.PvP,
        };
    }

    render() {
        const profileId = this.props.current.profileId || this.props.myUserId;
        const isMe = this.props.loggedIn && profileId === this.props.myUserId;

        const category = isMe ? this.state.category : m.GameCategory.PvP;
        return <div className="profile-panel">
            {isMe && <CategorySelector category={this.state.category} onCategoryChange={category => this.setState({ category })} />}
            {isMe && <div>
                <h1>Your Account</h1>
                <AccountPanel />
            </div>}
            {this.props.loggedIn && <UserStatsPanel profileId={profileId} category={category} more={true} />}
            {!this.props.loggedIn && <div>
                <h1>Replays</h1>
                <p className="login-ad"><div className="btn" onClick={() => window.location.href = "login"}>Login</div> to see your replays</p>
            </div>}
            {isMe && <div>
                <h1>Replays</h1>
                <RecentGamesList category={category} />
            </div>}
        </div>
    }

}

export default ReactRedux.connect(stateToProps)(ProfilePanel);