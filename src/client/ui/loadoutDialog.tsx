import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as cloud from '../core/cloud';
import * as constants from '../../game/constants';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import { isMobile } from '../userAgent';
import BuildPanel from '../profiles/buildPanel';
import ModalPanel from '../controls/modalPanel';

import './loadoutDialog.scss';

interface OwnProps {
    onClose: () => void;
}

interface Props extends OwnProps {
    keyBindings: KeyBindings;
    loadouts: m.Loadout[];
    settings: AcolyteFightSettings;
}

interface State {
    hoveringSave?: number;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        keyBindings: state.keyBindings,
        loadouts: state.loadouts,
        settings: state.room.settings,
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
            'desktop': !isMobile,
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
        const bindings: KeyBindings = this.state.hoveringSave === slot ? this.props.keyBindings : loadout && loadout.buttons;
        return <div className="loadout-slot" key={slot}>
            <div className="loadout-number">{slot + 1}</div>
            {bindings && <BuildPanel bindings={bindings} size={48} />}
            <div className="spacer" />
            <div className="loadout-slot-actions">
                {loadout && <i className="fas fa-folder-open clickable" title="Load" onClick={() => this.onLoad(loadout)} />}
                <i
                    className="fas fa-save clickable" title="Save" onClick={() => this.onSave(slot)}
                    onMouseEnter={() => this.onSaveHover(slot)}
                    onMouseLeave={() => this.onSaveHover(null)} />
            </div>
        </div>
    }

    private onLoad(loadout: m.Loadout) {
        if (!(loadout && loadout.buttons)) {
            return;
        }

        StoreProvider.dispatch({ type: "updateKeyBindings", keyBindings: loadout.buttons });
        cloud.uploadSettings(); // don't await

        this.onClose();
    }

    private onSave(slot: number) {
        const newLoadout: m.Loadout = {
            buttons: this.props.keyBindings,
        };
        const newLoadouts = [...this.props.loadouts];
        newLoadouts[slot] = newLoadout;

        StoreProvider.dispatch({ type: "loadouts", loadouts: newLoadouts });
        cloud.uploadSettings(); // don't await

        this.onClose();
    }

    private onSaveHover(slot: number) {
        this.setState({ hoveringSave: slot });
    }

    private onClose() {
        this.props.onClose();
    }
}

export default ReactRedux.connect(stateToProps)(LoadoutDialog);