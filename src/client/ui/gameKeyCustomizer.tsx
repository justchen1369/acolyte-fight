import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as keyboardUtils from '../core/keyboardUtils';
import * as spellUtils from '../core/spellUtils';
import * as StoreProvider from '../storeProvider';

import SpellBtnConfig from './spellBtnConfig';

import { isMobile } from '../core/userAgent';
import { sendKeyBindings } from '../core/sockets';

interface Props {
    btn: string;
    gameId: string;
    heroId: string;
    allowSpellChoosing: boolean;
    hoverBtn: string;
    hoverSpellId: string;
    wheelOnRight: boolean;
    config: KeyBindings;
    settings: AcolyteFightSettings;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        btn: state.world.ui.customizingBtn,
        gameId: state.world.ui.myGameId,
        heroId: state.world.ui.myHeroId,
        allowSpellChoosing: engine.allowSpellChoosing(state.world, state.world.ui.myHeroId),
        hoverBtn: state.world.ui.hoverBtn,
        hoverSpellId: state.world.ui.hoverSpellId,
        wheelOnRight: state.options.wheelOnRight,
        config: state.keyBindings,
        settings: state.room.settings,
    };
}

class GameKeyCustomizer extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (!this.props.allowSpellChoosing) {
            return null;
        }

        const btn = this.props.btn;
        if (btn && !keyboardUtils.isSpecialKey(btn)) {
            return this.renderCustomizeBtn(btn);
        } else if (isMobile && this.props.hoverBtn && this.props.hoverSpellId) {
            return this.renderMobileHint(this.props.hoverBtn, this.props.hoverSpellId);
        } else if (!isMobile && this.props.hoverBtn) {
            return this.renderDesktopHint();
        } else {
            return null;
        }
    }

    private renderMobileHint(hoverBtn: string, hoverSpellId: string) {
        const spell = this.props.settings.Spells[hoverSpellId];
        if (!spell) {
            return null;
        }

        return <div className="customize-hint">
            <span className="spell-name">{spellUtils.spellName(spell)}</span> - long press to change
        </div>;
    }

    private renderDesktopHint() {
        return <div className="customize-hint">Right-click to change</div>;
    }

    private renderCustomizeBtn(btn: string) {
        return <div className="spell-config-container" onClick={() => this.close()} onContextMenu={ev => ev.preventDefault()}>
            <div className="spell-config">
                <SpellBtnConfig btn={btn} onChosen={(keyBindings) => this.onChosen(keyBindings)} />
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
        StoreProvider.dispatch({ type: "customizeBtn", customizingBtn: null });
    }
}

export default ReactRedux.connect(stateToProps)(GameKeyCustomizer);