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
import * as selectors from './selectors';
import * as settings from '../../game/settings';
import * as StoreProvider from '../storeProvider';
import ConstantEditor from './constantEditor';
import CustomBar from '../nav/customBar';
import HrefItem from '../nav/hrefItem';
import OverviewTab from './overviewTab';
import PageLink from '../nav/pageLink';
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

    componentWillReceiveProps(newProps: Props) {
        if (newProps.mod !== this.props.mod) {
            this.updateMod(newProps.mod);
        }
    }

    render() {
        const editing = !!this.props.codeTree;
        return <div className="content-container full-height-page mod-editor">
            <CustomBar>
                {this.renderHomeHeader()}
                {editing && this.renderTabHeader("modding", "Overview")}
                {editing && this.renderTabHeader("modding-spells", "Spells")}
                {editing && this.renderTabHeader("modding-sounds", "Sounds")}
                {editing && this.renderTabHeader("modding-icons", "Icons")}
                {editing && this.renderTabHeader("modding-maps", "Maps")}
                {editing && this.renderTabHeader("modding-constants", "Constants")}
            </CustomBar>
            {this.renderTab()}
        </div>
    }

    private renderHomeHeader() {
        return <HrefItem onClick={() => this.onHomeClick()}><i className="fas fa-chevron-left" /> {this.props.codeTree ? "Play with Mod" : "Back to Home"}</HrefItem>;
    }

    private renderTabHeader(id: string, name: string) {
        return <PageLink
            key={id}
            page={id}
            badge={id in this.props.errors}
            error={id in this.props.errors}>{name}</PageLink>
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
        return <ConstantEditor
            default={selectors.defaultTree[key]}
            section={this.props.codeTree[key]}
            errors={this.props.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            onPreview={() => this.onPreviewClick()}
            settings={selectors.applyMod(this.props.currentMod)}
            selectedId={this.props.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private renderIconEditor(key: string) {
        return <IconEditor
            default={selectors.defaultTree[key]}
            section={this.props.codeTree[key]}
            errors={this.props.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            settings={selectors.applyMod(this.props.currentMod)}
            selectedId={this.props.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private renderMapEditor(key: string) {
        return <MapEditor
            default={selectors.defaultTree[key]}
            section={this.props.codeTree[key]}
            errors={this.props.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            onPreview={(layoutId) => this.onPreviewClick(layoutId)}
            settings={selectors.applyMod(this.props.currentMod)}
            selectedId={this.props.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private renderSpellEditor(key: string) {
        return <SpellEditor
            default={selectors.defaultTree[key]}
            section={this.props.codeTree[key]}
            errors={this.props.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            onPreview={() => this.onPreviewClick()}
            settings={selectors.applyMod(this.props.currentMod)}
            selectedId={this.props.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private renderSoundEditor(key: string) {
        return <SoundEditor
            default={selectors.defaultTree[key]}
            section={this.props.codeTree[key]}
            errors={this.props.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            settings={selectors.applyMod(this.props.currentMod)}
            selectedId={this.props.selectedId}
            onSelected={selectedId => this.updateSelectedId(selectedId)}
            />
    }

    private updateSelectedId(selectedId: string) {
        StoreProvider.dispatch({ type: "updateHash", hash: selectedId });
    }

    private updateSection(key: string, section: e.CodeSection) {
        const codeTree = {
            ...this.props.codeTree,
            [key]: section,
        };
        this.updateCode(codeTree);
    }

    private updateCode(codeTree: e.CodeTree) {
        StoreProvider.dispatch({ type: "updateCodeTree", codeTree });
    }

    private updateMod(mod: Object) {
        StoreProvider.dispatch({
            type: "updateCodeTree",
            codeTree: convert.settingsToCode(selectors.applyMod(mod)),
        });
    }

    private async onHomeClick() {
        const mod = this.props.currentMod;
        if (mod) {
            const roomId = await rooms.createRoomAsync(mod)
            await rooms.joinRoomAsync(roomId);
            await parties.movePartyAsync(roomId);
            await pages.changePage("");
        }
    }

    private async onPreviewClick(layoutId: string = null) {
        const mod = this.props.currentMod;
        if (mod) {
            const roomId = await rooms.createRoomAsync(mod)
            await matches.joinNewGame({ layoutId, roomId });
        }
    }
}

export default ReactRedux.connect(stateToProps)(ModEditor);