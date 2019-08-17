import * as screenfull from 'screenfull';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';
import { isMobile } from '../../core/userAgent';

import ButtonRow from './buttonRow';

interface Props {
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
    };
}

class FullScreenButton extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (!screenfull || isMobile) {
            // Not supported
            return null;
        }

        return <ButtonRow label="Fullscreen" icon="fas fa-compress" onClick={() => this.onClick()} />
    }

    private async onClick() {
        if (screenfull) {
            screenfull.toggle();
        }
    }
}

export default ReactRedux.connect(stateToProps)(FullScreenButton);