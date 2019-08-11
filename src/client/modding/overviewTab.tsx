import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as ai from '../ai/ai';
import * as e from './editor.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as convert from './convert';
import * as editing from './editing';
import * as fileUtils from '../core/fileUtils';
import * as StoreProvider from '../storeProvider';
import EditorPage from './editorPage';
import CodeEditor from './codeEditor';
import PreviewButton from './previewButton';

const FileSaver = require('../../lib/file-saver');

const stringifyMod = Reselect.createSelector(
    (mod: Object) => mod,
    (mod: Object) => mod ? JSON.stringify(mod, null, "\t") : null,
);

interface Props {
    codeTree: e.CodeTree;
    party: boolean;
    roomId: string;
    roomMod: ModTree;
    currentMod: ModTree;
    errors: e.ErrorTree;
    playerName: string;
}
interface State {
    code: string;
    codeError: string;
    selectedFile: File;
    loadFromFileError: string;
}

function stateToProps(state: s.State): Props {
    return {
        playerName: state.playerName,
        party: !!state.party,
        roomId: state.room.id,
        roomMod: state.room.mod,
        codeTree: state.codeTree,
        currentMod: state.mod,
        errors: state.modErrors,
    };
}

class OverviewTab extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            code: stringifyMod(props.currentMod),
            codeError: null,
            selectedFile: null,
            loadFromFileError: null,
        };
    }

    componentDidMount() {
        if (!this.props.codeTree && this.props.roomId !== m.DefaultRoomId && Object.keys(this.props.roomMod).length > 0) {
            // Room is modded, load the settings from there when launching the mod editor
            StoreProvider.dispatch({ type: "updateCodeTree", codeTree: convert.modToCode(this.props.roomMod) });
        }
    }

    componentDidUpdate(prevProps: Props) {
        if (this.props.currentMod && this.props.currentMod !== prevProps.currentMod) {
            this.setState({ code: stringifyMod(this.props.currentMod) });
        }
    }

    render() {
        return <EditorPage>
            <h1>Modding</h1>
            {this.renderCurrentState()}
        </EditorPage>;
    }

    private renderReference() {
        return <div>
            <h2>Reference</h2>
            <ul>
                <li><a href="api/acolytefight.d.ts">acolytefight.d.ts</a> - this is a TypeScript file that defines the schema of settings</li>
                <li><a href="api/ai.contracts.ts">ai.contracts.ts</a> - this is a TypeScript file that defines the inputs and outputs of the AI code</li>
            </ul>
        </div>
    }

    private renderCurrentState() {
        if (this.props.codeTree) {
            if (this.state.code) {
                return this.renderCurrentMod();
            } else {
                return this.renderCurrentModError();
            }
        } else {
            return this.renderEmptyMod();
        }
    }

    private renderEmptyMod() {
        return <div className="modding-overview">
            <p>
                Mods allow you to change the rules of the game for your party.
                This feature is experimental and will be subject to a lot of change!
                Forward compatibility is not guaranteed - functional mods in the current version may be broken by future releases.
            </p>
            <h2>Create new</h2>
            <p>Create a new mod from scratch.</p>
            <div className="btn" onClick={() => this.onCreateMod()}>Create mod</div>
            <h2>Open file</h2>
            <p>Choose a mod file: <input className="file-selector" type="file" onChange={e => this.setState({ selectedFile: e.target.files.item(0) })} /></p>
            <div className={this.state.selectedFile ? "btn" : "btn btn-disabled"} onClick={() => this.onLoadModFile(this.state.selectedFile)}>Load from file</div>
            {this.state.loadFromFileError && <p className="error">{this.state.loadFromFileError}</p>}
            <h2>Examples</h2>
            <ul>
                <li><a href="static/fireballMod.acolytefight.json" onClick={(ev) => this.onLoadModHref(ev)}>fireballMod.acolytefight.json</a> - this example mod decreases Fireball cooldown.</li>
                <li><a href="static/acolyteBeamFiesta.mod.json" onClick={(ev) => this.onLoadModHref(ev)}>acolyteBeamFiesta.acolytefight.json</a> - this example mod decreases Acolyte Beam cooldown and removes other spells.</li>
                <li><a href="static/noMove.acolytefight.json" onClick={(ev) => this.onLoadModHref(ev)}>noMove.acolytefight.json</a> - this example mod disables normal movement but reduces the speed of teleport.</li>
            </ul>
        </div>
    }

    private renderCurrentMod() {
        return <div className="modding-overview">
            <p>
                The mod below is currently active. <b>Explore the menu</b> (above) to edit this mod. Click <b>Preview Mod</b> (top right) to play this mod by yourself.
            </p>
            {this.props.party
                ? <p>The mod has been activated for all your <a href="party" onClick={(ev) => this.onPartyClick(ev)}>party</a> members too.</p>
                : <p><a href="party" onClick={(ev) => this.onPartyClick(ev)}>Create a party</a> to play this mod with friends.</p>}
            <CodeEditor code={this.state.code} onChange={(code) => this.onCodeChange(code)} />
            {this.state.codeError && <div className="error">{this.state.codeError}</div>}
            <div className="button-row">
                <div className="btn" onClick={() => this.onSaveModFile(this.props.currentMod, this.state.code)}>Save to File</div>
            </div>
            {this.renderDiscard()}
            {this.renderReference()}
        </div>
    }

    private renderCurrentModError() {
        return <div className="modding-overview">
            {this.props.currentMod && <p className="error">Your mod currently has errors - check the other tabs (above) to fix them.</p>}
            {!this.props.currentMod && <p className="loading-text">Compiling mod...</p>}
            {this.renderDiscard()}
            {this.renderReference()}
        </div>
    }

    private renderDiscard() {
        return <>
            <h2>Back to Default Settings</h2>
            <p>Discard the current mod and revert back to default settings.</p>
            <div className="btn" onClick={() => this.onDiscardMod()}>Discard</div>
        </>
    }

    private onCodeChange(code: string) {
        this.setState({ code, codeError: null });
        try {
            const mod = JSON.parse(code);
            const codeTree = convert.modToCode(mod);
            StoreProvider.dispatch({ type: "updateCodeTree", codeTree });
        } catch (exception) {
            this.setState({ codeError: `${exception}` });
        }
    }

    private onCreateMod() {
        const meta: ModSettings = {
            name: `${this.props.playerName}'s mod`,
            author: this.props.playerName,
            description: new Date().toUTCString(),
            titleLeft: `${this.props.playerName}'s`,
            titleRight: "Mod!",
        };
        const initialMod: ModTree = {
            Mod: meta,
        };
        const codeTree = convert.modToCode(initialMod);
        StoreProvider.dispatch({ type: "updateCodeTree", codeTree });
    }

    private async onLoadModHref(ev: React.MouseEvent<HTMLAnchorElement>) {
        try {
            const el = ev.currentTarget;
            if (el && el.href) {
                ev.preventDefault();
                const res = await fetch(el.href);
                const mod = await res.json();
                const codeTree = convert.modToCode(mod);
                StoreProvider.dispatch({ type: "updateCodeTree", codeTree });
            }
        } catch (exception) {
            console.error("Error loading mod from URL", exception);
            this.setState({ loadFromFileError: `${exception}` });
        }
    }

    private async onLoadModFile(file: File) {
        try {
            const json = await fileUtils.readFileAsync(file);
            const mod = JSON.parse(json);
            if (!(mod && typeof mod === "object")) {
                throw "Invalid mod";
            }
            if (!(mod.Mod && mod.Mod.name)) {
                mod.Mod = mod.Mod || {};
                mod.Mod.name = file.name;
            }
            const codeTree = convert.modToCode(mod);
            StoreProvider.dispatch({ type: "updateCodeTree", codeTree });
        } catch (exception) {
            console.error("Error loading mod from file", exception);
            this.setState({ loadFromFileError: `${exception}` });
        }
    }

    private onDiscardMod() {
        StoreProvider.dispatch({ type: "updateCodeTree", codeTree: null });
    }

    private onSaveModFile(currentMod: ModTree, json: string) {
        if (currentMod) {
            let filename = (currentMod.Mod && currentMod.Mod.name) || "acolytefight.mod";
            if (!/\.json$/.test(filename)) {
                filename += ".json";
            }

            FileSaver.saveAs(new Blob([json], {type: "application/json;charset=utf-8"}), filename);
        }
    }

    private async onPartyClick(ev: React.MouseEvent) {
        ev.preventDefault();
        await editing.exitEditor(this.props.currentMod, "party");
    }
}

export default ReactRedux.connect(stateToProps)(OverviewTab);