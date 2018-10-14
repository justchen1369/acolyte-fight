import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as pages from '../core/pages';
import * as url from '../url';
import AccountPanel from './accountPanel';
import RecentGamesList from './recentGameList';
import UserStatsPanel from './userStatsPanel';

interface Props {
    current: s.PathElements;
    myUserId: string;
}
interface State {
    category: string;
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
        myUserId: state.userId,
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
        const isMe = profileId === this.props.myUserId;

        const category = isMe ? this.state.category : m.GameCategory.PvP;
        return <div className="profile-panel">
            {isMe && this.renderCategorySelector()}
            {isMe && <AccountPanel />}
            <UserStatsPanel profileId={profileId} category={category} />
            {isMe && <RecentGamesList category={category} />}
        </div>
    }

    private renderCategorySelector(): JSX.Element {
        return <div className="category-selector">
            {m.GameCategory.All.map(category => (
                <div
                    key={category}
                    className={category === this.state.category ? "category category-selected" : "category"}
                    onClick={() => this.setState({ category })}
                    >
                    {category}
                </div>
            ))}
        </div>
    }

}

export default ReactRedux.connect(stateToProps)(ProfilePanel);