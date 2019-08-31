import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';

import ButtonPanelLabel from './buttons/buttonPanelLabel';
import CustomBar from '../nav/customBar';
import HrefItem from '../nav/hrefItem';

interface Props {
}

class RecordBar extends React.PureComponent<Props> {
    render() {
        return <CustomBar>
            {this.props.children}
            <ButtonPanelLabel />
        </CustomBar>
    }
}

export default RecordBar;