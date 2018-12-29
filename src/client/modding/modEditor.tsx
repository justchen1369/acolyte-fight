import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as s from '../store.model';
import * as convert from './convert';
import * as pages from '../core/pages';
import * as selectors from './selectors';
import * as StoreProvider from '../storeProvider';
import ConstantEditor from './constantEditor';
import ModBar from './modBar';
import OverviewTab from './overviewTab';
import IconEditor from './iconEditor';
import MapEditor from './mapEditor';
import SoundEditor from './soundEditor';
import SpellEditor from './spellEditor';

interface Props {
    mod: ModTree;
    current: s.PathElements;
    codeTree: e.CodeTree;
    selectedId: string;
    currentMod: ModTree;
    errors: e.ErrorTree;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const modResult = selectors.createMod(state.codeTree);
    return {
        mod: state.room.mod,
        current: state.current,
        codeTree: state.codeTree,
        selectedId: state.current.hash,
        currentMod: modResult.mod,
        errors: modResult.errors,
    };
}

class ModEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
        };
    }

    render() {
        return <div className="content-container full-height-page mod-editor">
            <ModBar />
            {this.renderTab()}
        </div>
    }

    private renderTab() {
        const editing = !!this.props.codeTree;
        if (!editing) {
            return this.renderOverviewTab();
        }

        switch (this.props.current.page) {
            case "modding-spells": return this.renderSpellEditor("spells");
            case "modding-sounds": return this.renderSoundEditor("sounds");
            case "modding-icons": return this.renderIconEditor("icons");
            case "modding-maps": return this.renderMapEditor("maps");
            case "modding-constants": return this.renderConstantEditor("constants");
            default: return this.renderOverviewTab();
        }
    }

    private renderOverviewTab() {
        return <OverviewTab />;
    }
    
    private renderConstantEditor(key: string) {
        return <ConstantEditor />
    }

    private renderIconEditor(key: string) {
        return <IconEditor />
    }

    private renderMapEditor(key: string) {
        return <MapEditor />
    }

    private renderSpellEditor(key: string) {
        return <SpellEditor />
    }

    private renderSoundEditor(key: string) {
        return <SoundEditor />
    }
}

export default ReactRedux.connect(stateToProps)(ModEditor);