export const isSafari = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
export const isEdge = window.navigator.userAgent.indexOf("Edge") > -1;
export const isMobile = window.navigator.userAgent.toLowerCase().indexOf("mobi") !== -1
export const isLocal = window.location.host.indexOf("localhost") > -1;

console.log(`isSafari=${isSafari} isEdge=${isEdge} isMobile=${isMobile}`);