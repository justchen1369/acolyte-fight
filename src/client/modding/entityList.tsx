import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as Reselect from 'reselect';
import * as e from './editor.model';

interface Props {
    section: e.CodeSection;
    errors: e.ErrorSection;
    selectedId: string;
    onUpdateSelected: (selectedId: string) => void;
}
interface State {
}

class EntityList extends React.PureComponent<Props, State> {
    private idSelector = Reselect.createSelector(
        (section: e.CodeSection) => section,
        (section) => {
            return _.orderBy(Object.keys(section));
        }
    );

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedId: null,
        };
    }

    render() {
        return <div className="entity-panel">
            <div className="entity-list">
                {this.idSelector(this.props.section).map(id => this.renderOption(id))}
            </div>
            <div className="editor-actions">
                <div className="spacer"></div>
            </div>
        </div>;
    }

    private renderOption(id: string) {
        const className = classNames({
            'entity-list-item': true,
            'selected': id === this.props.selectedId,
            'error': id in this.props.errors,
        });
        return <div
            key={id}
            className={className}
            onMouseDown={() => this.props.onUpdateSelected(id)}
            >{id}</div>
    }
}

export default EntityList;