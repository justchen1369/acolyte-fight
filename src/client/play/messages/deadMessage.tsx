import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';
import * as w from '../../../game/world.model';
import Button from '../../controls/button';
import PlayButton from '../../ui/playButton';

interface OwnProps {
    onSpectateClick: () => void;
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

class DeadMessage extends React.PureComponent<Props, State> {
    render() {
        const score = this.props.score;
        return <div className="winner dialog-panel">
            <div className="winner-row">You died.</div>

            {score && <>
                <div className="award-row self-metric">Your damage: {score.damage.toFixed(0)}.</div>
                <div className="award-row self-metric">Your kills: {score.kills}.</div>
                <div className="award-row self-metric">You outlasted {score.outlasts} {score.outlasts === 1 ? "other" : "others"}.</div>
            </>}

            <div className="action-row">
                <div style={{ marginBottom: 12 }}>
                    <b><Button className="link-btn" onClick={() => this.props.onSpectateClick()}>Continue Watching</Button></b> or
                </div>
                <div>
                    <PlayButton again={!!this.props.myHeroId} />
                </div>
            </div>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(DeadMessage);