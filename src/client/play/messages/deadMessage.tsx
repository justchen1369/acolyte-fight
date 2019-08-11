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
}
interface Props extends OwnProps {
    myGameId: string;
    myHeroId: string;
    score: w.HeroScore;
}
interface State {
    spectatingGameId: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const world = state.world;
    return {
        ...ownProps,
        myGameId: world.ui.myGameId,
        myHeroId: world.ui.myHeroId,
        score: world.scores.get(world.ui.myHeroId),
    };
}

class DeadMessage extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            spectatingGameId: null,
        };
    }

    render() {
        if (this.props.myGameId === this.state.spectatingGameId) {
            return null;
        }

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
                    <b><Button className="link-btn" onClick={() => this.setState({ spectatingGameId: this.props.myGameId })}>Continue Watching</Button></b> or
                </div>
                <div>
                    <PlayButton again={!!this.props.myHeroId} />
                </div>
            </div>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(DeadMessage);