import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as e from './editor.model';
import CodeEditor from './codeEditor';

interface Props {
    selectedId: string;
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;
    children?: React.ReactFragment;
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
        const id = this.props.selectedId;
        if (id) {
            const error = this.props.errors[id];
            const code = this.props.section[id] || "";
            return this.renderItemEditor(id, code, error);
        } else {
            return <div className="code-area"></div>;
        }
    }

    private renderItemEditor(id: string, code: string, error: string) {
        return <div className="code-panel">
            <CodeEditor key="code" code={code} onChange={(code) => this.onCodeChange(id, code)} />
            <div className="editor-actions">
                {this.renderStatus(error)}
                <div className="spacer"></div>
                {this.props.children}
            </div>
        </div>
    }

    private renderStatus(error: string) {
        if (error) {
            return <div className="editor-status error">{error}</div>;
        } else {
            return null;
        }
    }

    private onCodeChange(id: string, code: string) {
        const section = { ...this.props.section };
        section[id] = code;

        this.props.onUpdate(section);
    }
}

export default ItemEditor;