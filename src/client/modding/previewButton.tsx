import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as e from './editor.model';
import * as s from '../store.model';
import * as editing from './editing';
import * as selectors from './selectors';

interface OwnProps {
    layoutId?: string;
}
interface Props extends OwnProps {
    mod: ModTree;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const modResult = selectors.codeToMod(state.codeTree);
    return {
        ...ownProps,
        mod: modResult.mod,
    };
}

class PreviewButton extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }

    render() {
        const className = classNames({
            'btn': true,
            'btn-disabled': !this.props.mod,
        });
        return <div className={className} onClick={() => this.onPreviewClick()}>Preview</div>
    }

    private onPreviewClick() {
        editing.previewMod(this.props.mod, this.props.layoutId);
    }
}

export default ReactRedux.connect(stateToProps)(PreviewButton);