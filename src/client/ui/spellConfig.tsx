import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import { DefaultSettings } from '../../game/settings';
import { SpellIcon } from './spellIcon';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import { isMobile } from '../core/userAgent';

interface Props {
    settings: AcolyteFightSettings;
}

interface State {
    config: KeyBindings;
    saved: Set<string>;
}

function stateToProps(state: s.State): Props {
    return {
        settings: state.room.settings,
    };
}

class SpellConfig extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            config: Storage.loadKeyBindingConfig() || DefaultSettings.Choices.Defaults,
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
        let chosenId = this.state.config[key];
		if (!(options.indexOf(chosenId) >= 0)) {
			chosenId = Choices.Defaults[key];
		}
        const chosen = Spells[chosenId];

        const name = chosen.name || chosen.id;
        const isRightClick = key.length > 1;
        return <div className="key">
            <div className="key-options">
                {options.map(spellId => Spells[spellId]).map(spell =>
                    <SpellIcon
                        className={spell.id === chosen.id ? "spell-icon-chosen" : "spell-icon-not-chosen"}
                        icon={spell.icon}
                        color={spell.color}
                        title={spell.name || this.capitalize(spell.id)}
                        onClick={() => this.onChoose(key, spell.id)}
                        size={48} />)}
            </div>
            <div className="key-detail">
                <div className="spell-name">{name}</div>
                <div className="description">{chosen.description}</div>
                {this.state.saved.has(key) && <div className="key-saved">Saved. Your {isMobile ? "" : `${isRightClick ? "right-click" : key.toUpperCase()} `}spell will be {this.capitalize(name)} in your next game.</div>}
            </div>
            {!isMobile && <div className="key-name-container">
                <div className="key-name">{isRightClick ? <i className="fa fa-mouse-pointer" title="Right click" /> : key}</div>
            </div>}
        </div>;
    }
    
    private onChoose(key: string, spellId: string) {
        const config = this.state.config;
        const saved = this.state.saved;

        config[key] = spellId;
        saved.add(key);

        StoreProvider.dispatch({ type: "updateKeyBindings", keyBindings: config });
        Storage.saveKeyBindingConfig(config);

        this.setState({ config, saved });
    }

    private capitalize(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

export default ReactRedux.connect(stateToProps)(SpellConfig);