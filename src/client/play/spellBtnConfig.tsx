import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import { Motion, spring, SpringHelperConfig } from 'react-motion';
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

const springConfig: SpringHelperConfig = {
    stiffness: 300,
    damping: 30,
};

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
        const btn = this.props.btn;
        const Choices = this.props.settings.Choices;
        const Spells = this.props.settings.Spells;

        const options = Choices.Options[btn];
        const chosen = spellUtils.resolveSpellForKey(btn, this.props.config, this.props.settings);
        const hovering = Spells[this.state.hovering];

        const isRightClick = keyboardUtils.isSpecialKey(btn);
        return <div className="key" onClick={ev => ev.stopPropagation()}>
            <div className="key-options">
                {options.map((row, index) => this.renderOptionsRow(index, row, chosen.id))}
            </div>
            <div className="key-detail-container">
                <div className="key-detail">
                    <div className="spell-name">{spellUtils.spellName(hovering ? hovering : chosen)}</div>
                    <div className="description">{hovering ? hovering.description : chosen.description}</div>
                    {this.state.saved && <div className="key-saved">Saved. Your {isMobile ? "" : `${isRightClick ? "right-click" : btn.toUpperCase()} `}spell is now {spellUtils.spellName(chosen)}.</div>}
                </div>
                <SpellStats spellId={hovering ? hovering.id : chosen.id} settings={this.props.settings} />
            </div>
            {!isMobile && this.props.rebinding && <KeyControl initialKey={btn} />}
        </div>;
    }

    private renderOptionsRow(rowIndex: number, row: string[], chosenId: string) {
        const spells = row.map(spellId => this.props.settings.Spells[spellId]);

        let chosenIndex = row.indexOf(chosenId);
        if (chosenIndex === -1) {
            chosenIndex = 0;
        }

        return <div key={rowIndex} className="key-options-row">
            {spells.map((spell, index) => this.renderSpellIcon(spell, chosenId, index - chosenIndex))}
        </div>
    }

    private renderSpellIcon(spell: Spell, chosenId: string, index: number) {
        const MaxSize = 48;
        const SmallSize = 48;
        const Margin = 4;

        let left = index * (Margin + SmallSize);
        let size = index === 0 ? MaxSize : SmallSize;
        if (index > 0) {
            left += MaxSize - SmallSize; // shift past the primary selection
        }
        let top = (MaxSize - size) / 2;

        const btn = this.props.btn;
        const chosen = spell.id === chosenId;
        const hovering = this.state.hovering === spell.id;
        const className = classNames({
            "spell-icon-chosen": chosen,
            "spell-icon-not-chosen": !chosen,
            "spell-icon-secondary": index !== 0 && !hovering,
        });

        let color: string;
        if (chosenId === spell.id || this.state.hovering === spell.id) {
            color = spell.color;
        } else if (index === 0) {
            color = "#888";
        } else {
            color = "#444";
        }

        return <Motion key={spell.id} style={{size: spring(size, springConfig), left: spring(left, springConfig), top: spring(top, springConfig)}}>
            {style => <SpellIcon
                key={spell.id}
                icon={icons.getIcon(spell.icon, this.props.settings.Icons)}
                color={color}
                size={style.size}
                attr={{
                    className,
                    title: spellUtils.spellName(spell),
                    onMouseDown: () => this.onChoose(btn, spell.id),
                    onTouchStart: () => this.onChoose(btn, spell.id),
                    onMouseEnter: () => this.onMouseHoverSpell(spell.id),
                    onMouseLeave: () => this.onMouseLeaveSpell(),
                }}
                style={style}
                />}
        </Motion>
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