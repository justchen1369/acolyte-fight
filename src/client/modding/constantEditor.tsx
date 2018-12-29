import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as e from './editor.model';
import EditorPage from './editorPage';
import PreviewButton from './previewButton';
import SectionEditor from './sectionEditor';

interface Props {
}
interface State {
}

class ConstantEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <EditorPage expand={true}>
            <SectionEditor sectionKey="constants">
                <PreviewButton />
            </SectionEditor>
        </EditorPage>
    }
}

export default ConstantEditor;