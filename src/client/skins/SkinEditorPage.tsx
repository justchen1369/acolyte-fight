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
import SkinCanvas from './SkinCanvas';

interface Props {
    settings: AcolyteFightSettings;
}

interface State {
    skin: h.Skin;
    bodyIndex: number;
    glyphIndex: number;
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
            bodyIndex: 0,
            glyphIndex: 0,
        };
    }

    render() {
        return <div className="skin-edit-page">
            {this.renderPreview()}
            {this.renderSelector()}
            {this.renderAdjusters()}
        </div>
    }

    private renderPreview() {
        return <SkinCanvas
            width={300}
            height={250}
            skin={this.state.skin}
            settings={this.props.settings}
            />
    }

    private renderSelector() {
        const skin = this.state.skin;
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
            skin={this.state.skin}
            bodyIndex={bodyIndex}
            glyphIndex={-1}
            settings={this.props.settings}
            />
    }

    private renderSelectorGlyph(skin: h.Skin, layer: h.Layer, bodyIndex: number, glyphIndex: number) {
        return <SkinCanvas
            width={48}
            height={48}
            skin={this.state.skin}
            bodyIndex={bodyIndex}
            glyphIndex={glyphIndex}
            glyphOnly={true}
            settings={this.props.settings}
            />
    }

    private renderAdjusters() {
        const skin = this.state.skin;
        const bodyIndex = this.state.bodyIndex;
        const glyphIndex = this.state.glyphIndex;
        if (typeof bodyIndex === 'number') {
            const layer = skin.layers[bodyIndex];
            if (!layer) {
                return this.renderNoAdjusters();
            }

            if (typeof glyphIndex === 'number') {
                const glyph = layer.glyphs[glyphIndex];
                if (!glyph) {
                    return this.renderNoAdjusters();
                }

                return this.renderAdjustGlyph(glyph, bodyIndex, glyphIndex);
            } else {
                return this.renderAdjustBody(layer.body, bodyIndex);
            }
        } else {
            return this.renderNoAdjusters();
        }
    }

    private renderNoAdjusters() {
        return <div className="skin-adjust">
        </div>
    }

    private renderAdjustBody(body: h.LayerBody, bodyIndex: number) {
        return <div className="skin-adjust">
            {this.renderAdjustShape(body.shape, shape => this.updateBody(bodyIndex, { ...body, shape }))}
        </div>
    }

    private renderAdjustGlyph(glyph: h.LayerGlyph, bodyIndex: number, glyphIndex: number) {
        return <div className="skin-adjust">
            {this.renderAdjustShape(glyph.shape, shape => this.updateGlyph(bodyIndex, glyphIndex, { ...glyph, shape }))}
        </div>
    }

    private renderAdjustShape(shape: h.Shape, onUpdate: (newShape: h.Shape) => void) {
        if (shape.type === "circle") {
            return this.renderAdjustCircle(shape, onUpdate);
        } else if (shape.type === "triangle") {
            return this.renderAdjustTriangle(shape, onUpdate);
        } else {
            return null;
        }
    }

    private renderAdjustCircle(shape: h.Circle, onUpdate: (newShape: h.Shape) => void) {
        return <div className="skin-adjust-section">
        </div>
    }

    private renderAdjustTriangle(shape: h.Triangle, onUpdate: (newShape: h.Shape) => void) {
        return <div className="skin-adjust-section">
            <div className="skin-adjust-section-title">Shape</div>
            <div className="skin-adjust-row">
                <div className="skin-adjust-row-label">Peak</div>
                {this.renderPercentageSlider(shape.peakSpan, 0, 1, (peakSpan) => onUpdate({ ...shape, peakSpan }))}
            </div>
            <div className="skin-adjust-row">
                <div className="skin-adjust-row-label">Indent</div>
                {this.renderPercentageSlider(shape.indentRise, 0, 2, (indentRise) => onUpdate({ ...shape, indentRise }))}
            </div>
            <div className="skin-adjust-row">
                <div className="skin-adjust-row-label">Base</div>
                {this.renderPercentageSlider(shape.indentSpan, 0, 1, (indentSpan) => onUpdate({ ...shape, indentSpan }))}
            </div>
        </div>
    }

    private renderPercentageSlider(value: number, min: number, max: number, onUpdate: (newValue: number) => void) {
        const OneHundredPercent = 100.0;
        return <input type="range" min={0} max={OneHundredPercent} value={OneHundredPercent * (value - min) / (max - min)} onChange={ev => onUpdate(min + (max - min) * parseFloat(ev.target.value) / OneHundredPercent)} />
    }

    private updateGlyph(bodyIndex: number, glyphIndex: number, glyph: h.LayerGlyph) {
        const layer: h.Layer = this.state.skin.layers[bodyIndex];
        if (layer) {
            let glyphs = [...layer.glyphs];
            glyphs[glyphIndex] = glyph;
            this.updateLayer(bodyIndex, { ...layer, glyphs });
        }
    }

    private updateBody(bodyIndex: number, body: h.LayerBody) {
        const layer: h.Layer = this.state.skin.layers[bodyIndex];
        if (layer) {
            this.updateLayer(bodyIndex, { ...layer, body });
        }
    }

    private updateLayer(bodyIndex: number, layer: h.Layer) {
        const skin = { ...this.state.skin };
        skin.layers = [...skin.layers];
        skin.layers[bodyIndex] = layer;
        this.setState({
            skin: skin,
        });
    }
}

export default ReactRedux.connect(stateToProps)(SkinEditorPage);