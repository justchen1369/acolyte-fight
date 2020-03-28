import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as constants from '../../game/constants';
import * as keyboardUtils from '../core/keyboardUtils';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import BuildPanel from '../profiles/buildPanel';
import LoadoutNumber from '../controls/loadoutNumber';
import ModalPanel from '../controls/modalPanel';

import './loadoutDialog.scss';

interface OwnProps {
    saving: boolean;
    onClose: () => void;
}

interface Props extends OwnProps {
    keyBindings: KeyBindings;
    loadouts: m.Loadout[];
    settings: AcolyteFightSettings;
    touched: boolean;
}

interface State {
    loadouts: m.Loadout[];
    hoveringSlot?: number;
    hoveringTrash?: number;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        keyBindings: state.keyBindings,
        loadouts: state.loadouts,
        settings: state.room.settings,
        touched: state.touched,
    };
}

class _LoadoutDialog extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            loadouts: props.loadouts,
        };
    }

    render() {
        const className = classNames({
            'loadouts-dialog': true,
            'desktop': !this.props.touched,
            'loadouts-dialog-saving': this.props.saving,
        });

        const slots = new Array<React.ReactNode>();
        for (let i = 0; i < constants.MaxLoadouts; ++i) {
            slots.push(this.renderSlot(i));
        }

        return <ModalPanel title={this.renderTitle()} className={className} onClose={() => this.onClose()}>
            {this.renderCaption()}
            {slots}
            {this.renderActionRow()}
        </ModalPanel>
    }

    private renderTitle() {
        if (this.props.saving) {
            return <span><i className="fas fa-save" /> Save Loadout</span>;
        } else {
            return <span><i className="fas fa-folder-open"/> Open Loadout</span>;
        }
    }

    private renderCaption() {
        if (this.props.saving) {
            return <p className="loadouts-dialog-caption">Choose a slot to save to:</p>
        } else {
            return <p className="loadouts-dialog-caption">Choose a slot to load:</p>;
        }
    }

    private renderActionRow() {
        if (this.props.saving) {
            return <div className="loadouts-dialog-action-row">
                <div className="spacer" />
                <div className="link-btn" onClick={() => this.onClose()}>Cancel</div>
                <div className="btn" onClick={() => this.onSave()}>Save</div>
            </div>
        } else {
            return null;
        }
    }

    private renderSlot(slot: number) {
        const loadout = this.state.loadouts[slot];
        const changed = loadout !== this.props.loadouts[slot]

        let bindings: KeyBindings = loadout && loadout.buttons;

        if (this.state.hoveringSlot === slot) {
            if (this.props.saving) {
                bindings = this.props.keyBindings;
            }
            if (this.state.hoveringTrash === slot) {
                bindings = null;
            }
        }

        let name: string = loadout && loadout.name;
        if (_.isNil(name)) {
            // Want to preserve empty string but it is falsey, so specifically check for null/undefined
            name = keyboardUtils.defaultLoadoutName(slot);
        }

        const className = classNames({
            'loadout-slot': true,
            'loadout-slot-changed': changed,
        });
        return <div
            className={className}
            key={slot}
            onMouseEnter={() => this.onSlotHover(slot)}
            onMouseLeave={() => this.onSlotHover(null)}
            onMouseDown={() => this.onSlotClick(slot, name, bindings)}
            >

            {this.renderNumber(slot)}
            {bindings && <BuildPanel bindings={bindings} size={48} />}
            {bindings && <input
                type="text" className="loadout-slot-name" value={name}
                onKeyDown={ev => this.onSlotNameKeyDown(ev)}
                onMouseDown={ev => this.onSlotNameClick(ev, slot, name, bindings)}
                onChange={ev => this.onSlotChange(slot, ev.target.value, bindings)}
                />}
        </div>
    }

    private renderNumber(slot: number) {
        const trashEnabled = !this.props.touched;
        const className = classNames({
            'loadout-slot-number-container': true,
            'loadout-trash-enabled': trashEnabled,
        });
        return <div className={className}>
            <LoadoutNumber>{slot + 1}</LoadoutNumber>
            {trashEnabled && <i
                className="fas fa-trash loadout-slot-trash-btn link-icon"
                title="Clear"
                onMouseDown={(ev) => this.onTrash(ev, slot)}
                onMouseEnter={() => this.setState({ hoveringTrash: slot })}
                onMouseLeave={() => this.setState({ hoveringTrash: null })}
                />}
        </div>
    }

    private onSlotClick(slot: number, name: string, bindings: KeyBindings) {
        if (this.props.saving) {
            // Need to explicitly save loadouts because the state doesn't update synchronously
            const loadouts = this.update(slot, name, bindings);

            if (!this.props.touched) { // On mobile, require clicking the "Save" button for clarity
                this.onSave(loadouts);
            }
        } else {
            if (bindings) {
                this.load(bindings);
                this.onSave();
            }
        }
    }

    private onSlotNameClick(ev: React.SyntheticEvent, slot: number, name: string, bindings: KeyBindings) {
        ev.stopPropagation(); // Stop the dialog closing when changing the name
        this.update(slot, name, bindings);
    }

    private onSlotChange(slot: number, name: string, bindings: KeyBindings) {
        this.update(slot, name, bindings);
    }

    private onSlotNameKeyDown(ev: React.KeyboardEvent) {
        if (ev.keyCode === 13) {
            this.onSave();
        }
    }

    private load(bindings: KeyBindings) {
        keyboardUtils.updateKeyBindings(bindings);
    }

    private update(slot: number, name: string, bindings: KeyBindings) {
        const loadouts = [...this.state.loadouts];
        if (bindings) {
            loadouts[slot] = { name: name, buttons: bindings };
        } else {
            loadouts[slot] = null;
        }
        this.setState({ loadouts });
        return loadouts;
    }

    private onTrash(ev: React.MouseEvent, slot: number) {
        ev.stopPropagation();
        this.update(slot, null, null);
    }

    private onSlotHover(slot: number) {
        this.setState({ hoveringSlot: slot });
    }

    private onClose() {
        this.props.onClose();
    }

    private onSave(loadouts?: m.Loadout[]) {
        keyboardUtils.updateLoadouts(loadouts || this.state.loadouts);
        this.props.onClose();
    }
}

export const LoadoutDialog = ReactRedux.connect(stateToProps)(_LoadoutDialog);

export default LoadoutDialog;