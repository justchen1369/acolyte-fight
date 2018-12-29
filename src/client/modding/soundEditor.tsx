import _ from 'lodash';
import * as React from 'react';
import * as e from './editor.model';
import EntityList from './entityList';
import ItemEditor from './itemEditor';

interface Props {
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;

    settings: AcolyteFightSettings;
}
interface State {
    selectedId: string;
}

class SoundEditor extends React.PureComponent<Props, State> {
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
                onUpdateSelected={selectedId => this.setState({ selectedId })}
                onUpdate={section => this.props.onUpdate(section)}
                prefix="sound"
                />
            <ItemEditor
                selectedId={this.state.selectedId}
                section={this.props.section}
                errors={this.props.errors}
                onUpdate={section => this.props.onUpdate(section)}>
            </ItemEditor>
        </div>
    }
}

export default SoundEditor;