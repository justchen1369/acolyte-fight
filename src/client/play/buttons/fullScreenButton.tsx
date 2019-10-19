import * as screenfull from 'screenfull';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';
import { isMobile } from '../../userAgent';

import ButtonRow from './buttonRow';

interface Props {
}
interface State {
    isFullscreen: boolean;
}

function stateToProps(state: s.State): Props {
    return {
    };
}

function isFullscreen() {
    return screenfull && screenfull.isFullscreen || !!document.fullscreenElement; // for some reason, isFullscreen is undefined, so fallback
}

class FullScreenButton extends React.PureComponent<Props, State> {
    private fullscreenChangeHandler = (ev: Event) => this.onFullscreenChange(ev);

    constructor(props: Props) {
        super(props);
        this.state = {
            isFullscreen: isFullscreen(),
        };
    }

    componentDidMount() {
        if (screenfull) {
            screenfull.on('change', this.fullscreenChangeHandler);
        }
    }

    componentWillUnmount() {
        if (screenfull) {
            screenfull.off('change', this.fullscreenChangeHandler);
        }
    }

    render() {
        if (!(screenfull && screenfull.enabled) || isMobile) {
            // Not supported
            return null;
        }

        if (this.state.isFullscreen) {
            return null;
        } else {
            return <ButtonRow label="Fullscreen" icon="fas fa-compress" onClick={() => this.onClick()} />
        }
    }

    private async onClick() {
        if (screenfull) {
            screenfull.toggle();
        }
    }

    private onFullscreenChange(ev: Event) {
        this.setState({ isFullscreen: isFullscreen() });
    }
}

export default ReactRedux.connect(stateToProps)(FullScreenButton);