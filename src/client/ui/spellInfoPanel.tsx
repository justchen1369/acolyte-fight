import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as spellUtils from '../core/spellUtils';
import { ButtonBar } from '../../game/constants';
import { SpellIcon } from './spellIcon';
import SpellStats from './spellStats';

interface Props {
    hoverSpellId: string;
    buttonBar: w.ButtonConfig;
    settings: AcolyteFightSettings;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        hoverSpellId: state.world.ui.hoverSpellId,
        buttonBar: state.world.ui.buttonBar,
        settings: state.world.settings,
    };
}

class SpellInfoPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (!this.props.hoverSpellId) {
            return null; // Nothing to render
        }

        // Offset the messages from the button bar
        let marginBottom = 0;
        const buttonBar = this.props.buttonBar;
        if (buttonBar) {
            if (buttonBar.view === "bar") {
                marginBottom = ButtonBar.Size * buttonBar.scaleFactor + ButtonBar.Margin * 2;
            } else if (buttonBar.view === "wheel") {
                return null; // Simply don't display tooltip on mobile, not enough space
            }
        } else {
            return null; // No buttons to hover over
        }

        const spell = this.props.settings.Spells[this.props.hoverSpellId];
        if (!spell) {
            return null;
        }

        const name = spellUtils.spellName(spell);
        return <div id="spell-info-panel" style={{ marginBottom }}>
            <div className="spell-title">
                <div className="spacer"></div>
                <span className="spell-name">{name}</span>
                <SpellIcon
                    icon={spell.icon}
                    color={spell.color}
                    title={name}
                    size={48} />
            </div>
            <div className="spell-description">
                {spell.description}
            </div>
            <SpellStats spellId={this.props.hoverSpellId} />
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(SpellInfoPanel);