declare namespace Kongregate {
    interface Loader {
        loadAPI(callback: () => void): void;
        getAPI(): SDK;
    }

    interface SDK {
        services: Services;
    }

    interface Services {
        getUserId(): number;
        getGameAuthToken(): string;
    }
}