import { AddRequestHeaderStrategy } from '../interfaces/addRequestHeaderStrategy';
import { AxiosRequestConfig } from 'axios';
import { Tracked } from '../types/types';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { Status } from './status';
import { CheckHeaders } from './checkHeaders';

/**
 * The goal is to leave all heavy lifting to the browser (ie implement caching rules). The key issue
 * here is whether to return the in-memory resource or push through to the browser request (ie xhr).
 */
export class RequestHeaders {

    /**
     * WARNING: if this is a CORS request that both pragma and cache-control must be registered as exposed
     *          Access-Control-Allow-Headers (otherwise failed CORS request in browser)
     *
     *          @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Request-Headers
     */
    public static noCacheHeader: AxiosRequestConfig = {
        headers: {
            // http 1.0 - @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
            'pragma': 'no-cache',
            // http 1.1/2
            'cache-control': 'no-cache',
        },
    };

    public static emptyHeaders: AxiosRequestConfig = {
        headers: {},
    };


    public static defaultStrategies: AddRequestHeaderStrategy[] = [
        RequestHeaders.noCacheOnStaleEtagStatusHeaderStrategy,
        RequestHeaders.noCacheOnStaleExpiresHeaderStrategy,
    ];

    /**
     * Add eTag detection for when feed items had the eTag included. Provides the request with a no-cache directive for http 1.0/1.1/2.
     *
     * Note: this directive used when a new resource based on eTag is detected the client requires the origin
     * server to provide a new resource. This is most likely to occur because of an out-of-band mechanism (ie another
     * process outside the direct context of the resource)
     *
     * In effect, this strategy mimics the "disable cache" mechanism if performing a manual intervention
     */
    public static noCacheOnStaleEtagStatusHeaderStrategy(resource: Tracked, options?: ResourceFetchOptions): AxiosRequestConfig {
        const {
            useStaleEtagStrategy = false,
        } = { ...options };

        if (useStaleEtagStrategy) {
            const trackedState = TrackedRepresentationUtil.getState(resource);
            if (trackedState.status === Status.staleFromETag) {
                return RequestHeaders.noCacheHeader;
            }
        }

        return RequestHeaders.emptyHeaders;
    }

    /**
     *  Detect that the resource has a stale 'expires' header
     */
    public static noCacheOnStaleExpiresHeaderStrategy(resource: Tracked): AxiosRequestConfig {
        const { headers  } = TrackedRepresentationUtil.getState(resource);

        if (headers && CheckHeaders.checkExpiresBeforeDateHeaderStrategy(headers)) {
            return RequestHeaders.noCacheHeader;
        }

        return RequestHeaders.emptyHeaders;
    }
}
