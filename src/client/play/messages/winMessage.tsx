import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';
import * as w from '../../../game/world.model';
import { isMobile } from '../../core/userAgent';
import PlayButton from '../../ui/playButton';
import PlayerName from '../playerNameComponent';

interface OwnProps {
    notification: w.WinNotification;
}
interface Props extends OwnProps {
    myHeroId: string;
    score: w.HeroScore;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const world = state.world;
    return {
        ...ownProps,
        myHeroId: world.ui.myHeroId,
        score: world.scores.get(world.ui.myHeroId),
    };
}

class WinMessage extends React.PureComponent<Props, State> {
    render() {
        const notification = this.props.notification;
        const score = this.props.score;
        return <div className="winner dialog-panel">
            {this.renderWinnerRow(notification.winners)}

            <div className="award-group">
                <div className="award-row">
                    Most damage: <PlayerName player={notification.mostDamage} /> ({notification.mostDamageAmount.toFixed(0)}). {score && <span className="self-metric">Your damage: {score.damage.toFixed(0)}.</span>}
                </div>

                <div className="award-row">
                    Most kills: <PlayerName player={notification.mostKills} /> ({notification.mostKillsCount} kills). {score && <span className="self-metric">Your kills: {score.kills}.</span>}
                </div>

                {score && <div className="award-row outlast-row">You outlasted {score.outlasts} {score.outlasts === 1 ? "other" : "others"}.</div>}
            </div>

            <div className="action-row">
                <PlayButton again={!!this.props.myHeroId} />
            </div>
        </div>;
    }

    private renderWinnerRow(winners: w.Player[]) {
        if (!(winners && winners.length > 0)) {
            return null;
        } else if (winners.length === 1) {
            return <div className="winner-row"><PlayerName player={winners[0]} /> is the winner!</div>
        } else {
            const elems = new Array<React.ReactNode>();
            for (let i = 0; i < winners.length; ++i) {
                const winner = winners[i];
                const isFirst = i === 0;
                const isLast = i === winners.length - 1;
                if (!isFirst) {
                    if (isLast) {
                        elems.push(" & ");
                    } else {
                        elems.push(", ");
                    }
                }
                elems.push(<PlayerName key={winner.heroId} player={winner} />);
            }
            return <div className="winner-row"> {elems} win!</div>
        }
    }

}

export default ReactRedux.connect(stateToProps)(WinMessage);