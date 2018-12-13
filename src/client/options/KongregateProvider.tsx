import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import { base } from '../url';

export class KongregateProvider implements s.OptionsProvider {
    source = "kongregate";
    noLogin = true;
    noAdvanced = true;

    playerName: string = null;
    authToken: string = null;

    private sdk: Kongregate.SDK;
    
    constructor(sdk: Kongregate.SDK) {
        this.sdk = sdk;
    }

    async init() {
        await this.login();
    }

    private async login() {
        const kongregateId = this.sdk.services.getUserId();
        if (!kongregateId) {
            return;
        }

        const signature = this.sdk.services.getGameAuthToken();

        const input: m.KongregateLoginRequest = { kongregateId, signature };
        const res = await fetch(`${base}/api/kongregate`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        });

        if (res.status !== 200) {
            console.error("Failed to login with kongregate", res.statusText, await res.text());
            return;
        }

        const json: m.KongregateLoginResponse = await res.json();
        this.playerName = json.name;
        this.authToken = json.authToken;

        console.log("Logged in with Kongregate", this.playerName);
    }

    loadingProgress(proportion: number) { }

    async commercialBreak() { }

    onNotification(notifications: w.Notification[]) { }
}
