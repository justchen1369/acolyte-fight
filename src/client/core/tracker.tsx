
export function setUserId(userId: string) {
    const gtag = (window as any).gtag;
    if (gtag && userId) {
        gtag('set', {'user_id': userId});
    }
}