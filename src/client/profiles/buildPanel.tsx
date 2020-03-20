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
import SpellIconLookup from '../controls/spellIconLookup';

interface OwnProps {
    bindings: KeyBindings;
    color?: string;
    size?: number;
    onSpellDown?: (key: string) => void;
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
            {settings.Choices.Keys.map(keyConfig => keyConfig && <SpellIconLookup
                key={keyConfig.btn}
                spellId={resolved.keysToSpells.get(keyConfig.btn)}
                color={this.props.color}
                size={this.props.size || 56}
                attr={{
                    onMouseDown: () => this.props.onSpellDown && this.props.onSpellDown(keyConfig.btn),
                }}
            />)}
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(BuildPanel);