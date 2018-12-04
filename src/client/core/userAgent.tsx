import * as config from '../config';

export const isSafari = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
export const isEdge = window.navigator.userAgent.indexOf("Edge") > -1;
export const isMobile = window.navigator.userAgent.toLowerCase().indexOf("mobi") !== -1

console.log(`isSafari=${isSafari} isEdge=${isEdge} isMobile=${isMobile}`);