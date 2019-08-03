import * as React from 'react';
import CodeFlask from 'codeflask';

interface Props {
    code: string;
    onChange?: (code: string) => void;
}

export class CodeEditor extends React.PureComponent<Props> {
    private editor: CodeFlask;
    private el: HTMLElement;
    private code: string;

    constructor(props: Props) {
        super(props);
        this.code = props.code;
    }

    render() {
        return <div key="code-area" className="code-area" ref={(el) => this.onRef(el)}></div>
    }

    componentWillReceiveProps(newProps: Props) {
        if (newProps.code !== this.props.code) {
            if (this.editor && this.code !== newProps.code) {
                this.code = newProps.code;
                this.editor.updateCode(newProps.code);
            }
        }
    }

    private onRef(el: HTMLElement) {
        if (!el || el === this.el) {
            return;
        }
        this.el = el;

        this.editor = null;
        if (this.el) {
            this.editor = new CodeFlask(this.el, {
                language: "javascript",
                readonly: !this.props.onChange,
            });
            this.editor.updateCode(this.code);
            this.editor.onUpdate(code => this.onChange && this.onChange(code));
        }
    }

    private onChange(code: string) {
        if (code !== this.code) {
            this.code = code;
            this.props.onChange(code);
        }
    }
}

export default CodeEditor;