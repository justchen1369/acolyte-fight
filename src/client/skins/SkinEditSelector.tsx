import _ from 'lodash';
import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as constants from '../../game/constants';
import * as h from '../../game/character.model';
import * as k from './skins.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import SkinCanvas from './SkinCanvas';
import './SkinEditSelector.scss';

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

        const className = classNames("skin-edit-selector-layer", {
            'layer-selected': bodyIndex === this.props.edit.bodyIndex,
        });
        return <div className={className}>
            {this.renderSelectorBody(skin, bodyIndex)}
            {layer.glyphs.map((glyph, i) => this.renderSelectorGlyph(skin, bodyIndex, i))}
        </div>
    }

    private renderSelectorBody(skin: h.Skin, bodyIndex: number) {
        const className = classNames("skin-edit-selector-icon", {
            'icon-selected': bodyIndex === this.props.edit.bodyIndex && this.props.edit.glyphIndex === null,
        });
        return <SkinCanvas
            className={className}
            width={48}
            height={48}
            skin={skin}
            bodyIndex={bodyIndex}
            glyphIndex={-1}
            settings={this.props.settings}
            attr={{
                onMouseDown: () => this.props.onSelect({ bodyIndex, glyphIndex: null }),
            }}
            />
    }

    private renderSelectorGlyph(skin: h.Skin, bodyIndex: number, glyphIndex: number) {
        const className = classNames("skin-edit-selector-icon", {
            'icon-selected': bodyIndex === this.props.edit.bodyIndex && glyphIndex === this.props.edit.glyphIndex,
        });
        return <SkinCanvas
            className={className}
            width={48}
            height={48}
            skin={skin}
            bodyIndex={bodyIndex}
            glyphIndex={glyphIndex}
            glyphOnly={true}
            settings={this.props.settings}
            attr={{
                onMouseDown: () => this.props.onSelect({ bodyIndex, glyphIndex }),
            }}
            />
    }
}

export default SkinEditorPage;