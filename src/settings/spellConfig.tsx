import * as React from 'react';
import * as c from '../game/constants.model';
import { ButtonBar, Choices, Spells } from '../game/constants';
import { SpellIcon } from './spellIcon';
import * as Storage from '../game/storage';

interface Props {
}

interface State {
    config: c.KeyBindings;
}

export class SpellConfig extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            config: Storage.loadKeyBindingConfig() || Choices.Defaults,
        };
    }

    render() {
        return <div className="spell-config">
            <h1>Spell Configuration</h1>
            {ButtonBar.Keys.map(key => this.renderKey(key))}
        </div>;
    }

    private renderKey(key: string) {
        if (!key) {
            return null;
        }

        const options = Choices.Options[key];
        const chosen = this.state.config[key];
        const chosenSpell = Spells.all[chosen];
        return <div className="key">
            <div className="key-options">
                {options.map(spellId =>
                    <SpellIcon
                        className={spellId === chosen ? "spell-icon-chosen" : "spell-icon-not-chosen"}
                        spellId={spellId}
                        title={this.capitalize(spellId)}
                        onClick={() => this.onChoose(key, spellId)} />)}
            </div>
            <div className="key-detail">
                <div className="spell-name">{chosenSpell.id}</div>
                <div className="description">{chosenSpell.description}</div>
            </div>
            <div className="key-name-container">
                <div className="key-name">{key}</div>
            </div>
        </div>;
    }
    
    private onChoose(key: string, spellId: string) {
        let config = Object.assign({}, this.state.config, {
            [key]: spellId,
        });
        this.setState({ config });
        Storage.saveKeyBindingConfig(config);
    }

    private capitalize(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}