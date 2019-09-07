import _ from 'lodash';
import * as Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as arrayUtils from '../../utils/arrayUtils';
import * as engine from '../../game/engine';
import * as keyboardUtils from '../core/keyboardUtils';
import * as icons from '../core/icons';
import * as spellUtils from '../core/spellUtils';
import * as StoreProvider from '../storeProvider';
import * as ticker from '../core/ticker';

import { isMobile } from '../core/userAgent';
import SpellIcon from '../controls/spellIcon';

interface Props {
    myGameId: string;
    correlationId: number;
    myHeroId: string;
    isFinished: boolean;
    customizingBtn: string;
    customizingMode: boolean;
    allowSpellChoosing: boolean;
    noRightClickChangeSpells: boolean;
    toolbar: w.ToolbarState;
    keyBindings: KeyBindings;
    settings: AcolyteFightSettings;
    teams: Immutable.Map<string, w.Team>;
}
interface State {
    alternativeGameId: string;
    alternativeKey: string;
    alternativeId: string;
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    const myHeroId = world.ui.myHeroId;
    return {
        myGameId: world.ui.myGameId,
        correlationId: world.ui.correlationId,
        myHeroId,
        isFinished: !!world.winner || engine.isDead(myHeroId, world),
        customizingBtn: state.world.ui.toolbar.customizingBtn,
        customizingMode: state.customizing,
        allowSpellChoosing: engine.allowSpellChoosing(state.world, state.world.ui.myHeroId),
        noRightClickChangeSpells: state.options.noRightClickChangeSpells,
        toolbar: state.world.ui.toolbar,
        keyBindings: state.keyBindings,
        settings: state.world.settings,
        teams: state.world.teams,
    };
}

const resolveKeys = Reselect.createSelector(
    (props: Props) => props.keyBindings,
    (props: Props) => props.settings,
    (keyBindings, settings) => engine.resolveKeyBindings(keyBindings, settings)
);

class HintPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            alternativeGameId: null,
            alternativeKey: null,
            alternativeId: null,
        };
    }

    componentDidMount() {
        if (!(this.state.alternativeKey && this.state.alternativeId)) {
            this.chooseRandomSpell();
        }
    }

    componentDidUpdate() {
        if (this.isAlternativeInvalid()) {
            this.chooseRandomSpell();
        }
    }

    private isAlternativeInvalid() {
        if (!(this.state.alternativeKey && this.state.alternativeId && this.state.alternativeGameId === this.props.myGameId)) {
            return true;
        }

        const resolved = resolveKeys(this.props);
        if (resolved.keysToSpells.get(this.state.alternativeKey) === this.state.alternativeId) {
            return true;
        }

        return false;
    }

    private chooseRandomSpell() {
        const allOptions = this.props.settings.Choices.Options;
        const spellKey = arrayUtils.random(Object.keys(allOptions));

        const resolved = resolveKeys(this.props);
        const chosenId = resolved.keysToSpells.get(spellKey);

        const options = _.flatten(allOptions[spellKey]).filter(x => x !== chosenId);
        const alternativeId = arrayUtils.random(options);

        this.setState({
            alternativeGameId: this.props.myGameId,
            alternativeKey: spellKey,
            alternativeId,
        });
    }

    render() {
        if (this.props.toolbar.hoverControl) {
            return <div className="customize-hint-container">
                <div className="customize-hint">{this.props.toolbar.hoverControl}</div>
            </div>
        } else if (this.props.customizingBtn) {
            return null;
        } else if (this.props.customizingMode) {
            return this.renderCustomizingMode();
        } else if (this.props.allowSpellChoosing) {
            if (isMobile) {
                if (this.props.toolbar.hoverBtn && this.props.toolbar.hoverSpellId) {
                    return this.renderMobileHint(this.props.toolbar.hoverBtn, this.props.toolbar.hoverSpellId);
                } else {
                    return null;
                }
            } else {
                if (this.props.toolbar.hoverBtn) {
                    return this.renderDesktopHint();
                } else if (this.props.myHeroId && this.props.isFinished) {
                    return this.renderAlternativeHint();
                } else {
                    return this.renderChangeSpellHint();
                }
            }
        } else if (this.props.teams) {
            return this.renderTeamHint();
        } else {
            return null;
        }
    }
    
    private renderCustomizingMode() {
        if (isMobile) {
            return <div className="customize-hint-container">
                <div className="customize-hint">Tap a spell button to change</div>
            </div>
        } else {
            return <div className="customize-hint-container">
                <div className="customize-hint">Click a button below to change</div>
            </div>
        }
    }

    private renderAlternativeHint() {
        const spellKey = this.state.alternativeKey;
        const alternativeId = this.state.alternativeId;
        if (!(spellKey && alternativeId)) {
            return null;
        }

        const Spells = this.props.settings.Spells;
        const resolved = resolveKeys(this.props);
        const chosenId = resolved.keysToSpells.get(spellKey);

        const chosen = Spells[chosenId];
        const alternative = Spells[alternativeId];
        return <div className="customize-hint-container">
            <div className="customize-hint customize-option">Change {this.renderSpell(spellKey, chosen)} to {this.renderSpell(spellKey, alternative)}?</div>
        </div>;
    }

    private renderSpell(spellKey: string, spell: Spell) {
        return <SpellIcon 
            icon={icons.getIcon(spell.icon, this.props.settings.Icons)}
            hoverHighlight={true}
            color={spell.passive ? "#444" : spell.color}
            size={32}
            attr={{
                onMouseEnter: () => this.onAlternativeEnter(spell.id),
                onMouseLeave: () => this.onAlternativeLeave(),
                onMouseDown: (ev) => this.onAlternativeMouseDown(ev, spell.id, spellKey),
            }}
        />
    }

    private renderChangeSpellHint() {
        if (isMobile) {
            return null;
        }

        return <div className="customize-hint-container">
            <div className="customize-hint">{this.props.toolbar.hoverControl || `${this.renderModifierClick()} a button below to change spells`}</div>
        </div>
    }

    private renderMobileHint(hoverBtn: string, hoverSpellId: string) {
        if (!this.props.allowSpellChoosing) {
            return null;
        }

        const spell = this.props.settings.Spells[hoverSpellId];
        if (!spell) {
            return null;
        }

        return <div className="customize-hint-container">
            <div className="customize-hint spell-name">{spellUtils.spellName(spell)}</div>
        </div>;
    }

    private renderDesktopHint() {
        return <div className="customize-hint-container">
            <div className="customize-hint">{this.renderModifierClick()} to change</div>
        </div>;
    }

    private renderModifierClick() {
        return this.props.noRightClickChangeSpells ? "Ctrl+Click" : "Right-click";
    }

    private renderTeamHint() {
        return <div className="customize-hint-container">
            <div className="customize-hint team-hint">{this.props.teams.map(team => team.heroIds.length).join('v')}</div>
        </div>;
    }

    private onAlternativeEnter(spellId: string) {
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { alternativeSpellId: spellId },
        });
    }

    private onAlternativeLeave() {
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { alternativeSpellId: null },
        });
    }

    private onAlternativeMouseDown(ev: React.MouseEvent, spellId: string, spellKey: string) {
        ev.stopPropagation();
        ev.preventDefault();

        const keyBindings = { ...this.props.keyBindings };
        keyBindings[spellKey] = spellId;
        keyboardUtils.updateKeyBindings(keyBindings);

        ticker.sendKeyBindings(this.props.correlationId, this.props.myHeroId, keyBindings);
        this.chooseRandomSpell();
    }
}

export default ReactRedux.connect(stateToProps)(HintPanel);