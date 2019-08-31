import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as StoreProvider from '../../storeProvider';

import Button from '../../controls/button';

interface Props {
    label: string;
    icon: string;
    onClick: () => void;
}

class ButtonRow extends React.PureComponent<Props> {
    render() {
        return <div className="button-panel-row" onMouseEnter={() => this.hover(this.props.label)} onMouseLeave={() => this.hover()}>
            <Button className="clickable" onClick={this.props.onClick}>
                <span className="button-panel-row-icon"><i className={this.props.icon} /></span>
                <span className="button-panel-row-label">{this.props.label}</span>
            </Button>
        </div>
    }

    private hover(text: string = null) {
        StoreProvider.dispatch({
            type: "updateToolbar",
            toolbar: { hoverControl: text },
        });
    }
}

export default ButtonRow;