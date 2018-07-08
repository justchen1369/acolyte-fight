import * as React from 'react';

interface Props {
}

interface State {
    room: string;
}

export class ShareSection extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            room: "Room" + Math.floor(Math.random() * 1e9).toString(36),
        };
    }

    render() {
        return <div>
            <h1>Share this game</h1>
            <p><a href={"play?room=" + this.state.room}>Click here to create a private room.</a> Share this link with your friends to play against them!</p>
        </div>;
    }
}