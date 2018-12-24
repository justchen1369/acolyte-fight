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

class NameConfig extends React.Component<Props, State> {
    private saveStateDebounced = _.debounce(() => this.saveState(), 500);

    constructor(props: Props) {
        super(props);
        this.state = {
            name: null,
            changed: false,
            saved: true,
        }
    }
    render() {
        const name = this.state.saved ? this.props.savedName : this.state.name;
        return <div>
            <div><input type="text" value={name} maxLength={PlayerName.MaxPlayerNameLength} onChange={(e) => this.onChange(e)} /></div>
            {this.state.changed && <div style={{ marginTop: 8 }}>
                {this.state.saved 
                    ? "Your name has been set to " + name
                    : "Unsaved changes"}
            </div>}
        </div>;
    }

    private onChange(ev: React.ChangeEvent<HTMLInputElement>) {
        this.setState({
            name: PlayerName.sanitizeName(ev.target.value),
            changed: true,
            saved: false,
        });
        this.saveStateDebounced();
    }

    private saveState() {
        const name = this.state.name || Storage.createPlayerName();
        StoreProvider.dispatch({ type: "updatePlayerName", playerName: name });
        Storage.saveName(name);
        this.setState({ name: null, saved: true })

        parties.updatePartyAsync()
        .then(() => cloud.uploadSettings())
    }
}

export default ReactRedux.connect(stateToProps)(NameConfig);