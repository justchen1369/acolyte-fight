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
    spellId: string;
    size: number;
    color?: string;

    attr?: React.HTMLAttributes<HTMLCanvasElement>;
    style?: React.CSSProperties;
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

class SpellIconLookup extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const spellId = this.props.spellId;
        const settings = this.props.settings;

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
        return <SpellIcon
            icon={path2D}
            color={this.props.color || spell.color}
            size={this.props.size}
            attr={{ title: spellName, ...this.props.attr }}
            style={{ ...this.props.style }}
        />
    }
}

export default ReactRedux.connect(stateToProps)(SpellIconLookup);