import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as matches from '../../core/matches';
import * as pages from '../../core/pages';
import * as segments from '../../../game/segments';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import { worldInterruptible } from '../../core/matches';
import Button from '../../controls/button';

interface OwnProps {
}
interface Props extends OwnProps {
    segment: string;
    numOnline: number;
    numPlayers: number;
    exitable: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        segment: state.onlineSegment,
        numOnline: state.online.size,
        numPlayers: state.world.players.size,
        exitable: worldInterruptible(state.world),
    };
}

class WaitingMessage extends React.PureComponent<Props, State> {
    render() {
        const numOnline = this.props.numOnline;
        const isPublic = this.props.segment === segments.publicSegment();
        return <div className="waiting-panel dialog-panel">
            <div className="header-row loading-text">Waiting for opponents...</div>
            <div className="body-row">
                {numOnline} {numOnline === 1 ? "player" : "players"} online{!isPublic && " in this game mode"}.
                {' '}
                {this.props.exitable && numOnline <= 1 && <>You might find players on <Button className="link-btn" onClick={(ev) => this.onRegionsLinkClick(ev)}>other regions</Button>.</>}
                {this.props.exitable && numOnline > 1 && <>Would you like to <Button className="link-btn" onClick={(ev) => this.onWatchLiveClick(ev)}>watch the other players</Button>?</>}
            </div>
            {this.props.numPlayers <= 1 && <div className="action-row">
                <Button onClick={() => matches.addBotToCurrentGame()}>Play vs AI</Button>
            </div>}
        </div>
    }

    private onRegionsLinkClick(ev: React.MouseEvent) {
        ev.preventDefault();
        matches.leaveCurrentGame(true);
        pages.changePage("regions");
    }

    private onWatchLiveClick(ev: React.MouseEvent) {
        ev.preventDefault();
        matches.watchLiveGame();
    }
}

export default ReactRedux.connect(stateToProps)(WaitingMessage);