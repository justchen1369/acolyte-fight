import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as audio from '../graphics/audio';
import * as s from '../store.model';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as constants from '../../game/constants';
import * as StoreProvider from '../storeProvider';

interface Props {
    sounds: Sounds;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        sounds: state.world.settings.Sounds,
    };
}

class AudioCacheController extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render(): React.ReactNode {
        const Sounds = this.props.sounds;
        audio.cache(Sounds); // If the mod changes, sounds may need to be re-cached
        return null;
    }
}

export default ReactRedux.connect(stateToProps)(AudioCacheController);