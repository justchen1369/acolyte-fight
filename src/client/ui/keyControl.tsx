import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as constants from '../../game/constants';
import * as keyboardUtils from '../core/keyboardUtils';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';

interface OwnProps {
    initialKey: string;
}

interface Props extends OwnProps {
    rebindings: KeyBindings;
}

interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        rebindings: state.rebindings,
    };
}

class KeyControl extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const initialKey = this.props.initialKey;

        const rebindingLookup = keyboardUtils.getRebindingLookup(this.props.rebindings);
        const remappedKey = rebindingLookup.get(initialKey);
        const isRightClick = keyboardUtils.isRightClick(remappedKey);
        const isRebound = !!this.props.rebindings[remappedKey];

        return <div
            className="key-name-container"
            onKeyDown={(ev) => this.onKeyDown(ev)}
            onMouseDown={(ev) => this.onMouseDown(ev)}
            onContextMenu={(ev) => ev.preventDefault()}
            tabIndex={0}>

            <div className={remappedKey ? "key-name rebinding" : "key-name"}>{isRightClick ? <i className="fa fa-mouse-pointer" title="Right click" /> : remappedKey}</div>
            <div className="rebind-help">{isRebound ? "Press ESC to reset" : "Press key to rebind"}</div>
        </div>
    }

    private onMouseDown(ev: React.MouseEvent) {
        if (ev.button === 2) {
            this.rebind(w.Actions.RightClick);
        }
    }

    private onKeyDown(ev: React.KeyboardEvent) {
        const newKey = keyboardUtils.readKey(ev.nativeEvent);
        this.rebind(newKey);
    }

    private rebind(newKey: string) {
        const targetKey = this.props.initialKey;
        const rebindings = { ...this.props.rebindings };
        
        const oldKeys = Object.keys(rebindings).filter(oldKey => rebindings[oldKey] === targetKey);
        for (const oldKey of oldKeys) {
            delete rebindings[oldKey];
        }

        if (newKey && (newKey.length === 1 || keyboardUtils.isRightClick(newKey))) { // No special keys allowed
            rebindings[newKey] = targetKey;
        }

        StoreProvider.dispatch({ type: "updateRebindings", rebindings });
        Storage.saveRebindingConfig(rebindings);
    }
}

export default ReactRedux.connect(stateToProps)(KeyControl);