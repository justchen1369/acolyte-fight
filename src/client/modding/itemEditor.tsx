import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as e from './editor.model';
import CodeEditor from './codeEditor';

interface Props {
    code: string;
    error: string;
    onUpdate: (code: string) => void;
}
interface State {
    saved: boolean;
}

class ItemEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            saved: false,
        };
    }

    render() {
        return <div className="code-panel">
            {this.renderCodeEditor()}
            <div className="editor-actions">
                {this.renderStatus()}
                <div className="spacer"></div>
            </div>
        </div>
    }

    private renderStatus() {
        if (this.props.error) {
            return <div className="editor-status error">{this.props.error}</div>;
        } else if (this.state.saved) {
            return <div className="editor-status">Saved</div>;
        } else {
            return null;
        }
    }

    private renderCodeEditor() {
        return <CodeEditor key="code" code={this.props.code} onChange={(code) => this.onCodeChange(code)} />
    }

    private onCodeChange(code: string) {
        this.applyUpdate(code);
    }

    private applyUpdate(code: string) {
        this.props.onUpdate(code);
    }
}

export default ItemEditor;