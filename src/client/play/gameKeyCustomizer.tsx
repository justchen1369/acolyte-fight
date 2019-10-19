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

import { sendKeyBindings } from '../core/ticker';

interface Props {
    btn: string;
    gameId: string;
    heroId: string;
    gameStarted: boolean;
    wheelOnRight: boolean;
    config: KeyBindings;
    rebindingLookup: Map<string, string>;
    settings: AcolyteFightSettings;
    touched: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const rebindings = state.rebindings;
    const settings = state.world.settings;
    return {
        btn: state.world.ui.toolbar.customizingBtn,
        gameId: state.world.ui.myGameId,
        heroId: state.world.ui.myHeroId,
        gameStarted: state.world.tick >= state.world.startTick,
        wheelOnRight: state.options.wheelOnRight,
        config: state.keyBindings,
        rebindingLookup: keyboardUtils.getRebindingLookup({ rebindings, settings }),
        touched: state.touched,
        settings,
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
        } else {
            return null;
        }
    }

    private renderCustomizeBtn(btn: string) {
        return <div className="spell-config-container"
            onTouchStart={(ev) => ev.stopPropagation()}
            onMouseDown={(ev) => ev.stopPropagation()}
            onClick={() => this.close()} onContextMenu={ev => ev.preventDefault()}>
            <div className="spell-config">
                {this.props.gameStarted && <div className="in-progress-warning">Game in progress - change will apply to the next game</div>}
                <SpellBtnConfig btn={btn} onChosen={(keyBindings, random) => this.onChosen(keyBindings, random)} settings={this.props.settings} />
                <div className="accept-row">
                    {!this.props.wheelOnRight && <div className="spacer" />}
                    {this.props.touched && <Button onClick={() => this.close()}>OK</Button>}
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