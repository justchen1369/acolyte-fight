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

export enum LoadoutDialogMode {
    Load,
    Save,
}

interface OwnProps {
    mode: LoadoutDialogMode;
    onClose: () => void;
}

interface Props extends OwnProps {
    keyBindings: KeyBindings;
    loadouts: m.Loadout[];
    settings: AcolyteFightSettings;
    touched: boolean;
}

interface State {
    hoveringSlot?: number;
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
        this.state = {};
    }

    render() {
        const className = classNames({
            'loadouts-dialog': true,
            'desktop': !this.props.touched,
        });

        const slots = new Array<React.ReactNode>();
        for (let i = 0; i < constants.MaxLoadouts; ++i) {
            slots.push(this.renderSlot(i));
        }

        return <ModalPanel title={this.renderTitle()} className={className} onClose={() => this.onClose()}>
            {this.renderCaption()}
            {slots}
        </ModalPanel>
    }

    private renderTitle() {
        switch (this.props.mode) {
            case LoadoutDialogMode.Load: return <span><i className="fas fa-folder-open"/> Open Loadout</span>
            case LoadoutDialogMode.Save: return <span><i className="fas fa-save" /> Save Loadout</span>
            default: return "Loadouts";
        }
    }

    private renderCaption() {
        switch (this.props.mode) {
            case LoadoutDialogMode.Load: return <p className="loadouts-dialog-caption">Choose a slot to load:</p>
            case LoadoutDialogMode.Save: return <p className="loadouts-dialog-caption">Choose a slot to save to:</p>
            default: return null;
        }
    }

    private renderSlot(slot: number) {
        const mode = this.props.mode;
        const loadout = this.props.loadouts[slot];

        let bindings: KeyBindings = loadout && loadout.buttons;
        if (this.state.hoveringSlot === slot) {
            if (mode === LoadoutDialogMode.Save) {
                bindings = this.props.keyBindings;
            }
        }

        return <div
            className="loadout-slot"
            key={slot}
            onMouseEnter={() => this.onSlotHover(slot)}
            onMouseLeave={() => this.onSlotHover(null)}
            onMouseDown={() => this.onSlotClick(slot)}
            >

            <LoadoutNumber>{slot + 1}</LoadoutNumber>
            {bindings && <BuildPanel bindings={bindings} size={48} />}
        </div>
    }

    private onSlotClick(slot: number) {
        const mode = this.props.mode;
        if (mode === LoadoutDialogMode.Load) {
            const loadout = this.props.loadouts[slot];
            this.onLoad(loadout);
        } else if (mode === LoadoutDialogMode.Save) {
            this.onSave(slot);
        }
    }

    private onLoad(loadout: m.Loadout) {
        if (!(loadout && loadout.buttons)) {
            return;
        }

        keyboardUtils.updateKeyBindings(loadout.buttons);

        this.onClose();
    }


    private onTrash(slot: number) {
        const newLoadouts = [...this.props.loadouts];
        newLoadouts[slot] = null;

        keyboardUtils.updateLoadouts(newLoadouts);
    }

    private onSave(slot: number) {
        const newLoadout: m.Loadout = {
            buttons: this.props.keyBindings,
        };
        const newLoadouts = [...this.props.loadouts];
        newLoadouts[slot] = newLoadout;

        keyboardUtils.updateLoadouts(newLoadouts);

        this.onClose();
    }

    private onSlotHover(slot: number) {
        this.setState({ hoveringSlot: slot });
    }

    private onClose() {
        this.props.onClose();
    }
}

export const LoadoutDialog = ReactRedux.connect(stateToProps)(_LoadoutDialog);