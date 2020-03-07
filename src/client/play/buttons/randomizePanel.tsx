import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import * as engine from '../../../game/engine';
import * as keyboardUtils from '../../core/keyboardUtils';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

import { sendKeyBindingsXX } from '../../core/ticker';

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

        return <ButtonRow label="Randomize Spells" icon="fas fa-dice" onClick={() => this.onRandomizeClick(true)} />
    }

    private onRandomizeClick(all: boolean = false) {
        const config = { ...this.props.config };

        const btns = all ? keyboardUtils.allKeys(this.props.settings) : [keyboardUtils.randomizeBtn(this.props.settings)];
        btns.forEach(btn => {
            config[btn] = keyboardUtils.randomizeSpellId(btn, this.props.config, this.props.settings);
        });

        keyboardUtils.updateKeyBindings(config);

        sendKeyBindingsXX(this.props.gameId, this.props.heroId, config);
    }
}

export default ReactRedux.connect(stateToProps)(RandomizePanel);