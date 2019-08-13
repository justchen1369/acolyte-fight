export function setUserId(userId: string) {
    const gtag = getGtag();
    if (gtag && userId) {
        gtag('set', {'user_id': userId});
    }
}

export function send(name: string, value?: number) {
    const gtag = getGtag();
    if (gtag) {
        gtag('event', name, { value });
    }
}

function getGtag(): any {
    const gtag = (window as any).gtag;
    return gtag;
}