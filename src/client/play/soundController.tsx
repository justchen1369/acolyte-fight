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
    mute?: boolean;
    items: s.NotificationItem[];
    sounds: Sounds;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        mute: state.options.mute,
        items: state.items,
        sounds: state.world.settings.Sounds,
    };
}

class SoundController extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render(): React.ReactNode {
        if (this.props.mute) {
            return null;
        }

        const elems = new Array<audio.AudioElement>();
        this.props.items.forEach(item => {
            const notif = item.notification;
            if (notif.type === "text") {
                elems.push({ id: item.key, sound: "message" });
            }
        });

        if (elems.length > 0) {
            const Sounds = this.props.sounds;
            audio.playUnattached(elems, Sounds);
        }

        return null;
    }
}

export default ReactRedux.connect(stateToProps)(SoundController);