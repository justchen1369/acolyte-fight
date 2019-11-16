import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as engine from '../../game/engine';
import * as spellUtils from '../core/spellUtils';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import SpellIcon from '../controls/spellIcon';

interface OwnProps {
    bindings: KeyBindings;
}
interface Props extends OwnProps {
    settings: AcolyteFightSettings;
}

interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        settings: state.room.settings,
    };
}

class BuildPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const settings = this.props.settings;
        const resolved = engine.resolveKeyBindings(this.props.bindings, settings);
        return <div className="character-build">
            {settings.Choices.Keys.map(keyConfig => keyConfig && this.renderSpell(resolved.keysToSpells.get(keyConfig.btn), settings))}
        </div>
    }

    private renderSpell(spellId: string, settings: AcolyteFightSettings): React.ReactNode {
        const spell = settings.Spells[spellId];
        if (!spell) {
            return null;
        }

        const icon = settings.Icons[spell.icon];
        if (!(icon && icon.path)) {
            return null;
        }

        const spellName = spellUtils.spellName(spell);
        const path2D = new Path2D(icon.path);
        return <SpellIcon key={spellId} icon={path2D} color={spell.color} size={56} attr={{ title: spellName }} />
    }
}

export default ReactRedux.connect(stateToProps)(BuildPanel);