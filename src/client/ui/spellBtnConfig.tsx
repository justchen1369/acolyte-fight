import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../core/cloud';
import * as s from '../store.model';
import { SpellIcon } from './spellIcon';
import * as keyboardUtils from '../core/keyboardUtils';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import * as spellUtils from '../core/spellUtils';
import { isMobile } from '../core/userAgent';

import KeyControl from './keyControl';
import SpellStats from './spellStats';

interface OwnProps {
    btn: string;
}
interface Props extends OwnProps {
    config: KeyBindings;
    settings: AcolyteFightSettings;
}

interface State {
    saved: boolean;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        config: state.keyBindings,
        settings: state.room.settings,
    };
}

class SpellKeyConfig extends React.Component<Props, State> {
    private uploadStateDebounced = _.debounce(() => this.uploadState(), 500);


    constructor(props: Props) {
        super(props);
        this.state = {
            saved: false,
        };
    }

    render() {
        const key = this.props.btn;
        const Choices = this.props.settings.Choices;
        const Spells = this.props.settings.Spells;

        const options = Choices.Options[key];
        const chosen = spellUtils.resolveSpellForKey(key, this.props.config, this.props.settings);

        const name = spellUtils.spellName(chosen);
        const isRightClick = keyboardUtils.isSpecialKey(key);
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
                    {this.state.saved && <div className="key-saved">Saved. Your {isMobile ? "" : `${isRightClick ? "right-click" : key.toUpperCase()} `}spell will be {name} in your next game.</div>}
                </div>
                <SpellStats spellId={chosen.id} />
            </div>
            {!isMobile && <KeyControl initialKey={key} />}
        </div>;
    }
    
    private onChoose(key: string, spellId: string) {
        const config = { ...this.props.config };

        config[key] = spellId;

        StoreProvider.dispatch({ type: "updateKeyBindings", keyBindings: config });
        Storage.saveKeyBindingConfig(config);
        this.uploadStateDebounced();

        this.setState({ saved: true });
    }

    private uploadState() {
        cloud.uploadSettings();
    }
}

export default ReactRedux.connect(stateToProps)(SpellKeyConfig);