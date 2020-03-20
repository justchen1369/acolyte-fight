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

enum LoadoutAction {
    Load,
    Save,
    Trash,
}

interface OwnProps {
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
    hoveringAction?: LoadoutAction;
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

class LoadoutDialog extends React.PureComponent<Props, State> {
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
        return <ModalPanel title="Your Saved Loadouts" className={className} onClose={() => this.onClose()}>
            {slots}
        </ModalPanel>
    }

    private renderSlot(slot: number) {
        const loadout = this.props.loadouts[slot];

        let bindings: KeyBindings = loadout && loadout.buttons;
        if (this.state.hoveringSlot === slot) {
            if (this.state.hoveringAction === LoadoutAction.Save) {
                bindings = this.props.keyBindings;
            } else if (this.state.hoveringAction === LoadoutAction.Trash) {
                bindings = null;
            }
        }

        return <div
            className="loadout-slot"
            key={slot}
            onMouseEnter={() => this.onSlotHover(slot)}
            onMouseLeave={() => this.onSlotHover(null)}
            >

            <LoadoutNumber>{slot + 1}</LoadoutNumber>
            {bindings && <BuildPanel bindings={bindings} size={48} />}
            <div className="spacer" />
            <div className="loadout-slot-actions">
                {loadout && <i className="fas fa-folder-open clickable" title="Load" onMouseDown={() => this.onLoad(loadout)}  onMouseEnter={() => this.onActionHover(LoadoutAction.Load)} onMouseLeave={() => this.onActionHover(null)} />}
                {loadout && <i className="fas fa-trash clickable" title="Clear" onMouseDown={() => this.onTrash(slot)}  onMouseEnter={() => this.onActionHover(LoadoutAction.Trash)} onMouseLeave={() => this.onActionHover(null)} />}
                <i className="fas fa-save clickable" title="Save" onMouseDown={() => this.onSave(slot)} onMouseEnter={() => this.onActionHover(LoadoutAction.Save)} onMouseLeave={() => this.onActionHover(null)} />
            </div>
        </div>
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

    private onActionHover(action: LoadoutAction) {
        this.setState({ hoveringAction: action });
    }

    private onClose() {
        this.props.onClose();
    }
}

export default ReactRedux.connect(stateToProps)(LoadoutDialog);