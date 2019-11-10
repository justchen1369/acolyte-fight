import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as e from './editor.model';
import * as s from '../store.model';
import * as editing from './editing';
import EditorPage from './editorPage';
import PreviewButton from './previewButton';
import SectionEditor from './sectionEditor';

interface Props {
    settings: AcolyteFightSettings;
    selectedId: string;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        settings: editing.modToSettings(state.mod),
        selectedId: state.current.hash,
    };
}

class MapEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <EditorPage expand={true}>
            <SectionEditor sectionKey="maps" addRemovePrefix="map">
                {this.renderPreview()}
            </SectionEditor>
        </EditorPage>
    }

    private renderPreview() {
        if (this.props.settings && this.props.selectedId && this.props.selectedId in this.props.settings.Layouts) {
            return <PreviewButton layoutId={this.props.selectedId}><i className="fas fa-sword" /> Preview Map</PreviewButton>;
        } else {
            return null;
        }
    }
}

export default ReactRedux.connect(stateToProps)(MapEditor);