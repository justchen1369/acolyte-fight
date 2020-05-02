import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as engine from '../../game/engine';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as storage from '../storage';
import * as url from '../url';
import BannerAd from '../controls/BannerAd';
import './gameAdPanel.scss';

interface Props {
    gameId: string;
    hoveringSpell: boolean;
    isPlaying: boolean;
    isDead: boolean;
    isWon: boolean;
    isStarting: boolean;
    touched: boolean;
}
interface State {
    showingForGameId: string;
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    const myHeroId = world.ui.myHeroId;
    return {
        hoveringSpell: !!(state.world.ui.toolbar.alternativeSpellId || state.world.ui.toolbar.hoverSpellId),
        gameId: world.ui.myGameId,
        isPlaying: !!myHeroId,
        isDead: engine.isDead(myHeroId, world),
        isWon: !!world.winner,
        isStarting: (world.startTick - world.tick) <= constants.Matchmaking.JoinPeriod,
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

        if (!!this.state.showingForGameId) {
            const className = classNames('game-banner-ad', {
                'game-banner-ad-covered': this.props.hoveringSpell,
            });
            return <BannerAd
                className={className}
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

        if (this.props.isStarting
            && this.props.isPlaying
            && (this.props.isDead || this.props.isWon)) {

            // This game is complete, show an ad
            this.setState({ showingForGameId: this.props.gameId });
        } else if (!!this.state.showingForGameId && this.props.gameId !== this.state.showingForGameId && this.props.isStarting) {
            // Previous game was showing an ad, stop showing as soon as this game starts
            this.setState({ showingForGameId: null });
        }
    }
}

export default ReactRedux.connect(stateToProps)(GameAdPanel);