import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as engine from '../../game/engine';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as storage from '../storage';
import * as url from '../url';
import BannerAd from '../ads/BannerAd';

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
    screenWidth: number;
    screenHeight: number;
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
    private resizeListener = this.recheckScreenSize.bind(this);

    constructor(props: Props) {
        super(props);
        this.state = {
            showingForGameId: null,
            screenWidth: 0,
            screenHeight: 0,
        };
    }

    componentDidMount() {
        window.addEventListener('resize', this.resizeListener);
        this.recheckScreenSize();
    }

    componentDidUpdate() {
        setImmediate(() => this.recheck());
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resizeListener);
    }

    render() {
        if (this.props.touched) {
            return null; // Don't show on mobile
        }

        if (this.state.screenWidth < 800 || this.state.screenHeight < 600) {
            return null; // Screen too small
        }

        if (this.props.gameId === this.state.showingForGameId) {
            return <BannerAd className="dialog-panel game-banner-ad" width={300} height={250} />
        } else {
            return null;
        }
    }

    private recheckScreenSize() {
        this.setState({
            screenWidth: document.body.clientWidth,
            screenHeight: document.body.clientHeight,
        });
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