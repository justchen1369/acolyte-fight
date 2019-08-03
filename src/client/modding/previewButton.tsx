import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as e from './editor.model';
import * as s from '../store.model';
import * as editing from './editing';

interface OwnProps {
    layoutId?: string;
}
interface Props extends OwnProps {
    mod: ModTree;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        mod: state.mod,
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
        return <div className={className} onClick={() => this.onPreviewClick()}>{this.props.children}</div>
    }

    private onPreviewClick() {
        editing.previewMod(this.props.mod, this.props.layoutId);
    }
}

export default ReactRedux.connect(stateToProps)(PreviewButton);