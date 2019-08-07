import _ from 'lodash';
import classNames from 'classnames';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as p from './profile.model';
import * as s from '../store.model';
import * as constants from '../../game/constants';
import * as pages from '../core/pages';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

interface OwnProps {
    player: p.PlayerStats;
}
interface Props extends OwnProps {
    current: s.PathElements;
}
interface State {
    error: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
    };
}

class GamePlayer extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            error: null,
        };
    }

    render() {
        const player = this.props.player;
        const playerUrl = player.userId ? url.getPath({ ...this.props.current, page: "profile", profileId: player.userId }) : null;

        return <span key={player.userHash} className="player-cell" title={`${player.name}: ${player.wins ? "winner, " : ""}${player.kills} kills, ${Math.round(player.damage)} damage`}>
            <a href={playerUrl} onClick={(ev) => this.onPlayerClick(ev, player.userId)} className={`${player.wins ? "winner" : "loser"} ${playerUrl ? "known" : "unknown"}`}>
                {player.wins ? <i className="fas fa-crown" /> : null}
                {player.name}
            </a>
        </span>
    }

    private onPlayerClick(ev: React.MouseEvent, userId: string) {
        if (userId) {
            ev.preventDefault();
            pages.changePage("profile", userId);
        }
    }
}

export default ReactRedux.connect(stateToProps)(GamePlayer);