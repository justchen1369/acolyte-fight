import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../../core/cloud';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';

import ButtonRow from './buttonRow';

interface Props {
    showingChat: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        showingChat: state.showingChat,
    };
}

class ChatButton extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.showingChat) {
            return <ButtonRow label="Hide chat" secondary={true} icon="fas fa-comments" onClick={() => this.onClick(false)} />
        } else {
            return <ButtonRow label="Show chat" secondary={true} icon="fas fa-comments" onClick={() => this.onClick(true)} />
        }
    }

    private async onClick(showingChat: boolean) {
        StoreProvider.dispatch({
            type: "showingChat",
            showingChat,
        });
    }
}

export default ReactRedux.connect(stateToProps)(ChatButton);