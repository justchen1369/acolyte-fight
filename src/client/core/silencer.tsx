import _ from 'lodash';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';

class WordFilter {
    static splitter = /\s+/;
    private lookup = new Map<string, RegExp[]>();

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
];

const bannedWords = [
    "4nal",
    "a.n.a.l",
    "a.u.s.t.i.s.t",
    "a.u.t.i.s.m",
    "a$$",
    "an4l",
    "anal",
    "ass",
    "b.i.t.c.h",
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
    "bullshet",
    "bullshit",
    "c.o.c.k",
    "c.u.n.t",
    "ccunt",
    "cocck",
    "cock",
    "cockk",
    "cuck",
    "cucked",
    "cum",
    "cumming",
    "cunt",
    "cuntt",
    "cunty",
    "cyka blyat",
    "d!ck",
    "d1ck",
    "degroid",
    "dick",
    "downie",
    "erect",
    "erection",
    "f u c k",
    "f.a.g",
    "f4g",
    "fag",
    "fagg",
    "faggo",
    "faggot",
    "fap",
    "fapping",
    "fcking",
    "fckjng",
    "ffag",
    "ffuck",
    "fjuck",
    "fking",
    "fkn",
    "fucck",
    "fuccker",
    "fuck off",
    "fuck",
    "fucka",
    "fucked up",
    "fucker",
    "fucking",
    "fuckjing",
    "fuckjng",
    "fuckker",
    "fuckking",
    "fuckkk",
    "fucktard",
    "fuk",
    "fuq",
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
    "mother fucker",
    "motherfucker",
    "muthafucka",
    "muthafucker",
    "n i g g e r",
    "n word",
    "n.i.g.g.e.r",
    "n1gg3r",
    "n1gger",
    "nazi",
    "nazii",
    "negroid",
    "ni66a",
    "ni66er",
    "nibba",
    "nidger",
    "niga",
    "niger",
    "nigga",
    "nigger",
    "niggur",
    "p0rn",
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
    "retarded",
    "retart",
    "retarted",
    "s.l.u.t",
    "sex",
    "sh!t",
    "shit",
    "shithead",
    "sjw",
    "slut",
    "slutt",
    "slutty",
    "sluut",
    "suck my",
    "suicide",
    "that's gay",
    "thats gay",
    "thot",
    "tits",
    "titties",
    "titty",
    "tranny",
    "up your ass",
    "vagene",
    "vagina",
    "w.h.o.r.e",
    "wank",
    "wanker",
    "wanking",
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

const wordFilter = new WordFilter();
bannedSentences.forEach(sentence => wordFilter.addSentence(sentence));
bannedWords.forEach(word => wordFilter.addWord(word));

export function excludeIfNecessary(notifications: w.TextNotification[]) {
    const state = StoreProvider.getState();
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