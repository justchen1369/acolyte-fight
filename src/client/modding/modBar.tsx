import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as e from './editor.model';
import * as s from '../store.model';
import * as editing from './editing';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as StoreProvider from '../storeProvider';
import CustomBar from '../nav/customBar';
import HrefItem from '../nav/hrefItem';
import PageLink from '../nav/pageLink';

interface Props {
    codeTree: e.CodeTree;
    currentMod: ModTree;
    errors: e.ErrorTree;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const modResult = editing.codeToMod(state.codeTree);
    return {
        codeTree: state.codeTree,
        currentMod: modResult.mod,
        errors: modResult.errors,
    };
}

class ModBar extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
        };
    }

    render() {
        if (this.props.codeTree) {
            return this.renderEditing();
        } else {
            return this.renderInitial();
        }
    }

    private renderInitial() {
        return <CustomBar>
            <HrefItem onClick={() => this.onHomeClick()}><i className="fas fa-chevron-left" /> Back to Home</HrefItem>
        </CustomBar>
    }

    private renderEditing() {
        return <CustomBar>
            <HrefItem disabled={!this.props.currentMod} onClick={() => this.onHomeClick()}><i className="fas fa-chevron-left" /> Play with Mod</HrefItem>
            {this.renderTabHeader("modding", "Overview")}
            {this.renderTabHeader("modding-spells", "Spells")}
            {this.renderTabHeader("modding-sounds", "Sounds")}
            {this.renderTabHeader("modding-icons", "Icons")}
            {this.renderTabHeader("modding-maps", "Maps")}
            {this.renderTabHeader("modding-constants", "Constants")}
        </CustomBar>
    }

    private renderTabHeader(id: string, name: string) {
        return <PageLink
            key={id}
            page={id}
            badge={id in this.props.errors}
            error={id in this.props.errors}>{name}</PageLink>
    }

    private async onHomeClick() {
        const mod = this.props.codeTree ? this.props.currentMod : {};
        if (mod) {
            const roomId = await rooms.createRoomAsync(mod)
            await rooms.joinRoomAsync(roomId);
            await parties.movePartyAsync(roomId);
            await pages.changePage("");
        }
    }
}

export default ReactRedux.connect(stateToProps)(ModBar);