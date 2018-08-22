import * as React from 'react';
import * as c from '../game/world.model';
import { Settings } from '../game/settings';
import { SpellIcon } from './spellIcon';
import * as Storage from '../client/storage';
import { isMobile } from './userAgent';

interface Props {
}

interface State {
    config: KeyBindings;
    saved: Set<string>;
}

export class SpellConfig extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            config: Storage.loadKeyBindingConfig() || Settings.Choices.Defaults,
            saved: new Set<string>(),
        };
    }

    render() {
        return <div className="spell-config">
            <h1>Your Spell Configuration</h1>
            {Settings.Choices.Keys.map(key => this.renderKey(key))}
        </div>;
    }

    private renderKey(key: string) {
        if (!key) {
            return null;
        }

        const Choices = Settings.Choices;
        const Spells = Settings.Spells;

        const options = Choices.Options[key];
        let chosenId = this.state.config[key];
		if (!(options.indexOf(chosenId) >= 0)) {
			chosenId = Choices.Defaults[key];
		}
        const chosen = Spells[chosenId];

        const name = chosen.name || chosen.id;
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
                {this.state.saved.has(key) && <div className="key-saved">Your {key.toUpperCase()} spell is now {this.capitalize(name)}.</div>}
            </div>
            {!isMobile && <div className="key-name-container">
                <div className="key-name">{key}</div>
            </div>}
        </div>;
    }
    
    private onChoose(key: string, spellId: string) {
        const config = this.state.config;
        const saved = this.state.saved;

        config[key] = spellId;
        saved.add(key);

        this.setState({ config, saved });
        Storage.saveKeyBindingConfig(config);
    }

    private capitalize(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}