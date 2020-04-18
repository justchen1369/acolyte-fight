import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as h from '../../game/character.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import * as skinLibrary from '../../game/skinLibrary';
import SkinCanvas from './SkinCanvas';

interface Props {
    settings: AcolyteFightSettings;
}

interface State {
    skin: h.Skin;
}

function stateToProps(state: s.State): Props {
    return {
        settings: state.room.settings,
    };
}

class SkinEditorPage extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            skin: skinLibrary.defaultSkin,
        };
    }

    render() {
        const skin = this.state.skin;
        return <div>
            <SkinCanvas
                width={300}
                height={250}
                skin={skin}
                settings={this.props.settings}
                />
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(SkinEditorPage);