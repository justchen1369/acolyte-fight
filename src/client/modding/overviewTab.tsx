import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as fileUtils from '../core/fileUtils';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as url from '../url';
import { saveAs } from 'file-saver';

const stringifyMod = Reselect.createSelector(
    (mod: Object) => mod,
    (mod: Object) => JSON.stringify(mod, null, "\t"),
);

interface Props {
    currentMod: Object;
    onUpdateMod: (mod: Object) => void;
}
interface State {
    selectedFile: File;
    error: string;
}

class OverviewTab extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedFile: null,
            error: null,
        };
    }

    render() {
        return <div className="page-container">
            <div className="page">
                <h1>Modding</h1>
                {this.renderCurrentState()}
                {this.renderHelp()}
            </div>
        </div>;
    }

    private renderHelp() {
        return <div>
            <h2>Reference</h2>
            <ul>
                <li><a href="api/acolytefight.d.ts">acolytefight.d.ts</a> - this is a TypeScript definition file that defines the schema of the settings</li>
            </ul>
        </div>
    }

    private renderCurrentState() {
        const currentMod = this.props.currentMod;
        if (currentMod) {
            return Object.keys(currentMod).length > 0 ? this.renderCurrentMod(currentMod) : this.renderEmptyMod();
        } else {
            // Either the mod has not been parsed yet, or there was an error
            return null;
        }
    }

    private renderEmptyMod() {
        return <div>
            <p>
                Mods allow you to change the rules of the game for your party.
                This feature is experimental and will be subject to a lot of change!
                Forward compatibility is not guaranteed - functional mods in the current version may be broken by future releases.
            </p>
            <h2>Load from file</h2>
            <p>Choose a mod file: <input className="file-selector" type="file" onChange={e => this.setState({ selectedFile: e.target.files.item(0) })} /></p>
            <div className={this.state.selectedFile ? "btn" : "btn btn-disabled"} onClick={() => this.onLoadModFile(this.state.selectedFile)}>Load from file</div>
            {this.state.error && <p className="error">{this.state.error}</p>}
            <h2>Load from example</h2>
            <ul>
                <li><a href="static/fireballMod.acolytefight.json" onClick={(ev) => this.onLoadModHref(ev)}>fireballMod.acolytefight.json</a> - this example mod decreases fireball cooldown.</li>
                <li><a href="static/homingClusterMod.acolytefight.json" onClick={(ev) => this.onLoadModHref(ev)}>homingClusterMod.acolytefight.json</a> - this is an example of creating a new spell - a slow cluster of homing missiles.</li>
                <li><a href="static/noMove.acolytefight.json" onClick={(ev) => this.onLoadModHref(ev)}>noMove.acolytefight.json</a> - this example mod disables normal movement but reduces the speed of teleport.</li>
            </ul>
        </div>
    }

    private renderCurrentMod(currentMod: Object) {
        return <div>
            <h2>Current mod</h2>
            <p>
                The mod below is currently active.
                You will automatically be matched to other players who currently have the same mod activated.
            </p>
            <textarea className="mod-json" value={stringifyMod(this.props.currentMod)} readOnly />
            <div className="button-row">
                <div className="btn" onClick={() => this.props.onUpdateMod({})}>Reset to Default</div>
                <div className="btn" onClick={() => this.onSaveModFile(currentMod)}>Save to file</div>
            </div>
        </div>
    }

    private async onLoadModHref(ev: React.MouseEvent<HTMLAnchorElement>) {
        try {
            const el = ev.currentTarget;
            if (el && el.href) {
                ev.preventDefault();
                const res = await fetch(el.href);
                const mod = await res.json();
                this.props.onUpdateMod(mod);
            }
        } catch (exception) {
            console.error("Error loading mod from URL", exception);
            this.setState({ error: `${exception}` });
        }
    }

    private async onLoadModFile(file: File) {
        try {
            const json = await fileUtils.readFileAsync(file);
            const mod = JSON.parse(json);
            this.props.onUpdateMod(mod);
        } catch (exception) {
            console.error("Error loading mod from file", exception);
            this.setState({ error: `${exception}` });
        }
    }

    private onSaveModFile(currentMod: Object) {
        if (currentMod) {
            const json = JSON.stringify(currentMod, null, "\t");
            saveAs(new Blob([json], {type: "application/json;charset=utf-8"}));
        }
    }
}

export default OverviewTab;