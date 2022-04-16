export interface ResourceFetchOptions {

    /**
     * When set to true, the next check on the resource ensures that it flushes through the stack
     */
    readonly forceLoad?: boolean;
    /**
     * When set to true, the next check on the resource ensures that it flushes back through the network on the feed only
     * and not the items when {@link includeItems} is true. However, it still adheres to the server cache control. If you want
     * to do a force reload then also set the {@link noCache} or {@link cacheControl} headers.
     */
    readonly forceLoadFeedOnly?: boolean;
}
