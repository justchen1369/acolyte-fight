import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as keyboardUtils from '../core/keyboardUtils';
import * as spellUtils from '../core/spellUtils';
import * as StoreProvider from '../storeProvider';

import Button from '../controls/button';

import { isMobile } from '../core/userAgent';
import { sendKeyBindings } from '../core/ticker';

interface Props {
    gameId: string;
    heroId: string;
    allowSpellChoosing: boolean;
    config: KeyBindings;
    settings: AcolyteFightSettings;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        gameId: state.world.ui.myGameId,
        heroId: state.world.ui.myHeroId,
        allowSpellChoosing: engine.allowSpellChoosing(state.world, state.world.ui.myHeroId),
        config: state.keyBindings,
        settings: state.world.settings,
    };
}

class RandomizePanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (!this.props.allowSpellChoosing) {
            return null;
        }

        return <div className="randomize-panel">
            <Button
                className="randomize-btn"
                onClick={(ev) => this.onRandomizeClick(ev)}
                onMouseEnter={() => this.onMouseEnter()}
                onMouseLeave={() => this.onMouseLeave()}
                >
                <i className="fas fa-dice" />{isMobile && " Randomize a Spell"}
            </Button>
        </div>
    }

    private onRandomizeClick(ev: React.MouseEvent) {
        const config = { ...this.props.config };

        const btns = ev.shiftKey ? keyboardUtils.allKeys(this.props.settings) : [keyboardUtils.randomizeBtn(this.props.settings)];
        btns.forEach(btn => {
            config[btn] = keyboardUtils.randomizeSpellId(btn, this.props.config, this.props.settings);
        });

        keyboardUtils.updateKeyBindings(config);

        sendKeyBindings(this.props.gameId, this.props.heroId, config);
    }

    private onMouseEnter() {
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { hoverRandomizer: true },
        });
    }
    private onMouseLeave() {
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { hoverRandomizer: false },
        });
    }
}

export default ReactRedux.connect(stateToProps)(RandomizePanel);