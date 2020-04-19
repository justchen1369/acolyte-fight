import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as h from '../../game/character.model';
import * as k from './skins.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import * as skinLibrary from '../../game/skinLibrary';
import NavBar from '../nav/navbar';
import SkinAdjuster from './SkinAdjuster';
import SkinCanvas from './SkinCanvas';
import SkinEditSelector from './SkinEditSelector';
import TitleListener from '../controls/titleListener';
import './SkinEditorPage.scss';

interface Props {
    settings: AcolyteFightSettings;
}

interface State {
    skin: h.Skin;
    edit: k.SkinEditPath;
}

function stateToProps(state: s.State): Props {
    return {
        settings: state.room.settings,
    };
}

class SkinEditorPage extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            skin: skinLibrary.defaultSkin,
            edit: {
                bodyIndex: 0,
                glyphIndex: 0,
            },
        };
    }

    render() {
        return <div className="content-container full-height-page">
            <TitleListener subtitle="Skin Editor" />
            <NavBar />
            <div className="skin-edit-page">
                {this.renderPreview()}
                <SkinEditSelector
                    skin={this.state.skin}
                    edit={this.state.edit}
                    settings={this.props.settings}
                    onSelect={edit => this.setState({ edit })}
                    />
                <SkinAdjuster
                    skin={this.state.skin}
                    edit={this.state.edit}
                    settings={this.props.settings}
                    onUpdate={skin => this.setState({ skin })}
                    />
            </div>
        </div>
    }

    private renderPreview() {
        return <div className="skin-edit-preview-panel">
            <SkinCanvas
            className="skin-edit-preview"
            width={300}
            height={250}
            skin={this.state.skin}
            settings={this.props.settings}
            />
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(SkinEditorPage);