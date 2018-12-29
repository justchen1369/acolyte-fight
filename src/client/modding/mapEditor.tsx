import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as e from './editor.model';
import * as s from '../store.model';
import * as editing from './editing';
import PreviewButton from './previewButton';
import SectionEditor from './sectionEditor';

interface Props {
    settings: AcolyteFightSettings;
    selectedId: string;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const settings = editing.codeToSettings(state.codeTree);
    return {
        settings,
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
        const layoutExists = this.props.selectedId && (this.props.selectedId in this.props.settings.Layouts);
        return <SectionEditor sectionKey="maps" addRemovePrefix="map">
            {layoutExists && <PreviewButton layoutId={this.props.selectedId} />}
        </SectionEditor>
    }
}

export default ReactRedux.connect(stateToProps)(MapEditor);