import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as h from '../../game/character.model';
import * as k from './skins.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import SkinCanvas from './SkinCanvas';

interface Props {
    settings: AcolyteFightSettings;
    skin: h.Skin;
    edit: k.SkinEditPath;

    onSelect: (edit: k.SkinEditPath) => void;
}

interface State {
}

class SkinEditorPage extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const skin = this.props.skin;
        const layers = skin.layers;
        return <div className="skin-edit-selector">
            {layers.map((layer, i) => this.renderSelectorLayer(skin, i))}
        </div>
    }

    private renderSelectorLayer(skin: h.Skin, bodyIndex: number) {
        const layer = skin.layers[bodyIndex];
        if (!layer) { return null; }

        return <div className="skin-edit-selector-layer">
            {this.renderSelectorBody(skin, layer, bodyIndex)}
            {layer.glyphs.map((glyph, i) => this.renderSelectorGlyph(skin, layer, bodyIndex, i))}
        </div>
    }

    private renderSelectorBody(skin: h.Skin, layer: h.Layer, bodyIndex: number) {
        return <SkinCanvas
            width={48}
            height={48}
            skin={this.props.skin}
            bodyIndex={bodyIndex}
            glyphIndex={-1}
            settings={this.props.settings}
            />
    }

    private renderSelectorGlyph(skin: h.Skin, layer: h.Layer, bodyIndex: number, glyphIndex: number) {
        return <SkinCanvas
            width={48}
            height={48}
            skin={this.props.skin}
            bodyIndex={bodyIndex}
            glyphIndex={glyphIndex}
            glyphOnly={true}
            settings={this.props.settings}
            />
    }
}

export default SkinEditorPage;