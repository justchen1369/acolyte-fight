import * as React from 'react';
import * as ai from '../core/ai';
import * as parties from '../core/parties';
import * as url from '../core/url';
import { readFileAsync } from '../core/fileUtils';

interface Props {
    current: url.PathElements;
    allowBots: boolean;
}
interface State {
    loading: boolean;
    code: string;
    error: string;
    selectedFile: File;
}

export class AiPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            loading: false,
            code: ai.getCode(),
            error: null,
            selectedFile: null,
        };
    }

    render() {
        return <div>
            <h1>AI (EXPERIMENTAL)</h1>
            {this.state.code ? this.renderAttached() : this.renderDetached()}
        </div>;
    }

    private renderAttached() {
        return <div>
            <p>Currently, your Acolyte will be controlled by the AI code below:</p>
            <textarea className="ai-js" readOnly>
                {this.state.code}
            </textarea>
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
            {this.props.allowBots ? this.renderStartAutopilotForm() : this.renderCreateRoom()}
        </div>;
    }
    
    private renderCreateRoom() {
        return <div>
            <h2>Create AI room</h2>
            <p>
                AI programming is only allowed within certain private rooms.
                Click the button below to create a room that allows bots.
                You can join the room from another browser tab to play against your AI.</p>
            <p><div className={this.state.loading ? "btn btn-disabled" : "btn"} onClick={() => this.onCreateAIRoom()}>Create AI room</div></p>
            {this.state.error && <p className="error">{this.state.error}</p>}
        </div>;
    }

    private renderStartAutopilotForm() {
        return <div>
            <h2>Use your AI</h2>
            <p>Autopilot your Acolyte with an AI. This override will only last until you close this browser tab.</p>
            <p>Choose an AI file: <input className="file-selector" type="file" onChange={e => this.setState({ selectedFile: e.target.files.item(0) })} /></p>
            <p><div className={(this.state.loading || !this.state.selectedFile) ? "btn btn-disabled" : "btn"} onClick={() => this.onAttach()}>Activate Autopilot</div></p>
            {this.state.error && <p className="error">{this.state.error}</p>}
        </div>
    }

    private onAttach() {
        this.setState({ loading: true });
        readFileAsync(this.state.selectedFile)
            .then(code => {
                ai.overwriteAI(code);
                this.setState({ code, loading: false });
            });
        ;
    }

    private onDetach() {
        ai.resetAI();
        this.setState({ loading: false, code: null });
    }

    private onCreateAIRoom() {
        this.setState({ loading: true });
        parties.createRoom({}, true, this.props.current, this.props.current.page); // Return to this page
    }
}