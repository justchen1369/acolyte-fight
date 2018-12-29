import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as e from './editor.model';
import SectionEditor from './sectionEditor';

interface Props {
    default: e.CodeSection;
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;
    onPreview: (layoutId: string) => void;

    settings: AcolyteFightSettings;

    selectedId: string;
    onSelected: (selectedId: string) => void;
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
            renderPreview={(id) => this.renderPreview(id)}
            addRemovePrefix="map"
            onSelected={this.props.onSelected}
            selectedId={this.props.selectedId}
            />
    }

    private renderPreview(layoutId: string) {
        if (!layoutId) {
            return null;
        }

        const className = classNames({
            'btn': true,
            'btn-disabled': !this.props.settings,
        });
        return <div className={className} onClick={() => this.props.onPreview(layoutId)}>Preview</div>
    }
}

export default MapEditor;