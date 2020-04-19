import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import './BannerAdRow.scss';
import BannerAd from './BannerAd';

interface Props {
    className?: string;
    width: number;
    height: number;
}
interface State {
}

export class BannerAdRow extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return <div className={classNames('banner-ad-row', this.props.className)}>
            <BannerAd
                height={this.props.height}
                width={this.props.width}
                />
        </div>
    }
}

export default BannerAdRow;