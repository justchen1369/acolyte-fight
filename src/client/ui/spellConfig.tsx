import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as engine from '../../game/engine';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import BuildPanel from '../profiles/buildPanel';
import LoadoutDialog from './loadoutDialog';
import SpellBtnConfig from '../play/spellBtnConfig';
import SpellIconLookup from '../controls/spellIconLookup';

import './spellConfig.scss';

interface Props {
    keyBindings: KeyBindings;
    loadouts: m.Loadout[];
    settings: AcolyteFightSettings;
}

interface State {
    showingLoadouts?: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        keyBindings: state.keyBindings,
        loadouts: state.loadouts,
        settings: state.room.settings,
    };
}

class SpellConfig extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const keys = this.props.settings.Choices.Keys.filter(x => !!x).map(x => x.btn);
        return <div className="spell-config-container">
            {this.renderToolbar()}
            <div className="spell-config">
                {keys.map(key => <SpellBtnConfig key={key} btn={key} rebinding={true} settings={this.props.settings} />)}
            </div>
            {this.state.showingLoadouts && <LoadoutDialog onClose={() => this.onHideLoadoutsClick()} />}
        </div>;
    }

    private renderToolbar() {
        return <h1 className="spell-config-toolbar">
            <span>Your Spells</span>
            <div className="spacer" />
            <div className="spell-config-toolbar-actions">
                <i className="fas fa-cog clickable" onClick={() => this.onShowLoadoutsClick()} />
            </div>
        </h1>
    }

    private onShowLoadoutsClick() {
        this.setState({ showingLoadouts: true });
    }

    private onHideLoadoutsClick() {
        this.setState({ showingLoadouts: false });
    }
}

export default ReactRedux.connect(stateToProps)(SpellConfig);