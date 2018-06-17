import * as _ from 'lodash';
import * as React from 'react';
import { StorageKeys } from '../game/storage.model';

interface Props {
}

interface State {
    name: string;
    saved: boolean;
}

export class NameConfig extends React.Component<Props, State> {
    private saveStateDebounced = _.debounce(() => this.saveState(), 200);

    constructor(props: Props) {
        super(props);
        this.state = {
            name: window.localStorage.getItem(StorageKeys.Name),
            saved: true,
        }
    }
    render() {
        return <div>
            <h2>Your Name</h2>
            <div><input type="text" value={this.state.name} onChange={(e) => this.onChange(e)} /></div>
            <div style={{ marginTop: 8 }}>
                {this.state.saved 
                    ? "Your name has been set to " + this.state.name + " (does not apply to any in-progress games)"
                    : "Unsaved changes"}
            </div>
        </div>;
    }

    private onChange(ev: React.ChangeEvent<HTMLInputElement>) {
        this.setState({
            name: ev.target.value,
            saved: false,
        });
        this.saveStateDebounced();
    }

    private saveState() {
        window.localStorage.setItem(StorageKeys.Name, this.state.name);
        this.setState({
            saved: true,
        });
    }
}