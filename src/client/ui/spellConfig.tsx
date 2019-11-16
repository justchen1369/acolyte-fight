import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';

import SpellBtnConfig from '../play/spellBtnConfig';

import './spellConfig.scss';

interface Props {
    config: KeyBindings;
    settings: AcolyteFightSettings;
}

interface State {
}

function stateToProps(state: s.State): Props {
    return {
        config: state.keyBindings,
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
        return <div className="spell-config">
            {keys.map(key => <SpellBtnConfig key={key} btn={key} rebinding={true} settings={this.props.settings} />)}
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(SpellConfig);