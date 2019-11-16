import * as React from 'react';
import './percentageBar.scss';

interface Props {
    proportion: number;
}

export class PercentageBar extends React.PureComponent<Props> {
    render() {
        const percentageFormatted = `${((this.props.proportion || 0) * 100).toFixed(1)}%`;
        return <div className="percentage-bar-container">
            <div className="percentage-bar">
                <div className="percentage-bar-fill" style={{ width: percentageFormatted }}></div>
            </div>
            <div className="percentage-bar-label">
                {percentageFormatted}
            </div>
        </div>
    }
}

export default PercentageBar;