import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../../core/cloud';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

interface Props {
    isPlaying: boolean;
    wheelOnRight: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        isPlaying: !!state.world.ui.myHeroId,
        wheelOnRight: state.options.wheelOnRight,
    };
}

class ActionWheelSidePanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (!this.props.isPlaying) {
            return null;
        }

        if (this.props.wheelOnRight) {
            return <ButtonRow label="Right-handed mode" icon="fas fa-hand-point-right" onClick={() => this.onClick(false)} />
        } else {
            return <ButtonRow label="Left-handed mode" icon="fas fa-hand-point-left" onClick={() => this.onClick(true)} />
        }
    }

    private async onClick(wheelOnRight: boolean) {
        StoreProvider.dispatch({
            type: "updateOptions",
            options: { wheelOnRight },
        });
        await cloud.uploadSettings();
    }
}

export default ReactRedux.connect(stateToProps)(ActionWheelSidePanel);