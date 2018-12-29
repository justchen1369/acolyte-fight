import _ from 'lodash';
import * as React from 'react';
import * as e from './editor.model';
import EntityList from './entityList';
import ItemEditor from './itemEditor';

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
            <EntityList
                section={this.props.section}
                errors={this.props.errors}
                selectedId={this.state.selectedId}
                onUpdateSelected={selectedId => this.setState({ selectedId })} />
            <ItemEditor
                selectedId={this.state.selectedId}
                section={this.props.section}
                errors={this.props.errors}
                onUpdate={section => this.props.onUpdate(section)}
                />
        </div>
    }
}

export default SectionEditor;