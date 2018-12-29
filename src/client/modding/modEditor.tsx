import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as convert from './convert';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as settings from '../../game/settings';
import ConstantEditor from './constantEditor';
import NavBar from '../ui/navbar';
import NavBarItem from '../ui/navbarItem';
import OverviewTab from './overviewTab';
import IconEditor from './iconEditor';
import MapEditor from './mapEditor';
import SoundEditor from './soundEditor';
import SpellEditor from './spellEditor';

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

interface Props {
    mod: Object;
}
interface State {
    codeTree: e.CodeTree;
    currentMod: Object;
    errors: e.ErrorTree;
    tab: string;
}

class ModEditor extends React.PureComponent<Props, State> {
    private parseModDebounced = _.debounce(() => this.parseMod(), 1000);

    constructor(props: Props) {
        super(props);
        this.state = {
            codeTree: convert.settingsToCode(applyMod(props.mod)),
            currentMod: props.mod,
            errors: {},
            tab: "overview",
        };
    }

    componentWillReceiveProps(newProps: Props) {
        if (newProps.mod !== this.props.mod) {
            this.updateMod(newProps.mod);
        }
    }

    render() {
        return <div className="content-container full-height-page mod-editor">
            <NavBar>
                {this.renderHomeHeader()}
                {this.renderTabHeader("overview", "Modding")}
                {this.renderTabHeader("spells", "Spells")}
                {this.renderTabHeader("sounds", "Sounds")}
                {this.renderTabHeader("icons", "Icons")}
                {this.renderTabHeader("maps", "Maps")}
                {this.renderTabHeader("constants", "Constants")}
                <div className="spacer"></div>
            </NavBar>
            {this.state.tab === "overview" && <OverviewTab currentMod={this.state.currentMod} onUpdateMod={(mod) => this.updateMod(mod)} />}
            {this.state.tab === "spells" && this.renderSpellEditor("spells")}
            {this.state.tab === "sounds" && this.renderSoundEditor("sounds")}
            {this.state.tab === "icons" && this.renderIconEditor("icons")}
            {this.state.tab === "maps" && this.renderMapEditor("maps")}
            {this.state.tab === "constants" && this.renderConstantEditor("constants")}
        </div>
    }

    private renderHomeHeader() {
        return <NavBarItem disabled={!this.state.currentMod} onClick={() => this.onHomeClick()}><i className="fas fa-chevron-left" /> Back to Home</NavBarItem>;
    }

    private renderTabHeader(id: string, name: string) {
        return <NavBarItem key={id} selected={id === this.state.tab} badge={id in this.state.errors} onClick={() => this.setState({ tab: id })}>{name}</NavBarItem>
    }
    
    private renderConstantEditor(key: string) {
        return <ConstantEditor
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            />
    }

    private renderIconEditor(key: string) {
        return <IconEditor
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            settings={applyMod(this.state.currentMod)}
            />
    }

    private renderMapEditor(key: string) {
        return <MapEditor
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            />
    }

    private renderSpellEditor(key: string) {
        return <SpellEditor
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            settings={applyMod(this.state.currentMod)}
            />
    }

    private renderSoundEditor(key: string) {
        return <SoundEditor
            section={this.state.codeTree[key]}
            errors={this.state.errors[key] || {}}
            onUpdate={section => this.updateSection(key, section)}
            settings={applyMod(this.state.currentMod)}
            />
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
}

export default ModEditor;