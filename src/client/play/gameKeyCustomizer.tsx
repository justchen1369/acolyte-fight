import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as keyboardUtils from '../core/keyboardUtils';
import * as spellUtils from '../core/spellUtils';
import * as StoreProvider from '../storeProvider';

import RandomizeBtnConfig from './randomizeBtnConfig';
import SpellBtnConfig from './spellBtnConfig';

import { isMobile } from '../core/userAgent';
import { sendKeyBindings } from '../core/ticker';

interface Props {
    btn: string;
    gameId: string;
    heroId: string;
    allowSpellChoosing: boolean;
    gameStarting: boolean;
    gameStarted: boolean;
    gameFinished: boolean;
    hoverBtn: string;
    hoverSpellId: string;
    hoverRandomizer: boolean;
    wheelOnRight: boolean;
    config: KeyBindings;
    rebindingLookup: Map<string, string>;
    settings: AcolyteFightSettings;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        btn: state.world.ui.toolbar.customizingBtn,
        gameId: state.world.ui.myGameId,
        heroId: state.world.ui.myHeroId,
        gameStarting: engine.isGameStarting(state.world),
        gameStarted: state.world.tick >= state.world.startTick,
        gameFinished: !!state.world.winner,
        allowSpellChoosing: engine.allowSpellChoosing(state.world, state.world.ui.myHeroId),
        hoverBtn: state.world.ui.toolbar.hoverBtn,
        hoverSpellId: state.world.ui.toolbar.hoverSpellId,
        hoverRandomizer: state.world.ui.toolbar.hoverRandomizer,
        wheelOnRight: state.options.wheelOnRight,
        config: state.keyBindings,
        rebindingLookup: keyboardUtils.getRebindingLookup(state.rebindings),
        settings: state.world.settings,
    };
}

class GameKeyCustomizer extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const btn = this.props.btn;
        if (btn && !keyboardUtils.isSpecialKey(btn)) {
            return this.renderCustomizeBtn(btn);
        } else if (this.props.allowSpellChoosing) {
            if (isMobile && this.props.hoverBtn && this.props.hoverSpellId) {
                return this.renderMobileHint(this.props.hoverBtn, this.props.hoverSpellId);
            } else if (!isMobile && this.props.hoverBtn) {
                return this.renderDesktopHint();
            } else {
                return this.renderChangeSpellHint();
            }
        } else {
            return null;
        }
    }

    private renderChangeSpellHint() {
        if (this.props.gameStarting && !this.props.gameFinished) {
            return null;
        }

        if (isMobile) {
            return null;
        } else {
            return <div className="customize-hint">
                <div>
                    <RandomizeBtnConfig settings={this.props.settings} onChosen={(keyBindings) => this.onChosen(keyBindings)}>
                        <i className="fas fa-dice" />
                    </RandomizeBtnConfig>
                </div>
                {this.props.hoverRandomizer ? "Randomize a spell" : "Right-click a button below to change spells"}
            </div>
        }
    }

    private renderMobileHint(hoverBtn: string, hoverSpellId: string) {
        if (this.props.gameStarting) {
            return null;
        }

        const spell = this.props.settings.Spells[hoverSpellId];
        if (!spell) {
            return null;
        }

        return <div className="customize-hint">
            <span className="spell-name">{spellUtils.spellName(spell)}</span> - long press to change
        </div>;
    }

    private renderDesktopHint() {
        let keyboardShortcutHint: string = null;
        if (this.props.hoverBtn) {
            const btn = this.props.rebindingLookup.get(this.props.hoverBtn) || this.props.hoverBtn;
            keyboardShortcutHint = ` (Shift+${btn.toUpperCase()})`;
        }

        return <div className="customize-hint">Right-click to change{keyboardShortcutHint}</div>;
    }

    private renderCustomizeBtn(btn: string) {
        return <div className="spell-config-container" onMouseDown={() => this.close()} onContextMenu={ev => ev.preventDefault()}>
            <div className="spell-config">
                {this.props.gameStarted && <div className="in-progress-warning">Game in progress - change will apply to the next game</div>}
                <SpellBtnConfig btn={btn} onChosen={(keyBindings) => this.onChosen(keyBindings)} settings={this.props.settings} />
                <div className="accept-row">
                    {!this.props.wheelOnRight && <div className="spacer" />}
                    {isMobile && <div className="btn" onClick={() => this.close()}>OK</div>}
                    {this.props.wheelOnRight && <div className="spacer" />}
                </div>
            </div>
        </div>
    }

    private onChosen(keyBindings: KeyBindings) {
        sendKeyBindings(this.props.gameId, this.props.heroId, keyBindings);
        if (!isMobile) {
            this.close();
        }
    }

    private close() {
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { customizingBtn: null },
        });
    }
}

export default ReactRedux.connect(stateToProps)(GameKeyCustomizer);