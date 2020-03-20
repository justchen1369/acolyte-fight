import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import * as engine from '../../../game/engine';
import * as keyboardUtils from '../../core/keyboardUtils';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';
import LoadoutNumber from '../../controls/loadoutNumber';

import { sendKeyBindingsXX } from '../../core/ticker';

interface Props {
    gameId: string;
    heroId: string;
    allowSpellChoosing: boolean;
    config: KeyBindings;
    loadouts: m.Loadout[];
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
        loadouts: state.loadouts,
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

        const buttons = new Array<React.ReactNode>();

        buttons.push(<ButtonRow key="random" label="Randomize Spells" icon="fas fa-dice" onClick={() => this.onRandomizeClick(true)} />);

        for (let i = 0; i < this.props.loadouts.length; ++i) {
            const loadout = this.props.loadouts[i];
            if (loadout) {
                const slot = i + 1;
                buttons.push(<ButtonRow key={slot} label={`Loadout #${slot}`} icon="" onClick={() => this.onLoadoutClick(loadout)}>
                    <LoadoutNumber>{slot}</LoadoutNumber>
                </ButtonRow>);
            }
        }

        return buttons;
    }

    private onRandomizeClick(all: boolean = false) {
        const config = { ...this.props.config };

        const btns = all ? keyboardUtils.allKeys(this.props.settings) : [keyboardUtils.randomizeBtn(this.props.settings)];
        btns.forEach(btn => {
            config[btn] = keyboardUtils.randomizeSpellId(btn, this.props.config, this.props.settings);
        });

        this.loadKeyBindings(config);
    }

    private onLoadoutClick(loadout: m.Loadout) {
        if (loadout && loadout.buttons) {
            this.loadKeyBindings(loadout.buttons);
        }
        StoreProvider.dispatch({ type: "customizing", customizing: false }); // if on mobile, choosing a loadout exits spell choosing mode
    }

    private loadKeyBindings(config: KeyBindings) {
        keyboardUtils.updateKeyBindings(config);
        sendKeyBindingsXX(this.props.gameId, this.props.heroId, config);
    }
}

export default ReactRedux.connect(stateToProps)(RandomizePanel);