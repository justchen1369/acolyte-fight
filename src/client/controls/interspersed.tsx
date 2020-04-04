import * as React from 'react';

interface OwnProps {
    items: React.ReactNode[];
    separator?: React.ReactNode;
    finalizer?: React.ReactNode;
}

export default class Interspersed extends React.PureComponent<OwnProps> {
    render() {
        const items = this.props.items;
        const result = new Array<React.ReactNode>();
        for (let i = 0; i < items.length; ++i) {
            if (i > 0) {
                if (i === items.length - 1) {
                    result.push(this.props.finalizer || " and ");
                } else {
                    result.push(this.props.separator || ", ");
                }
            }
            result.push(items[i]);
        }
        return result;
    }
}