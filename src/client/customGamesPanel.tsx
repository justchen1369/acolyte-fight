import fileSaver from 'file-saver';
import * as React from 'react';
import * as rooms from './rooms';
import * as url from './url';
import { Mod } from '../game/settings';

interface Props {
    current: url.PathElements;
}
interface State {
    error: string;
    selectedFile: File;
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
        if (this.props.current.room) {
            return this.renderCurrentRoom();
        } else {
            return this.renderNewRoom();
        }
    }

    private renderCurrentRoom() {
        const currentRoomPath = url.getRoomHomePath(this.props.current);
        return <div>
            <h1>Current room</h1>
            <p>
                You are currently in room <b><a href={currentRoomPath}>{this.props.current.room}</a></b>.
                Invite friends to this room by sending the following URL:
                <input className="share-url" type="text" value={window.location.origin + currentRoomPath} readOnly onFocus={ev => ev.target.select()} />
            </p>
            <p><div className="btn" onClick={() => this.exitRoom()}>Exit room</div></p>
            <h2>Room modifications</h2>
            {Object.keys(Mod).length > 0
                ? <p>
                    The following modifications are active in this room:
                    <textarea className="mod-json">{JSON.stringify(Mod, null, 2)}</textarea>
                </p>
                : <p>No modifications are in effect in this room.</p>}
        </div>
    }

    private renderNewRoom() {
        return <div>
            <div>
                <h1>Private room</h1>
                <p>Create a private room to play with friends!</p>
            </div>
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
                    <li><a href="/static/fireballMod.acolytefight.json">fireballMod.acolytefight.json</a> - this is an example mod which increases fireball cooldown.</li>
                    <li><a href="/api/default.acolytefight.json">default.acolytefight.json</a> - this JSON file represents all the current default settings.</li>
                    <li><a href="/api/acolytefight.d.ts">acolytefight.d.ts</a> - this is a TypeScript definition file that defines the schema of the settings</li>
                </ul>
            </p>
            <h2>Create modded room</h2>
            {this.renderForm(true)}
            <p><b>Tip: </b>you can drag-and-drop a mod file onto this window to quickly create a modded room</p>
        </div>;
    }

    private exitRoom() {
        window.location.href = url.exitRoomPath(this.props.current);
    }

    private onSubmit() {
        rooms.createAndJoinRoomAsync(this.state.selectedFile, this.props.current)
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
}