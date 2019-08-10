import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as StoreProvider from '../../storeProvider';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as w from '../../../game/world.model';

interface Props {
    notification: w.TeamsNotification;
}

export default function TeamsMessage(props: Props) {
    const notification = props.notification;
    if (notification.teamSizes) {
        const items = new Array<React.ReactNode>();
        for (let i = 0; i < notification.teamSizes.length; ++i) {
            if (items.length > 0) {
                items.push(<span key={`v${i}`} className="teams-splash-v">v</span>);
            }

            let className = "";
            if (i === 0) {
                className = "teams-splash-left";
            } else if (i < items.length - 1) {
                className = "teams-splash-middle";
            } else {
                className = "teams-splash-right";
            }

            items.push(<span key={i} className={className}>{notification.teamSizes[i]}</span>);
        }

        return <div className="splash-container">
            <div className="splash">{items}</div>
        </div>
    } else {
        return null;
    }
}