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
    codeTree: e.CodeTree;
    roomMod: ModTree;
    current: s.PathElements;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        codeTree: state.codeTree,
        roomMod: state.room.mod,
        current: state.current,
    };
}

class ModEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
        };
    }

    componentWillMount() {
        if (!this.props.codeTree && Object.keys(this.props.roomMod).length > 0) {
            // Room is modded, load the settings from there when launching the mod editor
            StoreProvider.dispatch({ type: "updateCodeTree", codeTree: convert.modToCode(this.props.roomMod) });
        }
    }

    render() {
        return <div className="content-container full-height-page mod-editor">
            <ModBar />
            {this.renderTab()}
        </div>
    }

    private renderTab() {
        switch (this.props.current.page) {
            case "modding-spells": return <SpellEditor />
            case "modding-sounds": return <SoundEditor />
            case "modding-icons": return <IconEditor />
            case "modding-maps": return <MapEditor />
            case "modding-constants": return <ConstantEditor />
            default: return <OverviewTab />
        }
    }
}

export default ReactRedux.connect(stateToProps)(ModEditor);