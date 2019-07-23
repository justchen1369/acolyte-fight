import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import { Motion, spring, SpringHelperConfig } from 'react-motion';
import * as s from '../store.model';
import { SpellIcon } from '../controls/spellIcon';
import * as keyboardUtils from '../core/keyboardUtils';
import * as icons from '../core/icons';
import * as spellUtils from '../core/spellUtils';
import { isMobile } from '../core/userAgent';

import Button from '../controls/button';
import KeyControl from './keyControl';
import SpellStats from './spellStats';

interface OwnProps {
    btn: string;
    settings: AcolyteFightSettings;
    rebinding?: boolean;
    onChosen?: (keyBindings: KeyBindings, random?: boolean) => void;
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

class SpellKeyConfig extends React.PureComponent<Props, State> {
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

        const displaying = hovering || chosen;

        return <div className="key"
            onTouchStart={ev => ev.stopPropagation()}
            onMouseDown={ev => ev.stopPropagation()}
            onClick={ev => ev.stopPropagation()}>

            <div className="key-options">
                {options.map((row, index) => this.renderOptionsRow(index, row, chosen.id))}
            </div>
            <div className="key-detail-container">
                <div className="key-detail">
                    <div className="spell-name">{spellUtils.spellName(displaying)}</div>
                    <div className="spell-description">{displaying.description}</div>
                    {this.renderEffects(displaying.effects)}
                </div>
                <SpellStats spellId={hovering ? hovering.id : chosen.id} settings={this.props.settings} />
                <Button className="clickable randomize-btn" onClick={() => this.onRandomizeClick()}><i className="fas fa-dice" /> Randomize</Button>
            </div>
            {!isMobile && this.props.rebinding && <KeyControl initialKey={btn} />}
        </div>;
    }

    private renderEffects(effects: EffectInfo[]) {
        if (!effects) {
            return null;
        }

        return effects.map(effect => <div className="spell-effect" key={effect.title}><i className={effect.icon} /> <b>{effect.title}:</b> {effect.text}</div>);
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
        const SmallSize = 32;
        const Margin = 4;

        let left = index * (Margin + SmallSize);
        let size = index === 0 ? MaxSize : SmallSize;
        if (index > 0) {
            left += MaxSize - SmallSize; // shift past the primary selection
        }

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

        return <Motion key={spell.id} style={{size: spring(size, springConfig), left: spring(left, springConfig)}}>
            {style => <SpellIcon
                key={spell.id}
                icon={icons.getIcon(spell.icon, this.props.settings.Icons)}
                color={color}
                size={style.size}
                height={MaxSize}
                attr={{
                    className,
                    title: spellUtils.spellName(spell),
                    onMouseDown: () => this.onChoose(spell.id),
                    onTouchStart: () => this.onChoose(spell.id),
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
    
    private onChoose(spellId: string) {
        const config = { ...this.props.config };

        config[this.props.btn] = spellId;

        keyboardUtils.updateKeyBindings(config);

        this.setState({ saved: true, hovering: null });

        if (this.props.onChosen) {
            this.props.onChosen(config);
        }
    }

    private onRandomizeClick() {
        const newSpellId = keyboardUtils.randomizeSpellId(this.props.btn, this.props.config, this.props.settings);
        this.onChoose(newSpellId);
    }
}

export default ReactRedux.connect(stateToProps)(SpellKeyConfig);