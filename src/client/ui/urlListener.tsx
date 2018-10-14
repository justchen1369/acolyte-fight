import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as url from '../url';

interface Props {
    current: s.PathElements;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        current: state.current,
    };
}

class UrlListener extends React.Component<Props, State> {
    render(): JSX.Element {
        return null;
    }

    componentWillReceiveProps(newProps: Props) {
        const current = this.props.current;
        const next = newProps.current;
        const path = url.getPath(next);
        if (current.page !== next.page || current.profileId !== next.profileId || current.gameId !== next.gameId) {
            window.history.pushState(next, null, path);
        } else {
            window.history.replaceState(next, null, path);
        }

        const gtag = (window as any).gtag;
        const gaTrackingId = (window as any).gaTrackingId;
        if (gtag && gaTrackingId) {
            gtag('config', gaTrackingId, {'page_path': path});
        }
    }
}

export default ReactRedux.connect(stateToProps)(UrlListener);