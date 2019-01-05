import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../core/cloud';
import * as s from '../store.model';
import { SpellIcon } from '../controls/spellIcon';
import * as keyboardUtils from '../core/keyboardUtils';
import * as icons from '../core/icons';
import * as parties from '../core/parties';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import * as spellUtils from '../core/spellUtils';
import { isMobile } from '../core/userAgent';

import KeyControl from './keyControl';
import SpellStats from './spellStats';

interface OwnProps {
    btn: string;
    settings: AcolyteFightSettings;
    rebinding?: boolean;
    onChosen?: (keyBindings: KeyBindings) => void;
}
interface Props extends OwnProps {
    config: KeyBindings;
}

interface State {
    hovering: string;
    saved: boolean;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        config: state.keyBindings,
    };
}

const uploadSettingsDebounced = _.debounce(() => uploadSettings(), 500);

function uploadSettings() {
    parties.updatePartyAsync();
    cloud.uploadSettings();
}

class SpellKeyConfig extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            saved: false,
            hovering: null,
        };
    }

    render() {
        const key = this.props.btn;
        const Choices = this.props.settings.Choices;
        const Spells = this.props.settings.Spells;

        const options = Choices.Options[key];
        const chosen = spellUtils.resolveSpellForKey(key, this.props.config, this.props.settings);
        const hovering = Spells[this.state.hovering];

        const isRightClick = keyboardUtils.isSpecialKey(key);
        return <div className="key" onClick={ev => ev.stopPropagation()}>
            <div className="key-options">
                {options.map(spellId => Spells[spellId]).map(spell =>
                    <SpellIcon
                        key={spell.id}
                        icon={icons.getIcon(spell.icon, this.props.settings.Icons)}
                        color={spell.color}
                        size={48}
                        attr={{
                            className: spell.id === chosen.id ? "spell-icon-chosen" : "spell-icon-not-chosen",
                            title: spellUtils.spellName(spell),
                            onMouseDown: () => this.onChoose(key, spell.id),
                            onTouchStart: () => this.onChoose(key, spell.id),
                            onMouseEnter: () => this.onMouseHoverSpell(spell.id),
                            onMouseLeave: () => this.onMouseLeaveSpell(),
                        }}
                        hoverWash={spell.id !== chosen.id} />)}
            </div>
            <div className="key-detail-container">
                <div className="key-detail">
                    <div className="spell-name">{spellUtils.spellName(hovering ? hovering : chosen)}</div>
                    <div className="description">{hovering ? hovering.description : chosen.description}</div>
                    {this.state.saved && <div className="key-saved">Saved. Your {isMobile ? "" : `${isRightClick ? "right-click" : key.toUpperCase()} `}spell is now {spellUtils.spellName(chosen)}.</div>}
                </div>
                <SpellStats spellId={hovering ? hovering.id : chosen.id} settings={this.props.settings} />
            </div>
            {!isMobile && this.props.rebinding && <KeyControl initialKey={key} />}
        </div>;
    }

    private onMouseHoverSpell(hovering: string) {
        this.setState({ hovering });
    }

    private onMouseLeaveSpell() {
        this.setState({ hovering: null });
    }
    
    private onChoose(key: string, spellId: string) {
        const config = { ...this.props.config };

        config[key] = spellId;

        StoreProvider.dispatch({ type: "updateKeyBindings", keyBindings: config });
        Storage.saveKeyBindingConfig(config);
        uploadSettingsDebounced();

        this.setState({ saved: true, hovering: null });

        if (this.props.onChosen) {
            this.props.onChosen(config);
        }
    }
}

export default ReactRedux.connect(stateToProps)(SpellKeyConfig);