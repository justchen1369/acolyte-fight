import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as pages from '../core/pages';
import * as url from '../url';

interface OwnProps {
    page: string;
    profileId?: string;
}
interface Props extends OwnProps {
    current: s.PathElements;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
    };
}

export class Link extends React.Component<Props> {
    render() {
        const href = url.getPath({
            ...this.props.current,
            page: this.props.page,
            profileId: this.props.profileId,
        });
        return <a href={href} onClick={(ev) => this.onLinkClick(ev)}>{this.props.children}</a>
    }

    private onLinkClick(ev: React.MouseEvent) {
        ev.preventDefault();
        pages.changePage(this.props.page, this.props.profileId);
    }
}

export default ReactRedux.connect(stateToProps)(Link);