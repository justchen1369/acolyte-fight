import * as React from 'react';
import * as rooms from './rooms';
import * as url from './url';

interface Props {
    current: url.PathElements;
}
interface State {
    error: string;
    selectedFile: File;
}

export class ModdingPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            error: null,
            selectedFile: null,
        };
    }

    render() {
        return <div>
            <h1>Modding (EXPERIMENTAL)</h1>
            <p>
                Mods allow you to change the rules of the game for your private room. Mods are represented as JSON files.
                This feature is experimental and will be subject to a lot of change!
                Forward compatibility is not guaranteed - functional mods in the current version may be broken by future releases.
                Mods are represented as JSON overrides to the default settings file.
                To maximise the likelihood of forward-compatibility, your mod should only contain as few overrides as necessary.
            </p>
            <p>
                Examples:
                <ul>
                    <li><a href="/static/fireballMod.acolytefight.json">fireballMod.acolytefight.json</a> - this is example mod increases fireball cooldown.</li>
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
            <h2>Create modded room</h2>
            <p>Choose a mod file: <input className="file-selector" type="file" onChange={e => this.setState({ selectedFile: e.target.files.item(0) })} /></p>
            <p><div className={this.state.selectedFile ? "btn" : "btn btn-disabled"} onClick={() => this.onSubmit()}>Create Room</div></p>
            {this.state.error && <p className="error">{this.state.error}</p>}
            <p><b>Tip: </b>you can drag-and-drop a mod file onto this window to quickly create a modded room</p>
        </div>;
    }

    private onSubmit() {
        rooms.createRoomFromFile(this.state.selectedFile, this.props.current)
            .catch(error => {
                console.error(error);
                this.setState({ error: `${error}` });
            });
    }
}