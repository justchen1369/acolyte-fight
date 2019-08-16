import * as s from '../store.model';
import * as w from '../../game/world.model';
import { base } from '../url';

export class FacebookProvider implements s.OptionsProvider {
    source = "fb";
    noLogin = true;
    noExternalLinks = true;
    noDiscordAd = true;
    noPartyLink = true;
    noModding = true;

    authToken: string = null;
    playerName: string = null;

    private sdk: FBInstant.SDK;

    constructor(sdk: FBInstant.SDK) {
        this.sdk = sdk;
    }

    async init() {
        this.sdk.setLoadingProgress(50);
        this.authToken = await this.authenticate();

        this.sdk.setLoadingProgress(100);
        await this.sdk.startGameAsync();
        
        this.playerName = await this.sdk.player.getName();
    }

    async commercialBreak() { }

    onNotification(notifications: w.Notification[]) { }

    private async authenticate(): Promise<string> {
        const signedInfo = await this.sdk.player.getSignedPlayerInfoAsync()
        var signature = signedInfo.getSignature();
        const res = await fetch(`${base}/api/facebook`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ signature }),
        });

        if (res.status === 200) {
            const json = await res.json();
            console.log("Facebook login succeeded");
            return json.authToken;
        } else {
            const text = await res.text();
            console.error("Facebook login failed: ", res.status, text);
            return null;
        }
    }
}
