import * as m from '../../game/messages.model';
import * as StoreProvider from '../storeProvider';

export async function downloadSettings(): Promise<void> {
    const res = await fetch('api/settings', {
        credentials: "same-origin",
    });
    if (res.status === 200) {
        const json: m.GetUserSettingsResponse = await res.json();

        let upload = false;
        StoreProvider.dispatch({ type: "updateUserId", userId: json.userId });
        if (json.name && json.name.length > 0) {
            StoreProvider.dispatch({ type: "updatePlayerName", playerName: json.name });
        } else {
            upload = true;
        }

        if (json.buttons) {
            StoreProvider.dispatch({ type: "updateKeyBindings", keyBindings: json.buttons });
        } else {
            upload = true;
        }

        if (json.rebindings) {
            StoreProvider.dispatch({ type: "updateRebindings", rebindings: json.rebindings });
        } else {
            upload = true;
        }
        console.log(`Logged in as ${json.userId} - ${json.name}`);

        if (upload) {
            await uploadSettings();
        }
    } else {
        // This user is not logged in
        StoreProvider.dispatch({ type: "updateUserId", userId: null });
    }
}

export async function uploadSettings(): Promise<void> {
    const state = StoreProvider.getState();

    const input: m.UpdateUserSettingsRequest = {
        name: state.playerName,
        buttons: state.keyBindings,
        rebindings: state.rebindings,
    };

    const res = await fetch('api/settings', {
        credentials: "same-origin",
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    if (res.status === 200) {
        console.log(`Updated cloud settings - name=${state.playerName}`);
    } else {
        console.error(`Failed to update cloud: ${res.status} - ${await res.text()}`);
    }
}