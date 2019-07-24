import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as pages from '../core/pages';
import * as url from '../url';

interface OwnProps {
    page: string;
    profileId?: string;
    onClick?: (ev: React.MouseEvent) => void;
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

class Link extends React.PureComponent<Props> {
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
        if (this.props.onClick) {
            this.props.onClick(ev);
        }
        pages.changePage(this.props.page, this.props.profileId);
    }
}

export default ReactRedux.connect(stateToProps)(Link);