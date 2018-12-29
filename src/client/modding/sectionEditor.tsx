import _ from 'lodash';
import * as React from 'react';
import * as e from './editor.model';
import EntityList from './entityList';
import ItemEditor from './itemEditor';

interface Props {
    sectionKey: string;
    addRemovePrefix?: string;
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
            <EntityList sectionKey={this.props.sectionKey} addRemovePrefix={this.props.addRemovePrefix} />
            <ItemEditor sectionKey={this.props.sectionKey}>{this.props.children}</ItemEditor>
        </div>
    }
}

export default SectionEditor;