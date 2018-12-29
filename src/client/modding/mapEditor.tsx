import _ from 'lodash';
import * as React from 'react';
import * as e from './editor.model';
import SectionEditor from './sectionEditor';

interface Props {
    default: e.CodeSection;
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;
}
interface State {
}

class MapEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <SectionEditor
            default={this.props.default}
            section={this.props.section}
            errors={this.props.errors}
            onUpdate={section => this.props.onUpdate(section)}
            prefix="map"
            />
    }
}

export default MapEditor;