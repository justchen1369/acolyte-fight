import _ from 'lodash';
import uniqid from 'uniqid';
import classNames from 'classnames';
import * as React from 'react';
import * as Reselect from 'reselect';
import * as e from './editor.model';

interface Props {
    default: e.CodeSection;
    section: e.CodeSection;
    errors: e.ErrorSection;
    selectedId: string;
    onUpdate: (section: e.CodeSection) => void;
    onUpdateSelected: (selectedId: string) => void;

    addRemovePrefix?: string;

    children?: React.ReactFragment;
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
            <div className="button-row">
                {this.renderAddButton()}
                {this.renderRemoveButton()}
                {this.props.children}
            </div>
        </div>;
    }

    private renderOption(id: string) {
        const isModded = this.props.section[id] !== this.props.default[id];
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
            onMouseDown={() => this.props.onUpdateSelected(id)}
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
        const undeletable = selectedId && (selectedId in this.props.default);
        const disabled = undeletable || !selectedId;
        const className = classNames({ 'btn': true, 'btn-disabled': disabled });
        return <div className={className} title="Remove" onClick={() => !disabled && this.onRemoveClick()}><i className="fas fa-trash" /></div>;
    }

    private onAddClick() {
        if (!(this.props.addRemovePrefix && this.props.selectedId)) {
            return;
        }

        const id = uniqid(`${this.props.addRemovePrefix}-`);
        const code = this.props.section[this.props.selectedId];

        let json: e.Entity;
        try {
            json = JSON.parse(code);
            json.id = id;
        } catch {
            json = { id };
        }

        const section: e.CodeSection = {
            ...this.props.section,
            [id]: JSON.stringify(json, null, "\t"),
        };

        this.props.onUpdate(section);
        this.props.onUpdateSelected(id);
    }
    
    private onRemoveClick() {
        if (!(this.props.selectedId)) {
            return;
        }

        const section: e.CodeSection = {
            ...this.props.section,
        };
        delete section[this.props.selectedId];
        this.props.onUpdate(section);
        this.props.onUpdateSelected(null);
    }
}

export default EntityList;