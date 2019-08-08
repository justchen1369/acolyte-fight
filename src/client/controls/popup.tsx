import * as React from 'react';
import * as ReactDOM from 'react-dom';

export type HorizontalEdge = "left" | "right";
export type VerticalEdge = "top" | "bottom";

export interface EdgeProps {
    left?: HorizontalEdge;
    right?: HorizontalEdge;
    top?: VerticalEdge;
    bottom?: VerticalEdge;
}

interface Props extends React.HTMLAttributes<HTMLDivElement> {
    anchor: HTMLElement;
    edge: EdgeProps;
}

export default class Popup extends React.PureComponent<Props> {
    private portal = document.getElementById('portal');

    render() {
        const anchor = this.props.anchor;
        const edge = this.props.edge;
        if (!(anchor && edge)) {
            return null;
        }

        const screen = anchor.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const style: React.CSSProperties = {};
        if (edge.left) {
            style.left = anchorRect[edge.left];
        }
        if (edge.right) {
            style.right = anchorRect[edge.right];
        }
        if (edge.top) {
            style.top = anchorRect[edge.top];
        }
        if (edge.bottom) {
            style.bottom = anchorRect[edge.bottom];
        }
        return ReactDOM.createPortal(<div className="popup" style={style} {...this.props}>
            {this.props.children}
        </div>, this.portal);
    }
}