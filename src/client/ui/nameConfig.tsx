import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as PlayerName from '../../game/sanitize';
import * as parties from '../core/parties';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';

interface Props {
    savedName: string;
}

interface State {
    name: string;
    changed: boolean;
    saved: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        savedName: state.playerName,
    };
}

class NameConfig extends React.PureComponent<Props, State> {
    private saveStateDebounced = _.debounce(() => this.saveState(), 500);

    constructor(props: Props) {
        super(props);
        this.state = {
            name: props.savedName,
            changed: false,
            saved: true,
        }
    }

    render() {
        const name = this.state.name;
        return <div>
            <div><input type="text" value={name} maxLength={PlayerName.MaxPlayerNameLength} onChange={(e) => this.onChange(e)} /></div>
            {this.state.changed && this.state.saved && <div style={{ marginTop: 8 }}>
                Your name has been set to <b>{name}</b>
            </div>}
            {this.state.changed && !this.state.saved && <div style={{ marginTop: 8 }}>
                Unsaved changes <i className="fas fa-undo clickable" title="Cancel" onClick={() => this.onReset()} />
            </div>}
        </div>;
    }

    private onChange(ev: React.ChangeEvent<HTMLInputElement>) {
        const name = PlayerName.sanitizeName(ev.target.value);
        this.setState({
            name,
            changed: true,
            saved: false,
        });
        this.saveStateDebounced();
    }

    private onReset() {
        this.setState({ name: this.props.savedName, saved: true, changed: false });
    }

    private saveState() {
        const name = this.state.name;
        if (PlayerName.validName(name)) {
            StoreProvider.dispatch({ type: "updatePlayerName", playerName: name });
            Storage.saveName(name);
            this.setState({ saved: true })

            parties.updatePartyAsync()
            .then(() => cloud.uploadSettings())
        }
    }
}

export default ReactRedux.connect(stateToProps)(NameConfig);