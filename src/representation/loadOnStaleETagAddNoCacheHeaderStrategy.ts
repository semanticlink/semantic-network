import { AddRequestHeaderStrategy } from '../interfaces/addRequestHeaderStrategy';

export const loadOnStaleETagAddNoCacheHeaderStrategy: AddRequestHeaderStrategy = () => {
    return {
        headers: {
            // http 1.0 - @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
            'pragma': 'no-cache',
            // http 1.1/2
            'cache-control': 'no-cache',
        },
    };
};
