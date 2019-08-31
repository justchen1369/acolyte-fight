import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as convert from './convert';
import * as e from './editor.model';
import * as s from '../store.model';
import * as editing from './editing';
import * as StoreProvider from '../storeProvider';

interface Props {
    codeTree: e.CodeTree;
    modBuiltFrom: e.CodeTree;
    mod: ModTree;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        codeTree: state.codeTree,
        modBuiltFrom: state.modBuiltFrom,
        mod: state.mod,
    };
}

const compileModDebounced = _.debounce(() => {
    const state = StoreProvider.getState();
    const codeTree = state.codeTree;
    const modResult = codeToMod(codeTree);
    StoreProvider.dispatch({
        type: "updateModTree",
        mod: modResult.mod,
        modBuiltFrom: codeTree,
        modErrors: modResult.errors,
    });
    if (modResult.mod) {
        editing.autoSaveMod(modResult.mod);
    }
}, 1000);

const codeToMod = Reselect.createSelector(
    (codeTree: e.CodeTree) => codeTree,
    (codeTree: e.CodeTree) => {
        const result: ModResult = {
            mod: null,
            errors: {},
        };
        if (!codeTree) {
            return result;
        }

        try {
            result.mod = convert.codeToMod(codeTree);
        } catch (exception) {
            if (exception instanceof e.ParseException) {
                result.errors = exception.errors;
            } else {
                throw exception;
            }
        }
        return result;
    }
);

interface ModResult {
    mod: ModTree;
    errors: e.ErrorTree;
}

class CompileModListener extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render(): React.ReactNode {
        return null;
    }

    componentDidMount() {
        this.compileModIfNecessary();
    }

    componentDidUpdate() {
        this.compileModIfNecessary();
    }

    private compileModIfNecessary() {
        if (!this.props.mod || this.props.codeTree !== this.props.modBuiltFrom) {
            compileModDebounced();
        }
    }
}

export default ReactRedux.connect(stateToProps)(CompileModListener);