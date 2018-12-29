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
            <PageLink page="modding">Overview</PageLink>
            <PageLink page="modding-spells" error={"spells" in this.props.errors}>Spells</PageLink>
            <PageLink page="modding-sounds" error={"sounds" in this.props.errors}>Sounds</PageLink>
            <PageLink page="modding-icons" error={"icons" in this.props.errors}>Icons</PageLink>
            <PageLink page="modding-maps" error={"maps" in this.props.errors}>Maps</PageLink>
            <PageLink page="modding-constants" error={"constants" in this.props.errors}>Constants</PageLink>
        </CustomBar>
    }

    private async onHomeClick() {
        const mod = this.props.codeTree ? this.props.currentMod : {};
        if (mod) {
            const roomId = await rooms.createRoomAsync(mod)
            await rooms.joinRoomAsync(roomId);
            await parties.movePartyAsync(roomId);
            await pages.changePage("");
            StoreProvider.dispatch({ type: "updateHash", hash: null });
        }
    }
}

export default ReactRedux.connect(stateToProps)(ModBar);