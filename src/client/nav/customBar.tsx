import classNames from 'classnames';
import * as React from 'react';
import HrefItem from './hrefItem';

interface Props {
    vertical?: React.ReactFragment;
    children?: React.ReactFragment;
}

interface State {
    open: boolean;
}

class CustomBar extends React.PureComponent<Props, State> {
    private windowClickListener = this.onWindowClick.bind(this);

    constructor(props: Props) {
        super(props);
        this.state = {
            open: false,
        }
    }

    componentDidMount() {
        window.addEventListener('click', this.windowClickListener);
    }

    componentWillUnmount() {
        window.removeEventListener('click', this.windowClickListener);
    }

    render() {
        const verticalClasses = classNames({
            "navbar": true,
            "navbar-vertical": true,
            "navbar-open": this.state.open,
        });
        return <div className="navbar-container">
            <div className="navbar navbar-horizontal">
                {this.props.vertical && <HrefItem onClick={(ev) => this.onToggleOpen(ev)}><i className="fas fa-bars" /></HrefItem>}
                {this.props.children}
            </div>
            <div className={verticalClasses} onClick={(ev) => this.stopBubbling(ev)}>
                <HrefItem onClick={(ev) => this.onToggleOpen(ev)}><i className="fas fa-bars" /></HrefItem>
                {this.props.vertical}
            </div>
        </div>
    }

    private stopBubbling(ev: React.MouseEvent) {
        // Stop bubbling so that only clicks outside of the navbar close it
        ev.stopPropagation();
    }

    private onToggleOpen(ev: React.MouseEvent) {
        // Stop bubbling because that would close the navigation bar
        ev.stopPropagation();
        ev.preventDefault();
        this.setState({ open: !this.state.open });
    }

    private onWindowClick() {
        if (this.state.open) {
            this.setState({ open: false });
        }
    }
}

export default CustomBar;