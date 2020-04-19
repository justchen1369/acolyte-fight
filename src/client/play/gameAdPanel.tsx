import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as engine from '../../game/engine';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as storage from '../storage';
import * as url from '../url';
import BannerAd from '../controls/BannerAd';

interface Props {
    gameId: string;
    isDead: boolean;
    isWon: boolean;
    isStarted: boolean;
    noAutoJoin: boolean;
    numRemainingPlayers: number;
    touched: boolean;
}
interface State {
    showingForGameId: string;
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    const myHeroId = world.ui.myHeroId;
    return {
        gameId: world.ui.myGameId,
        isDead: engine.isDead(myHeroId, world),
        isWon: !!world.winner,
        isStarted: world.tick >= world.startTick,
        noAutoJoin: state.options.noAutoJoin,
        numRemainingPlayers: engine.remainingHeroIds(world).length,
        touched: state.touched,
    };
}

export class GameAdPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showingForGameId: null,
        };
    }

    componentDidUpdate() {
        setImmediate(() => this.recheck());
    }

    render() {
        if (this.props.touched) {
            return null; // Don't show on mobile
        }

        if (this.props.gameId === this.state.showingForGameId) {
            return <BannerAd
                className="dialog-panel game-banner-ad"
                width={300} height={250}
                minScreenWidthProportion={2} minScreenHeightProportion={2}
                hideUntilLoaded={true}
                />
        } else {
            return null;
        }
    }

    private recheck() {
        if (this.props.gameId === this.state.showingForGameId) {
            return; // Already showing
        }

        if (!this.props.isStarted) {
            return; // Don't show before game starts
        }

        if (this.props.isStarted && this.props.isDead && !this.props.isWon && this.props.numRemainingPlayers > 1) {
            // Only show if the user is likely to be on this screen for a long time
            this.setState({ showingForGameId: this.props.gameId });
        }
    }
}

export default ReactRedux.connect(stateToProps)(GameAdPanel);