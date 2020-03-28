import * as AI from './ai.model';
import { sandbox } from './sandboxer';

let settings: AcolyteFightSettings = null;
let bot: AI.Bot = null;
let errored = false;

onmessage = onMessage;

function onMessage(e: MessageEvent) {
    const msg = JSON.parse(e.data) as AI.MsgContract;
    if (msg.type === "init") {
        onInit(msg);
    } else if (msg.type === "state") {
        onInput(msg);
    }
}

function onInit(msg: AI.InitMsgContract) {
    try {
        bot = sandbox(msg.code) as AI.Bot;
        settings = msg.settings;
    } catch (exception) {
        console.error("Error initializing bot code", exception);
    }
}

function onInput(msg: AI.StateMsgContract) {
    try {
        if (errored) {
            // Stop running bot once it has errored
            return;
        }

        let output: AI.OutputContract = null;
        if (bot && settings) {
            const input: AI.InputContract = {
                state: msg.state,
                heroId: msg.heroId,
                cooldowns: msg.cooldowns,
                settings,
                difficulty: msg.difficulty,
            };
            output = bot.act(input);
        }

        const response: AI.ResponseMsgContract = {
            type: "response",
            tick: msg.state.tick,
            output,
        };
        send(response);

    } catch (exception) {
        console.error("Error in bot code", exception);
        errored = true;
    }
}

function send(msg: AI.MsgContract) {
    (postMessage as any)(JSON.stringify(msg));
}