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
        return <div className="row reminder-row">Reminder: <b>{this.props.message.text}</b></div>
    }
}

export default ReactRedux.connect(stateToProps)(LeftMessage);