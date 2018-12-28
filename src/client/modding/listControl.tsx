import classNames from 'classnames';
import * as React from 'react';
import CodeEditor from '../modding/codeEditor';

export interface ListItem {
    id: string;
    label: string;
}

interface Props {
    items: ListItem[];
    selectedId: string;
}
interface State {
}

class ListControl extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    render() {
        return <select className="list-control" value={this.props.selectedId}>
            {this.props.items.map(item => this.renderItem(item))}
        </select>
    }

    private renderItem(item: ListItem) {
        return <option key={item.id} value={item.id}>{item.label}</option>;
    }
}

export default ListControl;