import _ from 'lodash';
import * as React from 'react';
import * as e from './editor.model';
import SectionEditor from './sectionEditor';

interface Props {
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;

    settings: AcolyteFightSettings;
}
interface State {
}

class SpellEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <SectionEditor
            section={this.props.section}
            errors={this.props.errors}
            onUpdate={section => this.props.onUpdate(section)}
            prefix="spell"
            />
    }
}

export default SpellEditor;