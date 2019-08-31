import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as convert from './convert';
import * as editing from './editing';
import * as storage from '../storage';
import * as StoreProvider from '../storeProvider';

interface Props {
    codeTree: e.CodeTree;
    roomId: string;
    roomMod: ModTree;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        roomId: state.room.id,
        roomMod: state.room.mod,
        codeTree: state.codeTree,
    };
}

class ModLoader extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    componentDidMount() {
        if (!this.props.codeTree) {
            this.loadMod();
        }
    }

    private async loadMod() {
        try {
            const mod = await this.findMod();
            StoreProvider.dispatch({ type: "updateCodeTree", codeTree: convert.modToCode(mod) });
        } catch (exception) {
            console.error("Error loading mod", exception);
        }
    }

    private async findMod() {
        if (this.props.roomId !== m.DefaultRoomId && Object.keys(this.props.roomMod).length > 0) {
            return this.props.roomMod;
        }

        const autoSaved = await storage.loadMod();
        if (autoSaved && autoSaved.mod) {
            return autoSaved.mod;
        }

        return null;
    }

    render(): React.ReactNode {
        return null;
    }
}

export default ReactRedux.connect(stateToProps)(ModLoader);