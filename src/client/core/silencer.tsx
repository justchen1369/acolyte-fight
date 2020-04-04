import _ from 'lodash';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';

class WordFilter {
    static splitter = /\W+/;

    private lookup = new Map<string, RegExp[]>();
    private subpatterns = new Array<RegExp>();

    addSubpattern(pattern: RegExp) {
        this.subpatterns.push(pattern);
    }

    addWord(words: string) {
        this.addPattern(
            words.split(WordFilter.splitter),
            new RegExp(`\\b${_.escapeRegExp(words)}\\b`, "i"));
    }

    addSentence(sentence: string) {
        this.addPattern(
            sentence.split(WordFilter.splitter),
            new RegExp(`^${_.escapeRegExp(sentence)}$`, "i"));
    }

    private addPattern(words: string[], pattern: RegExp) {
        words.forEach(word => {
            const key = WordFilter.stem(word)
            let filters = this.lookup.get(key);
            if (!filters) {
                filters = [];
                this.lookup.set(key, filters);
            }
            filters.push(pattern);
        });
    }

    acceptable(sentence: string) {
        if (this.subpatterns.some(filter => filter.test(sentence))) {
            return false;
        }

        const filters =
            _(sentence.split(WordFilter.splitter))
            .map(word => this.lookup.get(WordFilter.stem(word)))
            .filter(filters => !!filters)
            .flatten()
            .uniq()
            .value();
        return filters.every(filter => !filter.test(sentence));
    }

    private static stem(word: string) {
        return word.toLowerCase();
    }
}

const bannedSentences = [
    "ez",
    "easy",
    "too ez",
    "trash",
    "die",
    "idiot",
    "gay",
    "noob",
    "noobs",
];

const bannedWords = [
    "4nal",
    "abortion",
    "a.n.a.l",
    "a.u.s.t.i.s.t",
    "a.u.t.i.s.m",
    "a$$",
    "an4l",
    "anal",
    "b.i.t.c.h",
    "bastard",
    "b00b",
    "b00bs",
    "bish",
    "bitch",
    "blyad",
    "blyat",
    "bo0bs",
    "boob",
    "boobies",
    "boobs",
    "boner",
    "c.o.c.k",
    "c.u.n.t",
    "ccunt",
    "clit",
    "clitoris",
    "cocaine",
    "cocck",
    "cock",
    "cockk",
    "cuck",
    "cucked",
    "cum",
    "cumming",
    "cunt",
    "cunts",
    "cuntt",
    "cunty",
    "cyka blyat",
    "d!ck",
    "d1ck",
    "ddick",
    "dik",
    "degroid",
    "downie",
    "erect",
    "erection",
    "f.a.g",
    "f4g",
    "fag",
    "fagg",
    "faggo",
    "faggot",
    "fap",
    "fapping",
    "ffag",
    "fuck u",
    "fuck you",
    "h0m0",
    "h0mo",
    "hiitler",
    "hitler",
    "homo",
    "homoo",
    "hoomo",
    "gn the ass",
    "gncel",
    "gncels",
    "gt's gay",
    "gts gay",
    "incest",
    "horny",
    "j!zz",
    "jerk off",
    "jerking off",
    "jizz",
    "jizzing",
    "kill urself",
    "kill yourself",
    "kys",
    "lady boy",
    "ladyboy",
    "libtard",
    "me daddy",
    "mother fucker",
    "motherfucker",
    "muthafucka",
    "muthafucker",
    "n i g g e r",
    "n word",
    "n.i.g.g.e.r",
    "neck rope",
    "n1gg3r",
    "n1gger",
    "nazi",
    "nazii",
    "negroid",
    "ni66a",
    "ni66er",
    "nibba",
    "nidger",
    "nig",
    "niga",
    "niger",
    "nigga",
    "nigger",
    "niggers",
    "niggur",
    "p0rn",
    "pedo",
    "pen15",
    "penis",
    "petukh",
    "pizda",
    "porn",
    "pr0n",
    "pron",
    "pussi",
    "pusssy",
    "pussy",
    "pussyy",
    "rape",
    "raped",
    "raper",
    "retard",
    "retards",
    "retarded",
    "retart",
    "retarted",
    "s.l.u.t",
    "sex",
    "sh!t",
    "shithead",
    "sjw",
    "slit ur",
    "slit your",
    "slut",
    "sluts",
    "slutt",
    "slutty",
    "sluut",
    "suck dick",
    "suck my",
    "that's gay",
    "thats gay",
    "thot",
    "tits",
    "titties",
    "titty",
    "tranny",
    "up your ass",
    "u trash",
    "ur trash",
    "you trash",
    "you all trash",
    "your trash",
    "you're trash",
    "yall trash",
    "y'all trash",
    "u garbage",
    "ur garbage",
    "you garbage",
    "you all garbage",
    "your garbage",
    "you're garbage",
    "u shit",
    "you shit",
    "you're shit",
    "u little shit",
    "you little shit",
    "u suck",
    "you suck",
    "vagene",
    "vagina",
    "vibrator",
    "w.h.o.r.e",
    "wank",
    "wanker",
    "wanking",
    "im wet",
    "I'm wet",
    "i am wet",
    "whore",
    "Бля",
    "блять",
    "в попуу",
    "выебу",
    "дауны",
    "ебал",
    "ебать",
    "ебля",
    "ебу",
    "ебут",
    "ебуууут",
    "жопа",
    "заебали пиздеть",
    "заебали",
    "нахуй",
    "пенис",
    "петух",
    "пидорасы",
    "пизда",
    "пиздит",
    "сучка",
    "уебан",
    "хуй",
    "шлюха",
    "returded",
    "gey",
    "nigs",
];

const bannedSubpatterns = [
    /porn/i,
    /\bf+u?c?k? ?(yo)?u+\b/i,
];

const wordFilter = new WordFilter();
bannedSentences.forEach(sentence => wordFilter.addSentence(sentence));
bannedWords.forEach(word => wordFilter.addWord(word));
bannedSubpatterns.forEach(pattern => wordFilter.addSubpattern(pattern));

export function silenceIfNecessary(notifications: s.TextMessage[]) {
    const state = StoreProvider.getState();
    if (state.options.noProfanityFilter) {
        return;
    }

    const selfHash = state.userHash;

    const add = new Array<string>();
    notifications.forEach(notif => {
        if (notif.userHash !== selfHash && !wordFilter.acceptable(notif.text)) {
            add.push(notif.userHash);
        }
    });

    if (add.length > 0) {
        StoreProvider.dispatch({ type: "updateSilence", add });
    }
}