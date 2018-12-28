import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import ItemEditor from './itemEditor';

const idSelector = Reselect.createSelector(
    (section: e.CodeSection) => section,
    (section) => {
        return _.orderBy(Object.keys(section));
    }
);

interface Props {
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;
}
interface State {
    selectedId: string;
}

class SectionEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedId: null,
        };
    }

    render() {
        return <div className="json-editor">
            <div className="entity-panel">
                {this.renderEntityList()}
                <div className="editor-actions">
                    <div className="spacer"></div>
                </div>
            </div>
            {this.renderItemEditor()}
        </div>
    }

    private renderEntityList() {
        return <div className="entity-list">
            {idSelector(this.props.section).map(id => this.renderOption(id))}
        </div>
    }

    private renderOption(id: string) {
        const className = classNames({
            'entity-list-item': true,
            'selected': id === this.state.selectedId,
            'error': id in this.props.errors,
        });
        return <div
            key={id}
            className={className}
            onMouseDown={() => this.setState({ selectedId: id })}
            >{id}</div>
    }

    private renderItemEditor() {
        const id = this.state.selectedId;
        if (id) {
            const error = this.props.errors[id];
            const code = this.props.section[id] || "";
            return <ItemEditor
                code={code}
                onUpdate={(code) => this.onCodeChange(id, code)}
                error={error}
                />;
        } else {
            return <div className="code-area"></div>;
        }
    }

    private onCodeChange(id: string, code: string) {
        const section = { ...this.props.section };
        section[id] = code;

        this.props.onUpdate(section);
    }
}

export default SectionEditor;