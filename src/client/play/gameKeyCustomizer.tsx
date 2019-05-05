import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as keyboardUtils from '../core/keyboardUtils';
import * as spellUtils from '../core/spellUtils';
import * as StoreProvider from '../storeProvider';

import Button from '../controls/button';
import SpellBtnConfig from './spellBtnConfig';

import { isMobile } from '../core/userAgent';
import { sendKeyBindings } from '../core/ticker';

interface Props {
    btn: string;
    gameId: string;
    heroId: string;
    allowSpellChoosing: boolean;
    gameStarted: boolean;
    toolbar: w.ToolbarState;
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
        gameStarted: state.world.tick >= state.world.startTick,
        allowSpellChoosing: engine.allowSpellChoosing(state.world, state.world.ui.myHeroId),
        toolbar: state.world.ui.toolbar,
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
            if (isMobile && this.props.toolbar.hoverBtn && this.props.toolbar.hoverSpellId) {
                return this.renderMobileHint(this.props.toolbar.hoverBtn, this.props.toolbar.hoverSpellId);
            } else if (!isMobile && this.props.toolbar.hoverBtn) {
                return this.renderDesktopHint();
            } else {
                return this.renderChangeSpellHint();
            }
        } else {
            return null;
        }
    }

    private renderChangeSpellHint() {
        if (!this.props.allowSpellChoosing) {
            return null;
        }

        if (isMobile) {
            return null;
        } else {
            return <div className="customize-hint-container">
                <div className="customize-hint">{this.props.toolbar.hoverControl || "Right-click a button below to change spells"}</div>
            </div>
        }
    }

    private renderMobileHint(hoverBtn: string, hoverSpellId: string) {
        if (!this.props.allowSpellChoosing) {
            return null;
        }

        const spell = this.props.settings.Spells[hoverSpellId];
        if (!spell) {
            return null;
        }

        return <div className="customize-hint-container">
            <div className="customize-hint"><span className="spell-name">{spellUtils.spellName(spell)}</span> - long press to change</div>
        </div>;
    }

    private renderDesktopHint() {
        return <div className="customize-hint-container">
            <div className="customize-hint">Right-click to change</div>
        </div>;
    }

    private renderCustomizeBtn(btn: string) {
        return <div className="spell-config-container"
            onTouchStart={(ev) => ev.stopPropagation()}
            onTouchMove={(ev) => ev.stopPropagation()}
            onMouseDown={(ev) => ev.stopPropagation()}
            onMouseMove={(ev) => ev.stopPropagation()}
            onClick={() => this.close()} onContextMenu={ev => ev.preventDefault()}>
            <div className="spell-config">
                {this.props.gameStarted && <div className="in-progress-warning">Game in progress - change will apply to the next game</div>}
                <SpellBtnConfig btn={btn} onChosen={(keyBindings, random) => this.onChosen(keyBindings, random)} settings={this.props.settings} />
                <div className="accept-row">
                    {!this.props.wheelOnRight && <div className="spacer" />}
                    {isMobile && <Button onClick={() => this.close()}>OK</Button>}
                    {this.props.wheelOnRight && <div className="spacer" />}
                </div>
            </div>
        </div>
    }

    private onChosen(keyBindings: KeyBindings, random?: boolean) {
        sendKeyBindings(this.props.gameId, this.props.heroId, keyBindings);
        this.close();
    }

    private close() {
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { customizingBtn: null, hoverControl: null, hoverSpellId: null, hoverBtn: null },
        });
    }
}

export default ReactRedux.connect(stateToProps)(GameKeyCustomizer);