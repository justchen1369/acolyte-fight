import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as url from '../url';

interface Props {
    subtitle?: string;
}
interface State {
}

class TitleListener extends React.PureComponent<Props, State> {
    render(): JSX.Element {
        if (this.props.subtitle) {
            document.title = `Acolyte Fight! - ${this.props.subtitle}`;
        } else {
            document.title = `Acolyte Fight! - spellcaster royale`;
        }

        return null;
    }
}

export default TitleListener