import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as StoreProvider from '../../storeProvider';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';

interface OwnProps {
    message: s.ReminderMessage;
}
interface Props extends OwnProps {
}
interface State {
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
    };
}

class LeftMessage extends React.PureComponent<Props, State> {
    render() {
        switch (this.props.message.reminder) {
            case "ffa": return <div className="row reminder-row"><i>Reminder:</i> This game is a <b>free-for-all</b>. You <b>do not</b> need to respect 1v1s.</div>
            default: return null;
        }
    }
}

export default ReactRedux.connect(stateToProps)(LeftMessage);