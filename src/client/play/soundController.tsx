import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as audio from '../audio/audio';
import * as s from '../store.model';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as constants from '../../game/constants';
import * as StoreProvider from '../storeProvider';

interface Props {
    mute?: boolean;
    live: boolean;
    items: s.NotificationItem[];
    sounds: Sounds;
    myHeroId: string;
    noAudioCaching: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        mute: state.options.mute,
        live: state.world.ui.live,
        items: state.items,
        sounds: state.world.settings.Sounds,
        myHeroId: state.world.ui.myHeroId,
        noAudioCaching: state.options.noAudioCaching,
    };
}

class SoundController extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render(): React.ReactNode {
        if (!this.props.noAudioCaching) {
            audio.cache(this.props.sounds);
        }

        if (!this.props.mute) {
            audio.unmute();
        } else {
            audio.mute();
        }

        const elems = new Array<audio.AudioElement>();
        this.props.items.forEach(item => {
            let sound: string = this.calculateSound(item.notification);
            if (sound) {
                elems.push({ id: item.key, sound });
            }
        });
        if (elems.length > 0) {
            const Sounds = this.props.sounds;
            audio.playUnattached(elems, Sounds);
        }

        return null;
    }

    private calculateSound(notif: w.Notification) {
        if (notif.type === "text") {
            if (this.props.live) {
                // Messages are not shown in replays
                return "message";
            }
        } else if (notif.type === "join") {
            if (notif.player.heroId !== this.props.myHeroId) {
                return "join";
            }
        }

        return null;
    }
}

export default ReactRedux.connect(stateToProps)(SoundController);