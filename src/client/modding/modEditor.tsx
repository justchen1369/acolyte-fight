import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as s from '../store.model';
import * as convert from './convert';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as settings from '../../game/settings';
import * as StoreProvider from '../storeProvider';
import ConstantEditor from './constantEditor';
import CustomBar from '../nav/customBar';
import HrefItem from '../nav/hrefItem';
import OverviewTab from './overviewTab';
import IconEditor from './iconEditor';
import MapEditor from './mapEditor';
import SoundEditor from './soundEditor';
import SpellEditor from './spellEditor';

const defaultTree = convert.settingsToCode(settings.DefaultSettings);

const applyMod = Reselect.createSelector(
    (mod: Object) => mod,
    (mod: Object) => {
        return mod ? settings.calculateMod(mod) : null;
    }
);

const createMod = Reselect.createSelector(
    (codeTree: e.CodeTree) => codeTree,
    (codeTree: e.CodeTree) => {
        const result: ModResult = { };
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
    mod?: Object;
    errors?: e.ErrorTree;
}

interface OwnProps {
    mod: Object;
}
interface Props extends OwnProps {
   current: s.PathElements; 
}
interface State {
    editing: boolean;
    codeTree: e.CodeTree;
    currentMod: Object;
    errors: e.ErrorTree;
    tab: string;
    selectedId: string;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
    };
}

function parseSelection(current: s.PathElements): e.Selection {
    if (current.hash) {
        let [tab, selectedId] = current.hash.split("/");

        tab = tab || "";
        selectedId = selectedId || null;
        if (selectedId === "") {
            selectedId = null;
        }

        return { tab, selectedId };
    } else {
        return { tab: "", selectedId: null };
    }
}

function formatSelection(current: s.PathElements, selection: e.Selection): s.PathElements {
    let hash = (selection.tab || "");
    if (selection.selectedId) {
        hash += "/" + selection.selectedId;
    }
    return { ...current, hash };
}

class ModEditor extends React.PureComponent<Props, State> {
    private parseModDebounced = _.debounce(() => this.parseMod(), 1000);

    constructor(props: Props) {
        super(props);

        const selection = parseSelection(props.current);
        this.state = {
            editing: Object.keys(props.mod).length > 0,
            codeTree: convert.settingsToCode(applyMod(props.mod)),
            currentMod: props.mod,
            errors: {},
            tab: selection.tab,
            selectedId: selection.selectedId,
        };
    }

    componentWillReceiveProps(newProps: Props) {
        if (newProps.mod !== this.props.mod) {
            this.updateMod(newProps.mod);
        }
    }

    render() {
        const editing = this.state.editing;
        return <div className="content-container full-height-page mod-editor">
            <CustomBar>
                {this.renderHomeHeader()}
                {editing && this.renderTabHeader("", "Overview")}
                {editing && this.renderTabHeader("spells", "Spells")}
                {editing && this.renderTabHeader("sounds", "Sounds")}
                {editing && this.renderTabHeader("icons", "Icons")}
                {editing && this.renderTabHeader("maps", "Maps")}
                {editing && this.renderTabHeader("constants", "Constants")}
            </CustomBar>
            {this.renderTab()}
        </div>
    }

    private renderHomeHeader() {
        return <HrefItem disabled={!this.state.currentMod} onClick={() => this.onHomeClick()}><i className="fas fa-chevron-left" /> Back to Home</HrefItem>;
    }

    private renderTabHeader(id: string, name: string) {
        return <HrefItem
            key={id}
            selected={id === this.state.tab}
            badge={id in this.state.errors}
            error={id in this.state.errors}
            onClick={() => this.updateTab(id)}>{name}</HrefItem>
    }

    private renderTab() {
        const editing = this.state.editing;
        if (!editing) {
            return this.renderOverviewTab();
        }

        switch (this.state.tab) {
            case "spells": return this.renderSpellEditor("spells");
            case "sounds": return this.renderSoundEditor("sounds");
            case "icons": return this.renderIconEditor("icons");
            case "maps": return this.renderMapEditor("maps");
            case "constants": return this.renderConstantEditor("constants");
            case "overview": return this.renderOverviewTab();
            default: return this.renderOverviewTab();
        }
    }

    private renderOverviewTab() {
        return <OverviewTab
            currentMod={this.state.currentMod}
            onUpdateMod={(mod) => this.updateMod(mod)}
            error={!!this.state.errors}
            />;
    }
    
    private renderConstantEditor(key: string) {
        return <ConstantEditor
            default={defaultTree[key]}
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            onPreview={() => this.onPreviewClick()}
            settings={applyMod(this.state.currentMod)}
            selectedId={this.state.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private renderIconEditor(key: string) {
        return <IconEditor
            default={defaultTree[key]}
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            settings={applyMod(this.state.currentMod)}
            selectedId={this.state.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private renderMapEditor(key: string) {
        return <MapEditor
            default={defaultTree[key]}
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            onPreview={(layoutId) => this.onPreviewClick(layoutId)}
            settings={applyMod(this.state.currentMod)}
            selectedId={this.state.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private renderSpellEditor(key: string) {
        return <SpellEditor
            default={defaultTree[key]}
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            onPreview={() => this.onPreviewClick()}
            settings={applyMod(this.state.currentMod)}
            selectedId={this.state.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private renderSoundEditor(key: string) {
        return <SoundEditor
            default={defaultTree[key]}
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            settings={applyMod(this.state.currentMod)}
            selectedId={this.state.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private updateTab(tab: string) {
        this.setState({ tab });
        StoreProvider.dispatch({
            type: "updateUrl",
            current: formatSelection(this.props.current, {
                tab,
                selectedId: this.state.selectedId,
            }),
        });
    }

    private updateSelectedId(selectedId: string) {
        this.setState({ selectedId });
        StoreProvider.dispatch({
            type: "updateUrl",
            current: formatSelection(this.props.current, {
                tab: this.state.tab,
                selectedId,
            }),
        });
    }

    private updateSection(key: string, section: e.CodeSection) {
        const codeTree = {
            ...this.state.codeTree,
            [key]: section,
        };
        this.updateCode(codeTree);
    }

    private updateCode(codeTree: e.CodeTree) {
        this.setState({ codeTree, errors: {}, currentMod: null });
        this.parseModDebounced();
    }

    private updateMod(mod: Object) {
        this.setState({
            editing: Object.keys(mod).length > 0,
            codeTree: convert.settingsToCode(applyMod(mod)),
            currentMod: mod,
            errors: {},
        });
    }

    private parseMod() {
        const result = createMod(this.state.codeTree);
        if (result.errors) {
            this.setState({ errors: result.errors, currentMod: null });
        } else {
            const codeTree = convert.settingsToCode(applyMod(result.mod));
            this.setState({ codeTree, errors: {}, currentMod: result.mod });
        }
    }

    private async onHomeClick() {
        const mod = this.state.currentMod;
        if (mod) {
            const roomId = await rooms.createRoomAsync(mod)
            await rooms.joinRoomAsync(roomId);
            await parties.movePartyAsync(roomId);
            await pages.changePage("");
        }
    }

    private async onPreviewClick(layoutId: string = null) {
        const mod = this.state.currentMod;
        if (mod) {
            const roomId = await rooms.createRoomAsync(mod)
            await rooms.joinRoomAsync(roomId);
            await matches.joinNewGame({ layoutId });
        }
    }
}

export default ReactRedux.connect(stateToProps)(ModEditor);