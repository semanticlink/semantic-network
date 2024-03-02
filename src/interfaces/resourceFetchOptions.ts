import { AddRequestHeaderStrategy } from './addRequestHeaderStrategy';

export interface ResourceFetchOptions {

    /**
     * When set to true, the next check on the resource ensures that it flushes through the stack
     */
    readonly forceLoad?: boolean;
    /**
     * When set to true, the next check on the resource ensures that it flushes back through the network on the feed only
     * and not the items when {@link includeItems} is true. However, it still adheres to the server cache control. If you want
     * to do a force reload then also set the headers {@see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control}.
     */
    readonly forceLoadFeedOnly?: boolean;

    /**
     * When set to true, the next check on the resource looks through the expires header (if avaiable) to check whether the resource
     * requires fetching
     *
     * @default true
     */
    readonly checkExpiresHeader?: boolean;

    /**
     * When set to true, the next check on the resource looks through the cache-control headers (if available) to check whether the resource
     * requires fetching
     *
     * @default true
     */
    readonly checkCacheControlHeader?: boolean;

    /**
     * When set to true, the loader will detect a stale eTag state and then call the provided {@link AddRequestHeaderStrategy}
     *
     * @default false (currently experimental)
     */
    readonly useStaleEtagStrategy? : boolean;

    /**
     * When set to true, the loader will detect any eTags in the headers and provided back on the request in the 'if-none-match' header
     *
     * This functionality allows the server to provided the eTag in the feed and then detection back through to the server
     *
     * @default false (currently experimental)
     */
    readonly defaultStaleEtagAddRequestHeaderStrategy? : AddRequestHeaderStrategy;

}
