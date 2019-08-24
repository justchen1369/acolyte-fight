import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../../core/cloud';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

interface Props {
    noAutoJoin: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        noAutoJoin: state.options.noAutoJoin,
    };
}

class AutoJoinConfigButton extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.noAutoJoin) {
            return <ButtonRow label="No auto-join" icon="fas fa-times" onClick={() => this.onClick(false)} />
        } else {
            return <ButtonRow label="Auto-joining next match" icon="fas fa-check" onClick={() => this.onClick(true)} />
        }
    }

    private async onClick(noAutoJoin: boolean) {
        StoreProvider.dispatch({
            type: "updateOptions",
            options: { noAutoJoin },
        });
        await cloud.uploadSettings();
    }
}

export default ReactRedux.connect(stateToProps)(AutoJoinConfigButton);