import classNames from 'classnames';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as storage from '../storage';
import * as url from '../url';
import './BannerAd.scss';

interface Props {
    className?: string;
    width: number;
    height: number;

    minScreenWidthProportion?: number;
    minScreenHeightProportion?: number;
}
interface State {
    ready: boolean;
    screenWidth: number;
    screenHeight: number;
}

export class BannerAd extends React.PureComponent<Props, State> {
    private resizeListener = this.recheckScreenSize.bind(this);
    private intervalHandle: NodeJS.Timeout = null;
    private elem: HTMLDivElement = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            ready: false,
            screenWidth: 0,
            screenHeight: 0,
        };
    }

    componentDidMount() {
        window.addEventListener('resize', this.resizeListener);
        this.recheckScreenSize();

        this.intervalHandle = setInterval(() => this.onTimer(), 500);
    }

    componentWillUnmount() {
        clearInterval(this.intervalHandle);

        window.removeEventListener('resize', this.resizeListener);
    }

    render() {
        const minScreenWidth = (this.props.minScreenWidthProportion ?? 1) * this.props.width;
        const minScreenHeight = (this.props.minScreenHeightProportion ?? 1) * this.props.height;
        if (this.state.screenWidth < minScreenWidth || this.state.screenHeight < minScreenHeight) {
            console.log("Too small", this.state.screenWidth, this.state.screenHeight, minScreenWidth, minScreenHeight);
            return null; // Screen too small
        }

        const id = `acolytefight-io_${this.props.width}x${this.props.height}`;
        const className = classNames('banner-ad', this.props.className, {
            'banner-ad-ready': this.state.ready,
            'banner-ad-not-ready': !this.state.ready,
        });
        return <div
            id={id}
            ref={elem => this.onElem(elem)}
            className={className}
            style={{ width: this.props.width, height: this.props.height }}
            />
    }

    private recheckScreenSize() {
        this.setState({
            screenWidth: document.body.clientWidth,
            screenHeight: document.body.clientHeight,
        });
    }

    private onElem(elem: HTMLDivElement) {
        if (this.elem === elem) {
            return;
        }

        this.elem = elem;
        if (elem) {
            BannerAd.display(elem);
        }
    }

    private onTimer() {
        this.recheckReady();
    }

    private recheckReady() {
        const ready = this.elem && this.elem.hasChildNodes() && !!this.elem.querySelector("iframe");
        if (ready !== this.state.ready) {
            this.setState({ ready });
        }
    }

    private static display(target: HTMLDivElement) {
        if (!target) { return; }

        const aiptag = (window as any).aiptag;
        aiptag.cmd.display.push(function() {
            const aipDisplayTag = (window as any).aipDisplayTag;
            if (aipDisplayTag) {
                aipDisplayTag.display(target.id);
            }
        });
    }
}

export default BannerAd;