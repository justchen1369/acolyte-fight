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
import PreviewButton from './previewButton';
import { isMobile } from '../core/userAgent';

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
        const horizontal = isMobile ? <>
            <HrefItem disabled={!this.props.currentMod} onClick={() => this.onHomeClick()}><i className="fas fa-home" /> Home</HrefItem>
            <div className="spacer">{this.props.children}</div>
            <PreviewButton>Preview Mod</PreviewButton>
        </> : <>
            <HrefItem disabled={!this.props.currentMod} onClick={() => this.onHomeClick()}><i className="fas fa-chevron-left" /> Play with Mod</HrefItem>
            <PageLink page="modding" shrink={isMobile}>Overview</PageLink>
            <PageLink page="modding-spells" shrink={isMobile} error={"spells" in this.props.errors}>Spells</PageLink>
            <PageLink page="modding-sounds" shrink={isMobile} error={"sounds" in this.props.errors}>Sounds</PageLink>
            <PageLink page="modding-icons" shrink={isMobile} error={"icons" in this.props.errors}>Icons</PageLink>
            <PageLink page="modding-maps" shrink={isMobile} error={"maps" in this.props.errors}>Maps</PageLink>
            <PageLink page="modding-obstacles" shrink={isMobile} error={"obstacles" in this.props.errors}>Obstacles</PageLink>
            <PageLink page="modding-constants" shrink={isMobile} error={"constants" in this.props.errors}>Constants</PageLink>
            <div className="spacer">{this.props.children}</div>
            <PreviewButton>Preview Mod</PreviewButton>
        </>

        const vertical = isMobile && <>
            <PageLink page="modding">Overview</PageLink>
            <PageLink page="modding-spells" error={"spells" in this.props.errors}>Spells</PageLink>
            <PageLink page="modding-sounds" error={"sounds" in this.props.errors}>Sounds</PageLink>
            <PageLink page="modding-icons" error={"icons" in this.props.errors}>Icons</PageLink>
            <PageLink page="modding-maps" error={"maps" in this.props.errors}>Maps</PageLink>
            <PageLink page="modding-obstacles" error={"obstacles" in this.props.errors}>Obstacles</PageLink>
            <PageLink page="modding-constants" error={"constants" in this.props.errors}>Constants</PageLink>
        </>

        return <CustomBar vertical={vertical}>{horizontal}</CustomBar>
    }

    private async onHomeClick() {
        await editing.exitEditor(this.props.currentMod);
    }
}

export default ReactRedux.connect(stateToProps)(ModBar);