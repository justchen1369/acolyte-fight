import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as e from './editor.model';
import CodeEditor from './codeEditor';

interface Props {
    selectedId: string;
    default: e.CodeSection;
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
            <div className="editor-actions button-row">
                {this.renderRevertButton()}
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

    private renderRevertButton() {
        const selectedId = this.props.selectedId;
        if (!selectedId) {
            return null;
        }

        const hasDefault = selectedId in this.props.default;
        const isModded = this.props.section[selectedId] !== this.props.default[selectedId];
        const disabled = !(selectedId && hasDefault && isModded);
        const className = classNames({ 'btn': true, 'btn-disabled': disabled });
        return <div className={className} title="Revert to default settings" onClick={() => !disabled && this.onRevertClick()}><i className="fas fa-history" /></div>;
    }

    private onRevertClick() {
        const selectedId = this.props.selectedId;
        if (!(selectedId)) {
            return;
        }

        const section: e.CodeSection = {
            ...this.props.section,
        };
        delete section[selectedId];

        if (selectedId in this.props.default) {
            section[selectedId] = this.props.default[selectedId];
        }

        this.props.onUpdate(section);
    }

}

export default ItemEditor;