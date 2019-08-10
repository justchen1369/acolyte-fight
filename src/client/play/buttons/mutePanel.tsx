import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../../core/cloud';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

interface Props {
    mute: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        mute: state.options.mute,
    };
}

class MutePanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const muted = this.props.mute;
        if (muted) {
            return <ButtonRow label="Unmute" icon="fas fa-volume-mute" onClick={() => this.onMuteClick(false)} />
        } else {
            return <ButtonRow label="Mute" icon="fas fa-volume" onClick={() => this.onMuteClick(true)} />
        }
    }

    private async onMuteClick(mute: boolean) {
        StoreProvider.dispatch({
            type: "updateOptions",
            options: { mute },
        });
        await cloud.uploadSettings();
    }
}

export default ReactRedux.connect(stateToProps)(MutePanel);