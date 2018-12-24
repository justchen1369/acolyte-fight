import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';

import SpellBtnConfig from './spellBtnConfig';

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
        return <div className="spell-config">
            {Object.keys(this.props.settings.Choices.Options).map(key => <SpellBtnConfig key={key} btn={key} rebinding={true} />)}
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(SpellConfig);