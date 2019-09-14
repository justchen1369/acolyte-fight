import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as playerHelper from '../playerHelper';
import * as StoreProvider from '../../storeProvider';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';
import PlayerName from '../playerNameComponent';

interface OwnProps {
    notification: w.LeaveNotification;
}
interface Props extends OwnProps {
    isOnline: boolean;
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        isOnline: state.online.has(ownProps.notification.player.userHash),
    };
}

class LeftMessage extends React.PureComponent<Props, State> {
    render() {
        const notification = this.props.notification;
        if (notification.split) {
            return <div className="row"><PlayerName player={notification.player} /> rematched</div>
        } else {
            if (this.props.isOnline) {
                // If they left this match but still online, they didn't leave
                return null;
            } else {
                return <div className="row"><PlayerName player={notification.player} /> left</div>
            }
        }
    }
}

export default ReactRedux.connect(stateToProps)(LeftMessage);