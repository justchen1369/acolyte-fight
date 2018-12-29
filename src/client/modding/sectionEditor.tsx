import _ from 'lodash';
import * as React from 'react';
import * as e from './editor.model';
import EntityList from './entityList';
import ItemEditor from './itemEditor';

interface Props {
    default: e.CodeSection;
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;

    addRemovePrefix?: string;
    renderPreview?: (id: string) => React.ReactFragment;

    selectedId: string;
    onSelected: (selectedId: string) => void;
}
interface State {
}

class SectionEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div className="json-editor">
            <EntityList
                default={this.props.default}
                section={this.props.section}
                errors={this.props.errors}
                selectedId={this.props.selectedId}
                onUpdateSelected={selectedId => this.props.onSelected(selectedId)}
                onUpdate={section => this.props.onUpdate(section)}
                addRemovePrefix={this.props.addRemovePrefix}
                />
            <ItemEditor
                selectedId={this.props.selectedId}
                default={this.props.default}
                section={this.props.section}
                errors={this.props.errors}
                onUpdate={section => this.props.onUpdate(section)}
                >
                {this.props.renderPreview && this.props.renderPreview(this.props.selectedId)}
                </ItemEditor>
        </div>
    }
}

export default SectionEditor;