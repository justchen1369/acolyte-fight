import wu from 'wu';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as engine from '../../game/engine';
import * as options from '../options';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import DeadMessage from './messages/deadMessage';
import PlayButton from '../ui/playButton';
import WinMessage from './messages/winMessage';

interface Props {
    myHeroId: number;
    isDead: boolean;
    isFinished: boolean;
    items: s.MessageItem[];
    touched: boolean;
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    const myHeroId = world.ui.myHeroId;
    return {
        myHeroId,
        isDead: engine.isDead(myHeroId, world),
        isFinished: !!world.winner || world.finished,
        items: state.messages,
        touched: state.touched,
    };
}

class FinishedPanel extends React.PureComponent<Props> {
    render() {
        const finishedDialog = this.renderNotification();
        return <>
            {finishedDialog && this.renderDiscordAd()}
            {finishedDialog}
        </>
    }

    private renderNotification() {
        const winNotification = wu(this.props.items).map(x => x.message).find(x => x.type === "win") as s.WinMessage;
        if (winNotification) {
            return <WinMessage message={winNotification} />
        } else if (this.props.myHeroId && this.props.isDead) {
            return <DeadMessage />;
        } else if (this.props.isFinished) {
            return this.renderFinished();
        } else {
            return null;
        }
    }

    private renderDiscordAd() {
        if (!options.getProvider().noDiscordAd && !this.props.touched) { // Don't show on mobile because it's easy to misclick
            return <div className="community-advert">
                <span className="label" style={{ marginRight: 5 }}>Like this game?</span>
                <a href="https://discord.gg/sZvgpZk" target="_blank" title="Chat on Discord!"><span className="label">Join the community on Discord</span><i className="fab fa-discord" /></a>
            </div>
        } else {
            return null;
        }
    }

    private renderFinished() {
        return <div className="winner dialog-panel">
            <div className="winner-row">Game finished.</div>
            <div className="action-row">
                {this.renderAgainButton()}
            </div>
        </div>;
    }

    private renderAgainButton() {
        return <PlayButton again={!!this.props.myHeroId} />;
    }
}

export default ReactRedux.connect(stateToProps)(FinishedPanel);