import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import * as engine from '../../../game/engine';
import * as keyboardUtils from '../../core/keyboardUtils';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

import { sendKeyBindings } from '../../core/ticker';

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

        return <>
            <ButtonRow label="Choose Spells" icon="fas fa-wand-magic" onClick={() => this.onCustomizeClick(true)} />
            <ButtonRow label="Randomize Spells" icon="fas fa-dice" onClick={() => this.onRandomizeClick(true)} />
        </>
    }

    private onCustomizeClick(mute: boolean) {
        StoreProvider.dispatch({
            type: "customizing",
            customizing: true,
        });

        // Clear hover - when in customize mode all the buttons disappear and a mouse out event never fires so have to clear it manually here
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { hoverControl: null },
        });
    }

    private onRandomizeClick(all: boolean = false) {
        const config = { ...this.props.config };

        const btns = all ? keyboardUtils.allKeys(this.props.settings) : [keyboardUtils.randomizeBtn(this.props.settings)];
        btns.forEach(btn => {
            config[btn] = keyboardUtils.randomizeSpellId(btn, this.props.config, this.props.settings);
        });

        keyboardUtils.updateKeyBindings(config);

        sendKeyBindings(this.props.gameId, this.props.heroId, config);
    }
}

export default ReactRedux.connect(stateToProps)(RandomizePanel);