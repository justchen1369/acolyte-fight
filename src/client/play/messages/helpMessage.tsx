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

const NewVersion = 4;
const NumHelpPages = 5;

interface OwnProps {
}
interface Props extends OwnProps {
    userId: string;
    myHeroId: string;
    isDead: boolean;
    showingHelpPage: number;
    rebindings: KeyBindings;
    tutorial: boolean;
    numSpells: number;
    seenVersion: number;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    const myHeroId = world.ui.myHeroId;
    return {
        userId: state.userId,
        myHeroId,
        isDead: engine.isDead(myHeroId, world),
        showingHelpPage: state.showingHelpPage,
        rebindings: state.rebindings,
        tutorial: state.world.ui.locked === m.LockType.Tutorial,
        numSpells: Object.keys(state.world.settings.Spells).length,
        seenVersion: state.seen,
    };
}

class HelpMessage extends React.PureComponent<Props, State> {
    render() {
        if (!this.props.myHeroId) {
            return null; // Observer doesn't need instructions
        }

        if (this.props.isDead) {
            return null; // Let the "Play Again" message take precedence
        }

        if (this.props.showingHelpPage !== null && this.props.showingHelpPage < NumHelpPages) {
            return this.renderHelp();
        } else if (this.props.tutorial) {
            return this.renderTutorial();
        } else if (this.props.seenVersion < NewVersion) {
            return this.renderNewVersion();
        } else {
            return null;
        }
    }

    private renderHelp() {
        switch (this.props.showingHelpPage) {
            case 0: return this.renderHelpPage0();
            case 1: return this.renderHelpPage1();
            case 2: return this.renderHelpPage2();
            case 3: return this.renderHelpPage3();
            case 4: return this.renderHelpPage4();
            default: return null;
        }
    }

    private renderHelpPage0() {
        if (isMobile) {
            const isSingleTapShoot = this.props.rebindings[w.SpecialKeys.SingleTap] === "q";
            const isDoubleTapDash = this.props.rebindings[w.SpecialKeys.DoubleTap] === "a";
            return <div className="help-box dialog-panel">
                <div className="help-title">How to play (1/{NumHelpPages}):</div>
                <div className="help-row"><span className="icon-container"><i className="fas fa-crosshairs" /></span> <b>Drag</b> to move/aim</div>
                {isSingleTapShoot && <div className="help-row"><span className="icon-container"><i className="fas fa-hand-pointer" /></span> <b>Tap</b> to shoot</div>}
                {isDoubleTapDash && <div className="help-row"><span className="icon-container"><i className="fas fa-forward" /></span> <b>Double-tap</b> to dash</div>}
                {this.renderHelpActions()}
            </div>
        } else {
            const isLeftClickShoot = this.props.rebindings[w.SpecialKeys.LeftClick] === "q";
            const isRightClickDash = this.props.rebindings[w.SpecialKeys.RightClick] === "a";
            const showMouseHint = !(isLeftClickShoot || isRightClickDash);
            return <div className="help-box dialog-panel">
                <div className="help-title">How to play (1/{NumHelpPages}):</div>
                {showMouseHint && <div className="help-row"><span className="icon-container"><i className="fa fa-crosshairs" /></span> <b>Mouse</b> to move/aim</div>}
                {isLeftClickShoot && <div className="help-row"><span className="icon-container"><i className="fa fa-mouse-pointer" /></span> <b>Left-click</b> to shoot</div>}
                {isRightClickDash && <div className="help-row"><span className="icon-container"><i className="fa fa-forward" /></span> <b>Right-click</b> to dash</div>}
                <div className="help-row"><span className="icon-container"><i className="fa fa-keyboard" /></span> <b>Keyboard</b> to cast spells</div>
                {this.renderHelpActions()}
            </div>
        }
    }

    private renderHelpPage1() {
        return <div className="help-box dialog-panel">
            <div className="help-title">This game is about (2/{NumHelpPages}):</div>
            <div className="help-row"><span className="icon-container"><i className="fas fa-crosshairs" /></span> <b>Skillshots:</b> aim to where the enemy is going to be</div>
            <div className="help-row"><span className="icon-container"><i className="fas fa-forward" /></span> <b>Dodging:</b> move sideways to avoid getting hit</div>
            <div className="help-row help-info-row">Maintain a safe distance from your enemy so you have room to dodge.</div>
            {this.renderHelpActions()}
        </div>
    }

    private renderHelpPage2() {
        return <div className="help-box dialog-panel">
            <div className="help-title">This game is about (3/{NumHelpPages}):</div>
            <div className="help-row"><span className="icon-container"><i className="fas fa-wand-magic" /></span> <b>Choosing Spells:</b> There are {this.props.numSpells} spells available. Choose spells which counter enemy spells or synergise with each other.</div>
            {isMobile && <div className="help-row help-info-row">To change spells, click the <i className="fas fa-wand-magic" /> button at the top of the screen.</div>}
            {!isMobile && <div className="help-row help-info-row">To change a spell, right-click its button at the bottom of the screen.</div>}
            {this.renderHelpActions()}
        </div>
    }

    private renderHelpPage3() {
        return <div className="help-box dialog-panel">
            <div className="help-title">This game is about (4/{NumHelpPages}):</div>
            <div className="help-row"><span className="icon-container"><i className="fas fa-crosshairs" /></span> <b>Targeting:</b> This is a free-for-all game. Weak players should attack stronger players together or they will never win.</div>
            {this.renderHelpActions()}
        </div>
    }

    private renderHelpPage4() {
        return <div className="help-box dialog-panel">
            <div className="help-title">How to play (5/{NumHelpPages}):</div>
            <div className="help-row"><span className="icon-container"><i className="fas fa-trophy-alt" /></span> <b>Leaderboard:</b> This is a skill-based game. If you are good, you might reach the the top rank <b>Grandmaster</b>.</div>
            <div className="help-row help-info-row">Good luck!</div>
            {this.renderHelpActions()}
        </div>
    }

    private renderHelpActions() {
        return <div className="action-row">
            <Button className="btn" onClick={(e) => this.onNextHelpClicked(e)}>Next</Button>
            {this.props.showingHelpPage > 0 && <Button className="link-btn" onClick={(e) => this.onPreviousHelpClicked(e)}>Back</Button>}
        </div>
    }

    private renderTutorial() {
        return <div className="help-box dialog-panel">
            <div className="help-title">Tutorial</div>
            <div className="help-row">
                Defeat these bots! Prove you are ready to fight real enemies.
            </div>
            <div className="action-row">
                <Button onClick={() => this.onExitTutorialClick()}>Exit Tutorial</Button>
                <Button className="link-btn" onClick={(e) => this.onPreviousHelpClicked(e)}>Help</Button>
            </div>
        </div>
    }

    private renderNewVersion(): React.ReactNode {
        return null;
        /*
                <p>This game is about:</p>
                <ul>
                    <li><b>Skillshots and dodging:</b> Aim where your enemy is going to be.</li>
                    <li><b>Knockback and recovery:</b> Move out of the way.</li>
                    <li><b>Free for all:</b> Move out of the way.</li>
                </ul>

        return <div className="info-panel dialog-panel">
            <div className="header-row">Recent Updates</div>
            <div className="body-row">The recent changes to damage scaling have been reverted.</div>
            <div className="body-row">For more updates, check the <a href="https://discord.gg/sZvgpZk" target="_blank"><i className="fab fa-discord" /> Discord</a>.</div>
            <div className="action-row">
                <Button className="btn" onClick={(e) => this.onCloseVersionClicked()}>OK</Button>
            </div>
        </div>
        */
    }

    private onExitTutorialClick() {
        tutor.exitTutorial();
        matches.joinNewGame({});
    }

    private onPreviousHelpClicked(e: React.MouseEvent) {
        StoreProvider.dispatch({
            type: "updateShowingHelp",
            showingHelpPage: Math.max(0, this.props.showingHelpPage - 1)
        });
    }

    private onNextHelpClicked(e: React.MouseEvent) {
        let showingHelpPage = this.props.showingHelpPage + 1;
        if (showingHelpPage >= NumHelpPages) {
            showingHelpPage = null;
        }
        StoreProvider.dispatch({ type: "updateShowingHelp", showingHelpPage });
    }

    private onShowHelpClicked(e: React.MouseEvent) {
        StoreProvider.dispatch({ type: "updateShowingHelp", showingHelpPage: 0 });
    }

    private onCloseVersionClicked() {
        seen.saveSeenVersion(NewVersion);
    }
}

export default ReactRedux.connect(stateToProps)(HelpMessage);