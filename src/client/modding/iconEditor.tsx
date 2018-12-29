import _ from 'lodash';
import * as React from 'react';
import * as e from './editor.model';
import SectionEditor from './sectionEditor';
import SpellIcon from '../controls/spellIcon';

interface Props {
    default: e.CodeSection;
    section: e.CodeSection;
    errors: e.ErrorSection;
    onUpdate: (section: e.CodeSection) => void;

    settings: AcolyteFightSettings;
}
interface State {
}

class IconEditor extends React.PureComponent<Props, State> {
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
            renderPreview={id => this.renderIconPreview(id)}
            prefix="icon"
            />
    }

    private renderIconPreview(id: string): JSX.Element {
        const settings = this.props.settings;
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