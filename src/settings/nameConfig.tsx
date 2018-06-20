import * as _ from 'lodash';
import * as React from 'react';
import * as c from '../game/constants.model';
import * as Storage from '../game/storage';

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
            name: Storage.loadName(),
            saved: true,
        }
    }
    render() {
        return <div>
            <h1>Your Name</h1>
            <div><input type="text" value={this.state.name} maxLength={c.MaxPlayerNameLength} onChange={(e) => this.onChange(e)} /></div>
            <div style={{ marginTop: 8 }}>
                {this.state.saved 
                    ? "Your name has been set to " + this.state.name + " (does not apply to any in-progress games)"
                    : "Unsaved changes"}
            </div>
        </div>;
    }

    private onChange(ev: React.ChangeEvent<HTMLInputElement>) {
        this.setState({
            name: c.sanitizeName(ev.target.value),
            saved: false,
        });
        this.saveStateDebounced();
    }

    private saveState() {
        Storage.saveName(this.state.name);
        this.setState({
            saved: true,
        });
    }
}