import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as options from '../options';
import * as matches from '../core/matches';
import * as StoreProvider from '../storeProvider';

import ControlSurface from './controlSurface';
import CanvasPanel from './canvasPanel';
import HUD from './hud';
import OnlineSegmentListener from '../controls/onlineSegmentListener';
import SoundController from './soundController';
import TitleListener from '../controls/titleListener';
import UrlListener from '../controls/urlListener';
import WatchLooper from '../controls/watchLooper';

interface Props {
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
    };
}

class GamePanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return (
            <ControlSurface>
                <TitleListener />
                <CanvasPanel />
                <HUD />
                <SoundController />
                <OnlineSegmentListener />
                <UrlListener />
                <WatchLooper />
            </ControlSurface>
        );
    }
}

export default ReactRedux.connect(stateToProps)(GamePanel);