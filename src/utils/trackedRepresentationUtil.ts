import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import { StandardResponseHeader, state, Tracked } from '../types/types';
import { State } from '../representation/state';
import anylogger from 'anylogger';
import { LinkRelation } from '../linkRelation';
import { Status } from '../representation/status';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import { ResourceAssignOptions } from '../interfaces/resourceAssignOptions';
import { SingletonMerger } from '../representation/singletonMerger';
import { instanceOfCollection } from './instanceOf/instanceOfCollection';
import { instanceOfTrackedRepresentation } from './instanceOf/instanceOfTrackedRepresentation';
import { CheckHeaders } from '../representation/checkCacheControlHeaderStrategy';

const log = anylogger('TrackedRepresentationUtil');

export class TrackedRepresentationUtil {
    /**
     * Return back the internal {@link State} object for tracking and introspection
     * @param resource
     */
    public static getState<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U): State {
        const tracking = resource[state];
        if (!tracking) {
            const uri = LinkUtil.getUri(resource, LinkRelation.Self);
            if (uri) {
                log.debug('state not found on %s', uri);
            } else {
                log.debug('state not found on unknown');
            }
        }
        return tracking;
    }

    /**
     * Set the headers inside the internal {@link State} object for tracking and introspection
     */
    public static setHeaders<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U, headers: Record<StandardResponseHeader | string, string>): State {
        const tracking = resource[state];
        if (tracking) {
            tracking.headers = headers;
        }
        return tracking;
    }

    /**
     * Helper to set resource to {@link Status.stale}  so that the cache forces need fetch
     */
    public static setStateStale<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U): void {
        this.setState(resource, Status.stale);
    }

    /**
     * Helper to set resource to {@link Status.staleFromETag} so that the cache forces need fetch
     */
    public static setStateStaleFromETag<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U): void {
        this.setState(resource, Status.staleFromETag);
    }

    /**
     * Looks through into the {@link State} headers for the ETag
     */
    public static getETag<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U): string | undefined {
        const state = this.getState(resource);
        // permissive naming strategy for eTags
        const { headers: { etag, ETag, eTag } } = { ...state };
        return etag || ETag || eTag;
    }

    /**
     * Looks through into the {@link State} headers for the ETag
     */
    public static getFeedETag<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U): string | undefined {
        const state = this.getState(resource);
        // permissive naming strategy for eTags
        const { feedHeaders: { etag, ETag, eTag } } = { ...state };
        return etag || ETag || eTag;
    }

    /**
     * Sets the value of the feed eTag and if null is provided, it is cleared
     * @param resource
     * @param eTag
     */
    public static setFeedETag<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U, eTag?: string): void {
        const state = this.getState(resource);
        if (eTag) {
            state.feedHeaders = { ...state.feedHeaders, etag: eTag };
        } else {
            delete state.feedHeaders.etag;
        }
    }

    /**
     * Checks if an eTag exists based on looking through into the {@link State} headers for the ETag
     */
    public static hasETag<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U): boolean {
        return this.getETag(resource) !== undefined;
    }

    /**
     * Checks if an eTag exists based on looking through into the {@link State} headers for the ETag
     */
    public static hasFeedETag<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U): boolean {
        return this.getFeedETag(resource) !== undefined;
    }

    /**
     * Checks if the header eTag matches the feed eTag. It is deemed stale when both eTags are present and different
     * suggesting that the latest is not present
     */
    public static hasStaleFeedETag<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U): boolean {
        const feedETag = this.getFeedETag(resource);
        const requestETag = this.getETag(resource);
        return feedETag !== undefined &&
            requestETag !== undefined &&
            requestETag !== feedETag;
    }

    /**
     * Checks the named child object is tracked on the resource.
     *
     * A resource keeps a set of child singletons and a set of child collections. This utility
     * provides a logical 'in' operator on those sets.
     *
     * Note: field name ideally comes in as K only, but in practice it also needs to be dealt with as arbitrary string
     *       as soon as it is known to be a tracked representation then it can cast string to K (rather than deal with
     *       string in the subsequent methods
     */
    public static isTracked<T extends Tracked<LinkedRepresentation> | LinkedRepresentation | Partial<LinkedRepresentation>,
        K extends keyof T = keyof T>(
        resource: T,
        name: K | string): boolean {
        return instanceOfTrackedRepresentation(resource) &&
            (this.isSingletonTracked(resource, name as K) || this.isCollectionTracked(resource, name as K));
    }

    /**
     * Checks the resource is currently tracked in either as a singleton or a collection
     */
    public static getTrackedFields<T extends Tracked<LinkedRepresentation> | LinkedRepresentation,
        K extends keyof T>(
        resource: T): K[] {

        return instanceOfTrackedRepresentation(resource) ?
            [...this.getState(resource).collection, ...this.getState(resource).singleton] as K[] :
            [];
    }

    /**
     * Checks whether the resource requires an across-the-wire fetch based on the state flags.
     *
     * We can only do a fetch when we actually have a potentially valid uri and that we haven't already
     * got the resource. Currently, the forceLoad allows an override which is an initial cache busting
     * strategy that will need improvement
     *
     * Simple cache bust strategy which is an override switch. To be expanded as needed. Currently, only
     * cache bust on {@link Status.hydrated} resources. There is no time-based, refresh strategy at this point.
     *
     */
    public static needsFetchFromState<T extends Tracked<LinkedRepresentation>>(
        resource: T,
        options?: ResourceFetchOptions): boolean {

        const { forceLoad = false } = { ...options };
        const { status = undefined } = this.getState(resource);

        if (status) {
            const fetch = /*status === Status.unknown ||*/
                status === Status.locationOnly ||
                status === Status.stale ||
                status === Status.staleFromETag ||
                (forceLoad && status === Status.hydrated);

            if (fetch) {
                log.debug('fetch resource \'%s\': %s', status.toString(), LinkUtil.getUri(resource, LinkRelation.Self));
            } else {
                log.debug('fetch resource \'%s\' not required: %s', status.toString(), LinkUtil.getUri(resource, LinkRelation.Self));
            }

            return fetch;
        } else {
            log.warn('status not found (on state): %s', LinkUtil.getUri(resource, LinkRelation.Self));
            return true;
        }
    }

    /**
     * Respects conditional headers from the server on whether to push back through the application cache. Without it,
     * client developers use {@link ResourceFetchOptions.forceLoad} option too often because requests do not respect the server cache-control
     * headers.
     *
     * Note: this code will not attempt to reimplement request headers (that is what browsers already do). However, what
     *       you may find is inconsistent behaviours between browsers on request cache control headers
     *
     *       @see https://gertjans.home.xs4all.nl/javascript/cache-control.html
     */
    public static needsFetchFromHeaders<T extends Tracked<LinkedRepresentation>>(
        resource: T,
        options?: ResourceFetchOptions): boolean {

        const {
            checkHeaderStrategies = CheckHeaders.defaultStrategies,
        } = { ...options };

        const { headers = {} } = this.getState(resource);
        const now = new Date();

        for (const strategy of checkHeaderStrategies) {
            if (strategy(headers, now)) {
                return true;
            }
        }

        return false;
    }

    /**
     *
     * Returns target.
     *
     * @param target
     * @param prop
     * @param resource
     * @param options
     */
    public static add<T extends LinkedRepresentation, U extends LinkedRepresentation>(
        target: T,
        prop: keyof T | string,
        resource: U,
        options?: ResourceAssignOptions): T {
        if (instanceOfTrackedRepresentation(target)) {
            // add as a tracked collection/singleton on state
            if (instanceOfCollection(resource)) {
                this.getState(target).collection.add(prop as string);
            } else {
                this.getState(target).singleton.add(prop as string);
            }
            SingletonMerger.add(target, prop, resource, options);
        } else {
            log.warn('target is not a tracked representation and cannot add resource; \'%s\'', LinkUtil.getUri(target, LinkRelation.Self));
        }
        return target;
    }

    private static setState<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U, status: Status) {
        if (instanceOfTrackedRepresentation(resource)) {
            const state = TrackedRepresentationUtil.getState(resource);
            state.status = status;
        }
    }

    /**
     * Checks the resource is currently tracked as a singleton
     */
    private static isSingletonTracked<T extends Tracked<LinkedRepresentation>,
        K extends keyof T>(
        resource: T,
        name: K): boolean {
        return this.getState(resource).singleton.has(name as string);
    }

    /**
     * Checks the resource is currently tracked as a collection
     */
    private static isCollectionTracked<T extends Tracked<LinkedRepresentation>,
        K extends keyof T>(
        resource: T,
        name: K): boolean {
        return this.getState(resource).collection.has(name as string);
    }
}

