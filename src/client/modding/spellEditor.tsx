import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as e from './editor.model';
import PreviewButton from './previewButton';
import SectionEditor from './sectionEditor';

interface Props {
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
        return <SectionEditor sectionKey="spells" addRemovePrefix="spell">
            <PreviewButton />
        </SectionEditor>
    }
}

export default SpellEditor;