import fileSaver from 'file-saver';
import * as React from 'react';
import * as m from '../game/messages.model';
import * as url from './url';
import { Mod } from '../game/settings';

interface Props {
    room: string;
}
interface State {
    error: string;
    selectedFile: File;
}

function createRoomAsync(mod: Object) {
    return fetch('api/room', {
        credentials: "same-origin",
        headers: {
            'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ mod } as m.CreateRoomRequest),
    }).then(res => res.json()).then((msg: m.CreateRoomResponse) => msg);
}

function readFileAsync(file: File): Promise<string> {
    if (file) {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(reader.result)
            reader.onerror = (ev) => reject(reader.error)
            reader.readAsText(file);
        });
    } else {
        return Promise.resolve<string>(null);
    }
}

export class CustomGamesPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            error: null,
            selectedFile: null,
        };
    }

    componentDidMount() {
    }

    render() {
        return <div>
            {this.props.room && <div>
                <h1>Current room</h1>
                <p>
                    You are currently in room <b>{this.props.room}</b>.
                    {' '}
                    {Object.keys(Mod).length > 0
                    ? <span>Current mod: <a href="#" onClick={() => this.downloadCurrentMod()}>{this.roomModFilename()}</a>.</span>
                    : <span>No mod is active in this room.</span>}
                </p>
            </div>}
            <h1>Custom Games</h1>
            <p>Want to play private games with your friends? Want to modify the rules of the game? See below.</p>
            <h2>Private room</h2>
            <p>Create a private room to play with friends!</p>
            {this.renderForm()}
            <h1>Modding (EXPERIMENTAL)</h1>
            <p>
                Mods allow you to change the rules of the game for your private room. Mods are represented as JSON files.
                This feature is experimental and will be subject to a lot of change!
                Forward compatibility is not guaranteed - functional mods in the current version may be broken by future releases.
                Mods are represented as JSON overrides to the default settings file.
                To maximise the likelihood of forward-compatibility, the mod should only contain as few overrides as necessary.
            </p>
            <p>
                Getting started:
                <ul>
                    <li><a href="/static/fireballMod.acolytefight.json">fireballMod.acolytefight.json</a> - this is an example mod which increases fireball damage.</li>
                    <li><a href="/api/default.acolytefight.json">default.acolytefight.json</a> - this JSON file represents all the current default settings.</li>
                    <li><a href="/api/acolytefight.d.ts">acolytefight.d.ts</a> - this is a TypeScript definition file that defines the schema of the settings</li>
                </ul>
            </p>
            <h2>Create modded room</h2>
            {this.renderForm(true)}
        </div>;
    }

    private onSubmit() {
        readFileAsync(this.state.selectedFile)
            .then(json => json ? JSON.parse(json) : {})
            .then(mod => {
                console.log("Creating room with mod", mod);
                return mod;
            })
            .then(mod => createRoomAsync(mod))
            .then(msg => {
                const path = url.getPath({
                    gameId: null,
                    room: msg.roomId,
                    server: msg.server,
                    page: null,
                });
                window.location.href = path;
            })
            .catch(error => {
                console.error(error);
                this.setState({ error: `${error}` });
            });
    }

    private renderForm(modding: boolean = false) {
        return <div>
            {modding && <p>Choose a mod file (optional): <input className="file-selector" type="file" onChange={e => this.setState({ selectedFile: e.target.files.item(0) })} /></p>}
            <p><div className="btn" onClick={() => this.onSubmit()}>Create Room</div></p>
            {this.state.error && <p className="error">{this.state.error}</p>}
        </div>
    }

    private downloadCurrentMod() {
        const filename = this.roomModFilename();
        const file = new File([JSON.stringify(Mod)], filename, {type: "application/json;charset=utf-8"});
        fileSaver.saveAs(file, filename);
    }

    private roomModFilename() {
        return `${this.props.room}.acolytefight.json`;
    }
}