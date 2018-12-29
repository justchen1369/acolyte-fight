import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as e from './editor.model';
import * as s from '../store.model';
import * as selectors from './selectors';
import SectionEditor from './sectionEditor';
import SpellIcon from '../controls/spellIcon';

interface Props {
    settings: AcolyteFightSettings;
    selectedId: string;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const settings = selectors.codeTreeToSettings(state.codeTree);
    return {
        settings,
        selectedId: state.current.hash,
    };
}

class IconEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <SectionEditor sectionKey="icons" addRemovePrefix="icon">
            {this.renderIconPreview(this.props.selectedId)}
        </SectionEditor>
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

export default ReactRedux.connect(stateToProps)(IconEditor);