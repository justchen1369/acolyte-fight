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

// TODO: codeUrl = `data:text/javascript;base64,${btoa(code)}`

export class AiPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            loading: false,
            code: null, // TODO
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
            <p>All games will be controlled by the AI code below:</p>
            <textarea className="ai-js" onChange={ev => this.setState({ code: ev.target.value })}>
                {this.state.code}
            </textarea>
            <p><div className="btn" onClick={() => this.onDetach()}>Stop AI</div></p>
        </div>;
    }

    private renderDetached() {
        return <div>
            <p>
                Program a bot for this game!
                <ul>
                    <li><a href="static/acolytefight.ai.js" target="_blank">acolytefight.ai.js</a></li>
                </ul>
            </p>
            <p>Choose an AI file: <input className="file-selector" type="file" onChange={e => this.setState({ selectedFile: e.target.files.item(0) })} /></p>
            <p><div className={(this.state.loading || !this.state.selectedFile) ? "btn btn-disabled" : "btn"} onClick={() => this.onAttach()}>Start AI</div></p>
            {this.state.error && <p className="error">{this.state.error}</p>}
        </div>;
    }

    private onAttach() {
        this.setState({ loading: true });
        readFileAsync(this.state.selectedFile)
            .then(code => {
                // ai.attach(code) // TODO
                this.setState({ code, loading: false });
            });
        ;
    }

    private onDetach() {
        // ai.detach(); // TODO
        this.setState({ loading: false, code: null });
    }
}