export function send(name: string) {
    const gtag = (window as any).gtag;
    if (gtag) {
        gtag('event', name);
    }
}