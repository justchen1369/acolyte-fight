import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as icons from '../core/icons';
import * as spellUtils from '../core/spellUtils';
import { SpellIcon } from '../controls/spellIcon';
import SpellStats from './spellStats';

import './spellInfoPanel.scss';

interface Props {
    spellId: string;
    settings: AcolyteFightSettings;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        spellId: state.world.ui.toolbar.alternativeSpellId || state.world.ui.toolbar.hoverSpellId,
        settings: state.world.settings,
    };
}

class SpellInfoPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (!this.props.spellId) {
            return null; // Nothing to render
        }

        const spell = this.props.settings.Spells[this.props.spellId];
        if (!spell) {
            return null;
        }

        const name = spellUtils.spellName(spell);
        return <div id="spell-info-panel" className="dialog-panel">
            <div className="spell-title">
                <div className="spacer"></div>
                <span className="spell-name">{name}</span>
                <SpellIcon
                    icon={icons.getIcon(spell.icon, this.props.settings.Icons)}
                    color={spell.color}
                    size={48}
                    attr={{
                        title: name,
                    }} />
            </div>
            <div className="spell-description">
                {spell.description}
            </div>
            {this.renderEffects(spell.effects)}
            <SpellStats spellId={this.props.spellId} settings={this.props.settings} />
        </div>;
    }

    private renderEffects(effects: EffectInfo[]) {
        if (!effects) {
            return null;
        }

        return effects.map(effect => <div className="spell-effect" key={effect.title}><i className={effect.icon} /> <b>{effect.title}:</b> {effect.text}</div>);
    }
}

export default ReactRedux.connect(stateToProps)(SpellInfoPanel);