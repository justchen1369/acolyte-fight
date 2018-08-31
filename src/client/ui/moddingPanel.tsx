import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as pages from '../core/pages';
import * as url from '../url';

interface Props {
    mod: Object;
}
interface State {
    error: string;
    selectedFile: File;
    loading: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        mod: state.room.mod,
    };
}

class ModdingPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            error: null,
            selectedFile: null,
            loading: false,
        };
    }

    render() {
        return <div>
            <h1>Modding (EXPERIMENTAL)</h1>
            {Object.keys(this.props.mod).length > 0 ? this.renderAttached() : this.renderDetached()}
        </div>;
    }

    private renderAttached() {
        return <div>
            <p>
                Currently, the following modifications will affect your games:
                <textarea className="mod-json">{JSON.stringify(this.props.mod, null, 2)}</textarea>
            </p>
            <p><div className={!this.state.loading ? "btn" : "btn btn-disabled"} onClick={() => this.onDetach()}>Deactivate mod</div></p>
        </div>
    }

    private renderDetached() {
        return <div>
            <p>
                Mods allow you to change the rules of the game for your party. Mods are represented as JSON files.
                This feature is experimental and will be subject to a lot of change!
                Forward compatibility is not guaranteed - functional mods in the current version may be broken by future releases.
                Mods are represented as JSON overrides to the default settings file.
                To maximise the likelihood of forward-compatibility, your mod should only contain as few overrides as necessary.
            </p>
            <p>
                Examples:
                <ul>
                    <li><a href="/static/fireballMod.acolytefight.json">fireballMod.acolytefight.json</a> - this example mod decreases fireball cooldown.</li>
                    <li><a href="/static/homingClusterMod.acolytefight.json">homingClusterMod.acolytefight.json</a> - this is an example of creating a new spell - a slow cluster of homing missiles.</li>
                    <li><a href="/static/noMove.acolytefight.json">noMove.acolytefight.json</a> - this example mod disables normal movement but reduces the speed of teleport.</li>
                </ul>
            </p>
            <p>
                Reference:
                <ul>
                    <li><a href="/api/default.acolytefight.json">default.acolytefight.json</a> - this JSON file represents all the current default settings.</li>
                    <li><a href="/api/acolytefight.d.ts">acolytefight.d.ts</a> - this is a TypeScript definition file that defines the schema of the settings</li>
                </ul>
            </p>
            <h2>Use a mod</h2>
            <p>You will automatically be matched to other players who currently have the same mod activated. If you are in a party, this applies the mod to the party.</p>
            <p>Choose a mod file: <input className="file-selector" type="file" onChange={e => this.setState({ selectedFile: e.target.files.item(0) })} /></p>
            <p><div className={!this.state.loading && this.state.selectedFile ? "btn" : "btn btn-disabled"} onClick={() => this.onAttach()}>Activate mod</div></p>
            {this.state.error && <p className="error">{this.state.error}</p>}
        </div>
    }

    private onAttach() {
        this.setState({ loading: true });

        rooms.createRoomFromFileAsync(this.state.selectedFile)
            .then(roomId => rooms.joinRoomAsync(roomId))
            .then(roomId => parties.movePartyAsync(roomId))
            .then(() => this.setState({ loading: false }))
            .catch(error => {
                console.error(error);
                this.setState({ loading: false, error: `${error}` });
            })
        ;
    }

    private onDetach() {
        this.setState({ loading: true });

        rooms.leaveRoom();
        parties.movePartyAsync(null);

        this.setState({ loading: false });
    }
}

export default ReactRedux.connect(stateToProps)(ModdingPanel);