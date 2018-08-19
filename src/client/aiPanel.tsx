import * as React from 'react';
import * as ai from './ai';
import * as url from './url';
import { readFileAsync } from './fileUtils';

interface Props {
    current: url.PathElements;
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
            <p>Currently, bots will be controlled by the AI code below:</p>
            <textarea className="ai-js" onChange={ev => this.setState({ code: ev.target.value })}>
                {this.state.code}
            </textarea>
            <p><div className="btn" onClick={() => this.onDetach()}>Reset to Default AI</div></p>
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
                You can override the default AI with your own AI with the form at the bottom of this page.
                This override will only last until you close this browser tab.
            </p>
            <p>
                Current limitations:
                <li>You can only play against your AI locally. An AI league is on the list for future development.</li>
                <li>Your AI cannot choose any spells - it just gets the default set. This is also on the list for future development.</li>
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
            <h2>Use your AI</h2>
            <p>Choose an AI file: <input className="file-selector" type="file" onChange={e => this.setState({ selectedFile: e.target.files.item(0) })} /></p>
            <p><div className={(this.state.loading || !this.state.selectedFile) ? "btn btn-disabled" : "btn"} onClick={() => this.onAttach()}>Override AI</div></p>
            {this.state.error && <p className="error">{this.state.error}</p>}
        </div>;
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
}