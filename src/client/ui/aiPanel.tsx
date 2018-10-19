import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as ai from '../core/ai';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import { readFileAsync } from '../core/fileUtils';

interface Props {
    aiCode: string;
    isLoggedIn: boolean;
}
interface State {
    aiCode: string;

    loading: boolean;
    error: string;
    selectedFile: File;

    changed: boolean;
    saved: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        aiCode: state.aiCode,
        isLoggedIn: state.loggedIn,
    };
}

class AiPanel extends React.Component<Props, State> {
    private saveStateDebounced = _.debounce(() => this.saveState(), 200);

    constructor(props: Props) {
        super(props);
        this.state = {
            loading: false,
            error: null,
            selectedFile: null,
            aiCode: props.aiCode,
            changed: false,
            saved: true,
        };
    }

    render() {
        return this.props.isLoggedIn ? this.renderLoggedIn() : this.renderNotLoggedIn();
    }

    private renderNotLoggedIn() {
        return <div>
            <h1>AI programming</h1>
            <p>Program a bot for this game!</p>
            <p className="login-ad"><div className="btn" onClick={() => window.location.href = "login"}>Login</div> to access AI programming tools.</p>
        </div>;
    }

    private renderLoggedIn() {
        return <div>
            <h1>AI (EXPERIMENTAL)</h1>
            {this.props.aiCode ? this.renderAttached() : this.renderDetached()}
        </div>;
    }

    private renderAttached() {
        return <div>
            <p>Currently, your Acolyte will be controlled by the AI code below:</p>
            <textarea className="ai-js" onChange={(ev) => this.onChange(ev)}>
                {this.props.aiCode}
            </textarea>
            {this.state.changed && <div style={{ marginTop: 8, marginBottom: 16 }}>
                {this.state.saved 
                    ? "Changes saved"
                    : "Unsaved changes"}
            </div>}
            <p><div className="btn" onClick={() => this.onDetach()}>Deactivate Autopilot</div></p>
        </div>;
    }

    private renderDetached() {
        return <div>
            <p>
                Program a bot for this game!
                On this page, you can learn how to write an AI in JavaScript that you can play against.
            </p>
            <p>
                The AI runs in a Web Worker in your browser. It receives the world state through messages, and then it must post messages back to perform actions.
                The code of your AI is never sent to the server, and is never sent to or run on anyone else's machine except yours.
            </p>
            <h2>Reference files</h2>
            <p>
                Reference:
                <ul>
                    <li><a href="static/default.ai.acolytefight.js" target="_blank">default.ai.acolytefight.js</a> - the default AI.</li>
                    <li><a href="static/move.ai.acolytefight.js" target="_blank">move.ai.acolytefight.js</a> - a simple AI that just moves to the center.</li>
                    <li><a href="static/move.ai.acolytefight.js" target="_blank">fireball.ai.acolytefight.js</a> - a simple AI that just continuously shoots fireball at the nearest enemy.</li>
                    <li><a href="/api/acolytefight.d.ts">acolytefight.d.ts</a> - this is a TypeScript definition file that defines the schema of the settings and contracts (see MsgContract).</li>
                </ul>
            </p>
            <div>
                <h2>Activate AI autopilot</h2>
                <p>
                    Autopilot your Acolyte with an AI. This override will only last until you close this browser tab.
                    While in autopilot, you will enter the AI matchmaking pool, which only contains (a) other players who are using AI autopilot and (b) parties that consist of both AI and non-AI.
                </p>
                <p>Choose an AI file: <input className="file-selector" type="file" onChange={e => this.setState({ selectedFile: e.target.files.item(0) })} /></p>
                <p><div className={(this.state.loading || !this.state.selectedFile) ? "btn btn-disabled" : "btn"} onClick={() => this.onAttach()}>Activate Autopilot</div></p>
                {this.state.error && <p className="error">{this.state.error}</p>}
            </div>
        </div>;
    }

    private onAttach() {
        this.setState({ loading: true });

        readFileAsync(this.state.selectedFile)
            .then(aiCode => {
                StoreProvider.dispatch({ type: "updateAiCode", aiCode });
                this.setState({ loading: false });
            })
            .catch(error => {
                console.error(error);
                this.setState({ loading: false, error: `${error}` });
            })
    }

    private onDetach() {
        this.setState({ loading: true });
        StoreProvider.dispatch({ type: "updateAiCode", aiCode: null });

        this.setState({ loading: false });
    }

    private onChange(ev: React.ChangeEvent<HTMLTextAreaElement>) {
        this.setState({
            aiCode: ev.target.value,
            changed: true,
            saved: false,
        });
        this.saveStateDebounced();
    }

    private saveState() {
        StoreProvider.dispatch({ type: "updateAiCode", aiCode: this.state.aiCode });

        this.setState({
            saved: true,
        });
    }
}

export default ReactRedux.connect(stateToProps)(AiPanel);