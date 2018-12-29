import _ from 'lodash';
import uniqid from 'uniqid';
import classNames from 'classnames';
import * as React from 'react';
import * as Reselect from 'reselect';
import * as e from './editor.model';

interface Props {
    section: e.CodeSection;
    errors: e.ErrorSection;
    selectedId: string;
    onUpdate: (section: e.CodeSection) => void;
    onUpdateSelected: (selectedId: string) => void;

    prefix?: string;

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
                {this.renderAddRemoveButtons()}
                {this.props.children}
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

    private renderAddRemoveButtons() {
        if (this.props.prefix) {
            return <>
                <div className={this.props.selectedId ? "btn" : "btn btn-disabled"} onClick={() => this.onAddClick()}>+</div>
                <div className={this.props.selectedId ? "btn" : "btn btn-disabled"} onClick={() => this.onRemoveClick()}>-</div>
            </>
        } else {
            return null;
        }
    }

    private onAddClick() {
        if (!(this.props.prefix && this.props.selectedId)) {
            return;
        }

        const id = uniqid(`${this.props.prefix}-`);
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