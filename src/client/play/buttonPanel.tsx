import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';
import { isMobile } from '../core/userAgent';

import MutePanel from './buttons/mutePanel';
import RandomizePanel from './buttons/randomizePanel';
import TextMessageBox from './textMessageBox';
import VideoPanel from './buttons/videoPanel';

interface Props {
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
    };
}

class ButtonPanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div className="button-panel">
            <MutePanel />
            <RandomizePanel />
            <VideoPanel />
            {isMobile && <TextMessageBox />}
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(ButtonPanel);