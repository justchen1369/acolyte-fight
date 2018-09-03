import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import { DefaultSettings } from '../../game/settings';
import { SpellIcon } from './spellIcon';
import * as keyboardUtils from '../core/keyboardUtils';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import * as spellUtils from '../core/spellUtils';
import { isMobile } from '../core/userAgent';

import KeyControl from './keyControl';
import SpellStats from './spellStats';

interface Props {
    config: KeyBindings;
    settings: AcolyteFightSettings;
}

interface State {
    saved: Set<string>;
}

function stateToProps(state: s.State): Props {
    return {
        config: state.keyBindings,
        settings: state.room.settings,
    };
}

class SpellConfig extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            saved: new Set<string>(),
        };
    }

    render() {
        return <div className="spell-config">
            {Object.keys(this.props.settings.Choices.Options).map(key => this.renderKey(key))}
        </div>;
    }

    private renderKey(key: string) {
        const Choices = this.props.settings.Choices;
        const Spells = this.props.settings.Spells;

        const options = Choices.Options[key];
        let chosenId = this.props.config[key];
		if (!(options.indexOf(chosenId) >= 0)) {
			chosenId = Choices.Defaults[key];
		}
        const chosen = Spells[chosenId];

        const name = spellUtils.spellName(chosen);
        const isRightClick = keyboardUtils.isRightClick(key);
        return <div className="key">
            <div className="key-options">
                {options.map(spellId => Spells[spellId]).map(spell =>
                    <SpellIcon
                        className={spell.id === chosen.id ? "spell-icon-chosen" : "spell-icon-not-chosen"}
                        icon={spell.icon}
                        color={spell.color}
                        title={spellUtils.spellName(spell)}
                        onClick={() => this.onChoose(key, spell.id)}
                        size={48}
                        hoverWash={spell.id !== chosen.id} />)}
            </div>
            <div className="key-detail-container">
                <div className="key-detail">
                    <div className="spell-name">{name}</div>
                    <div className="description">{chosen.description}</div>
                    {this.state.saved.has(key) && <div className="key-saved">Saved. Your {isMobile ? "" : `${isRightClick ? "right-click" : key.toUpperCase()} `}spell will be {name} in your next game.</div>}
                </div>
                <SpellStats spellId={chosenId} />
            </div>
            {!isMobile && <KeyControl initialKey={key} />}
        </div>;
    }
    
    private onChoose(key: string, spellId: string) {
        const config = this.props.config;
        const saved = this.state.saved;

        config[key] = spellId;
        saved.add(key);

        StoreProvider.dispatch({ type: "updateKeyBindings", keyBindings: config });
        Storage.saveKeyBindingConfig(config);

        this.setState({ saved });
    }

    private capitalize(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

export default ReactRedux.connect(stateToProps)(SpellConfig);