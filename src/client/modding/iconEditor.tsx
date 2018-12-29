import _ from 'lodash';
import * as React from 'react';
import * as e from './editor.model';
import EntityList from './entityList';
import ItemEditor from './itemEditor';
import SpellIcon from '../ui/spellIcon';

interface Props {
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;

    settings: AcolyteFightSettings;
}
interface State {
    selectedId: string;
}

class IconEditor extends React.PureComponent<Props, State> {
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
                onUpdate={section => this.props.onUpdate(section)}>
                {this.renderIconPreview(this.state.selectedId, this.props.settings)}
            </ItemEditor>
        </div>
    }

    private renderIconPreview(id: string, settings: AcolyteFightSettings): JSX.Element {
        if (!settings) {
            return null;
        }

        const icon = settings.Icons[id];
        if (icon && icon.path) {
            try {
                const path = new Path2D(icon.path);
                return <SpellIcon
                    icon={path}
                    color="#0088ff"
                    size={64}
                />;
            } catch (exception) {
                console.error("Failed to render icon", exception);
                return <div className="editor-status error">{`${exception}`}</div>;
            }
        } else {
            return null;
        }
    }
}

export default IconEditor;