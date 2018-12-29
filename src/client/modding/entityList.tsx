import _ from 'lodash';
import uniqid from 'uniqid';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as s from '../store.model';
import * as editing from './editing';
import * as StoreProvider from '../storeProvider';

interface OwnProps {
    sectionKey: string;
    addRemovePrefix?: string;
}
interface Props extends OwnProps {
    codeTree: e.CodeTree;
    defaults: e.CodeSection;
    section: e.CodeSection;
    errors: e.ErrorSection;
    selectedId: string;
}
interface State {
}

const noErrors = {}; // Reuse this to keep reference equality
function stateToProps(state: s.State, ownProps: OwnProps): Props {
    const modResult = editing.codeToMod(state.codeTree);
    const defaults = editing.defaultTree[ownProps.sectionKey];
    return {
        ...ownProps,
        codeTree: state.codeTree,
        defaults,
        section: state.codeTree ? state.codeTree[ownProps.sectionKey] : defaults,
        errors: modResult.errors[ownProps.sectionKey] || noErrors,
        selectedId: state.current.hash,
    };
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
        const codeTree = this.props.codeTree;
        if (!codeTree) {
            return null;
        }

        return <div className="entity-panel">
            <div className="entity-list">
                {this.idSelector(this.props.section).map(id => this.renderOption(id))}
            </div>
            <div className="button-row">
                {this.renderAddButton()}
                {this.renderRemoveButton()}
            </div>
        </div>;
    }

    private renderOption(id: string) {
        const isModded = this.props.section[id] !== this.props.defaults[id];
        const className = classNames({
            'entity-list-item': true,
            'selected': id === this.props.selectedId,
            'modded': isModded,
            'unmodded': !isModded,
            'error': id in this.props.errors,
        });
        return <div
            key={id}
            className={className}
            onMouseDown={() => editing.updateSelected(id)}
            >{id}</div>
    }

    private renderAddButton() {
        if (!this.props.addRemovePrefix) {
            return null;
        }

        const selectedId = this.props.selectedId;
        const disabled = !selectedId;
        const className = classNames({ 'btn': true, 'btn-disabled': disabled });
        return <div className={className} title="Add new" onClick={() => !disabled && this.onAddClick()}><i className="fas fa-plus" /></div>
    }

    private renderRemoveButton() {
        if (!this.props.addRemovePrefix) {
            return null;
        }

        const selectedId = this.props.selectedId;
        const undeletable = selectedId && (selectedId in this.props.defaults);
        const disabled = undeletable || !selectedId;
        const className = classNames({ 'btn': true, 'btn-disabled': disabled });
        return <div className={className} title="Remove" onClick={() => !disabled && this.onRemoveClick()}><i className="fas fa-trash" /></div>;
    }

    private onAddClick() {
        if (!(this.props.addRemovePrefix && this.props.selectedId)) {
            return;
        }

        const id = uniqid(`${this.props.addRemovePrefix}-`);
        let code = this.props.section[this.props.selectedId];

        let json: e.Entity;
        try {
            json = JSON.parse(code);
            json.id = id;
        } catch {
            json = { id };
        }

        code = editing.stringify(json);

        editing.updateItem(this.props.sectionKey, id, code);
        editing.updateSelected(id);
    }
    
    private onRemoveClick() {
        if (!(this.props.selectedId)) {
            return;
        }

        editing.deleteItem(this.props.sectionKey, this.props.selectedId);
        editing.updateSelected(null);
    }
}

export default ReactRedux.connect(stateToProps)(EntityList);