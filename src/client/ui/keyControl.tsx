import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
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

        return <div className="key-name-container" onKeyDown={(ev) => this.onKeyDown(ev)} tabIndex={0}>
            <div className={remappedKey ? "key-name rebinding" : "key-name"}>{isRightClick ? <i className="fa fa-mouse-pointer" title="Right click" /> : remappedKey}</div>
            <div className="rebind-help">{isRebound ? "Press ESC to reset" : "Press key to rebind"}</div>
        </div>
    }

    private onKeyDown(ev: React.KeyboardEvent) {
        const targetKey = this.props.initialKey;

        const newKey = keyboardUtils.readKey(ev.nativeEvent);
        const rebindings = { ...this.props.rebindings };
        
        const oldKeys = Object.keys(rebindings).filter(oldKey => rebindings[oldKey] === targetKey);
        for (const oldKey of oldKeys) {
            delete rebindings[oldKey];
        }

        if (newKey && newKey.length === 1) { // No special keys allowed
            rebindings[newKey] = targetKey;
        }

        StoreProvider.dispatch({ type: "updateRebindings", rebindings });
        Storage.saveRebindingConfig(rebindings);
    }
}

export default ReactRedux.connect(stateToProps)(KeyControl);