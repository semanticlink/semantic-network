import { AddRequestHeaderStrategy } from '../interfaces/addRequestHeaderStrategy';
import { AxiosRequestConfig } from 'axios';

/**
 * Provides the request with a no-cache directive for http 1.0/1.1/2.
 *
 * Note: this directive used when a new resource based on eTag is detected the client requires the origin
 * server to provide a new resource. This is most likely to occur because of an out-of-band mechanism (ie another
 * process outside the direct context of the resource)
 *
 * In effect, this strategy mimics the "disable cache" mechanism if performing a manual intervention
 */
export const loadOnStaleETagAddNoCacheHeaderStrategy: AddRequestHeaderStrategy = (): AxiosRequestConfig => {
    return {
        headers: {
            // http 1.0 - @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
            'pragma': 'no-cache',
            // http 1.1/2
            'cache-control': 'no-cache',
        },
    };
};
