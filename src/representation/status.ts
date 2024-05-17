/**
 * Enum for the state of a resource
 */
export enum Status {
    /**
     * The resource is known to exist but the URI of the resource
     * is not known. None of the attribute values will be known.
     *
     * This object at this stage probably doesn't exist in the network of data
     * in-memory form. Although it might be attached as an attribute on an existing
     * resource. We know we want a resource but are still trying to work it out.
     */
    unknown,

    /**
     * The resource only has a link relation 'Self' with the URI
     * of the resource. None of the attribute values will be known.
     *
     * @example
     * {
     *   links: {
     *      Self: 'http://example.com/item/1'
     *   }
     * }
     */
    locationOnly,

    /**
     * This state is **only** available for a **feedItem** resource (ie on a
     * collection `items` attribute that has been
     * transformed from its across-the-wire form into a resource.
     * This state is requires that the title attribute is loaded
     * (and hence is the difference from locationOnly)
     *
     * @example on the `items` attribute inside the collection
     *
     * Originally in the across-the-wire feed (with feed items) representation:
     *
     * {
     *   links: {
     *      Self: 'http://example.com/collection/'
     *   }
     *   items: [
     *      { id: 'http://example.com/item/1', title: 'First item' }
     *   ]
     * }
     *
     *
     * Becomes two resources (a collection resource with resource):
     * {
     *   links: {
     *      Self: 'http://example.com/collection/'
     *   }
     *   items: [
     *      {                      **<-- this resource state is `feedOnly`**
     *          links: {
     *           Self: 'http://example.com/item/1'
     *           }
     *           title: 'First item'
     *      }
     *   ]
     * }
     *
     * Note: in this example, the collection resource state is `hydrated`
     *
     */
    feedOnly,

    /**
     * The resource has been retrieved from the server (and is synchronised). At
     * this point, there is over-the-wire response headers in {@link headers}
     */
    hydrated,

    /**
     * The resource has been marked as ready to be deleted. At this point, updates
     * should not be made
     */
    deleteInProgress,

    /**
     * The resource has successfully been deleted on the server and is ready for
     * garbage collection
     */
    deleted,

    /**
     * The resource has been tried to be accessed and is disallowed
     */
    forbidden,

    /**
     * This resource is a client-side artifact which is a placeholder for other resources. As such, there
     * is no server-side resource to be retrieved. It is used rarely and is more of the group of
     * {@link unknown}, {@link locationOnly} - however, we know that we will never retrieve it
     * unlike {@link unknown} where it may or may not be updated with a location.
     */
    virtual,

    /**
     * The client-side artifact has been marked as stale and next time should be retrieved. This is likely
     * to happen when collection item has been deleted, the collection should be marked as stale.
     */
    stale,

    /**
     * The client-side feed has provided an eTag that marks the resource as needed to be retrieved with 'if-none-match' header.
     */
    staleFromETag,
}
