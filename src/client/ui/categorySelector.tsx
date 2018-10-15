
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';

interface Props {
    category: string;
    onCategoryChange: (category: string) => void;
}
interface State {
}

export class CategorySelector extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render(): JSX.Element {
        return <div className="category-selector">
            {m.GameCategory.All.map(category => (
                <div
                    key={category}
                    className={category === this.props.category ? "category category-selected" : "category"}
                    onClick={() => this.props.onCategoryChange(category)}
                    >
                    {category}
                </div>
            ))}
        </div>
    }

}

export default CategorySelector;