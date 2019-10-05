import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as analytics from '../../core/analytics';
import * as engine from '../../../game/engine';
import * as m from '../../../shared/messages.model';
import * as matches from '../../core/matches';
import * as s from '../../store.model';
import * as seen from '../../core/seen';
import * as tutor from '../../core/tutor';
import * as StoreProvider from '../../storeProvider';
import * as w from '../../../game/world.model';
import { isMobile } from '../../core/userAgent';
import Button from '../../controls/button';

const NewVersion = 5;

interface OwnProps {
}
interface Props extends OwnProps {
    userId: string;
    myGameId: string;
    myHeroId: string;
    isFinished: boolean;
    showingHelp: boolean;
    rebindings: KeyBindings;
    tutorialLevel: number;
    numSpells: number;
    seenVersion: number;
}
interface State {
    hidingTutorialGameId: string;
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    const myHeroId = world.ui.myHeroId;
    return {
        userId: state.userId,
        myGameId: world.ui.myGameId,
        myHeroId,
        isFinished: !!world.winner,
        showingHelp: state.showingHelp,
        rebindings: state.rebindings,
        tutorialLevel: state.world.ui.locked === m.LockType.Tutorial ? state.tutorialLevel : null,
        numSpells: Object.keys(state.world.settings.Spells).length,
        seenVersion: state.seen,
    };
}

class HelpMessage extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            hidingTutorialGameId: null,
        };
    }

    render() {
        if (!this.props.myHeroId) {
            return null; // Observer doesn't need instructions
        }

        if (this.props.isFinished) {
            return null; // Let the "Play Again" message take precedence
        }

        const needsHelp = !this.props.userId; // Don't show help to users who have played enough games to have an account
        if (needsHelp && this.props.showingHelp) {
            return this.renderHelp();
        } else if (this.props.tutorialLevel) {
            return this.renderTutorial();
        } else if (this.props.seenVersion < NewVersion) {
            return this.renderNewVersion();
        } else {
            return null;
        }
    }

    private renderHelp() {
        return <div className="help-box dialog-panel">
            <div className="help-title">{this.props.tutorialLevel ? "Tutorial" : "How to play:"}</div>
            {this.renderHelpContent()}
            <div className="action-row">
                <Button className="btn" onClick={(e) => this.onHideHelpClicked(e)}>OK</Button>
                {this.props.tutorialLevel && <Button className="link-btn" onClick={() => this.onExitTutorialClick()}>Exit Tutorial</Button>}
            </div>
        </div>
    }

    private renderHelpContent() {
        if (isMobile) {
            const isSingleTapShoot = this.props.rebindings[w.SpecialKeys.SingleTap] === "q";
            const isDoubleTapDash = this.props.rebindings[w.SpecialKeys.DoubleTap] === "a";
            return <>
                <div className="help-row"><span className="icon-container"><i className="fas fa-crosshairs" /></span> <b>Drag</b> to move/aim</div>
                {isSingleTapShoot && <div className="help-row"><span className="icon-container"><i className="fas fa-hand-pointer" /></span> <b>Tap</b> to shoot</div>}
                {isDoubleTapDash && <div className="help-row"><span className="icon-container"><i className="fas fa-forward" /></span> <b>Double-tap</b> to dash</div>}
            </>
        } else {
            const isLeftClickShoot = this.props.rebindings[w.SpecialKeys.LeftClick] === "q";
            const isRightClickDash = this.props.rebindings[w.SpecialKeys.RightClick] === "a";
            const showMouseHint = !(isLeftClickShoot || isRightClickDash);
            return <>
                {showMouseHint && <div className="help-row"><span className="icon-container"><i className="fa fa-crosshairs" /></span> <b>Mouse</b> to move/aim</div>}
                {isLeftClickShoot && <div className="help-row"><span className="icon-container"><i className="fa fa-mouse-pointer" /></span> <b>Left-click</b> to shoot</div>}
                {isRightClickDash && <div className="help-row"><span className="icon-container"><i className="fa fa-forward" /></span> <b>Right-click</b> to dash</div>}
                <div className="help-row"><span className="icon-container"><i className="fa fa-keyboard" /></span> <b>Keyboard</b> to cast spells</div>
            </>
        }
    }

    private renderTutorial() {
        if (this.props.myGameId === this.state.hidingTutorialGameId) {
            return null;
        }

        if (this.props.tutorialLevel > 1) {
            return <div className="help-box dialog-panel">
                <div className="help-title">Tutorial</div>
                <div className="help-row">
                    Are you ready to fight real enemies?
                </div>
                <div className="action-row">
                    <Button onClick={() => this.onExitTutorialClick()}>Exit Tutorial</Button>
                    <Button className="link-btn" onClick={() => this.onHideTutorialClick()}>Continue Playing</Button>
                </div>
            </div>
        } else {
            return <div className="help-box dialog-panel">
                <div className="help-title">Tutorial</div>
                <div className="help-row">
                    Defeat this bot! Prove you are ready to fight real enemies.
                </div>
                <div className="action-row">
                    <Button onClick={() => this.onHideTutorialClick()}>OK</Button>
                    <Button className="link-btn" onClick={() => this.onExitTutorialClick()}>Exit Tutorial</Button>
                </div>
            </div>
        }
    }

    private renderNewVersion(): React.ReactNode {
        return null;
        /*
        return <div className="info-panel dialog-panel">
            <div className="header-row">Recent Updates</div>
            <div className="body-row">Movement speed increased 10%.</div>
            <div className="body-row">For more updates, check <a href="https://discord.gg/sZvgpZk" target="_blank"><i className="fab fa-discord" /> Discord</a>.</div>
            <div className="action-row">
                <Button className="btn" onClick={(e) => this.onCloseVersionClicked()}>OK</Button>
            </div>
        </div>
        */
    }

    private onHideTutorialClick() {
        this.setState({ hidingTutorialGameId: this.props.myGameId });
    }

    private onExitTutorialClick() {
        tutor.exitTutorial();
        matches.joinNewGame({});
    }

    private onHideHelpClicked(e: React.MouseEvent) {
        StoreProvider.dispatch({ type: "updateShowingHelp", showingHelp: false });
    }

    private onCloseVersionClicked() {
        seen.saveSeenVersion(NewVersion);
    }
}

export default ReactRedux.connect(stateToProps)(HelpMessage);