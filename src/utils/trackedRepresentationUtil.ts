import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import { state, Tracked } from '../types/types';
import { State } from '../representation/state';
import anylogger from 'anylogger';
import { LinkRelation } from '../linkRelation';
import { Status } from '../representation/status';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import { ResourceAssignOptions } from '../interfaces/resourceAssignOptions';
import { SingletonMerger } from '../representation/singletonMerger';
import { instanceOfCollection } from './instanceOf/instanceOfCollection';
import { instanceOfTrackedRepresentation } from './instanceOf/instanceOfTrackedRepresentation';

const log = anylogger('TrackedRepresentationUtil');

export class TrackedRepresentationUtil {
    public static getState<T extends LinkedRepresentation, U extends Tracked<T>>(resource: U): State {
        const tracking = resource[state];
        if (!tracking) {
            const uri = LinkUtil.getUri(resource, LinkRelation.Self);
            if (uri) {
                log.error('state not found on %s', uri);
            } else {
                log.error('state not found on unknown');
            }
        }
        return tracking;
    }

    /**
     * Checks the resource is currently tracked in either as a singleton or a collection
     */
    public static isTracked<T extends Tracked<LinkedRepresentation> | LinkedRepresentation | Partial<LinkedRepresentation>,
        K extends keyof T = keyof T>(
        resource: T,
        name: K | string): boolean {

        // note: field name ideally comes in as K only, but in practice it also needs to be dealt with as arbitrary string
        //       as soon as it known to be a tracked representation then it can cast string to K (rather than deal with
        //       string in the subsequent methods

        if (instanceOfTrackedRepresentation(resource)) {
            return instanceOfCollection(resource) ?
                this.isCollectionTracked(resource, name as K) :
                this.isSingletonTracked(resource, name as K);
        }

        return false;
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
     * client developers use 'forceLoad' option too often because requests do not respect the server cache-control
     * headers.
     *
     * Note: this code will not attempt to reimplement request headers (that is what browsers already do). However, what
     *       you may find is inconsistent behaviours between browsers on request cache control headers
     *
     *       @see https://gertjans.home.xs4all.nl/javascript/cache-control.html
     */
    public static needsFetchFromHeaders<T extends Tracked<LinkedRepresentation>>(resource: T): boolean {
        const { headers = {} } = this.getState(resource);
        /*
         * The goal is to leave all heavy lifting up to the browser (ie implement caching rules). The key issue
         * here is whether to return the in-memory resource or push through to the browser request (ie xhr).
         *
         * The main issue is whether "time" is up and a potential refresh is required. This calculation is the
         * last-modified + max-age. However, the server provides this as an absolute date in the expires header.
         */
        if (headers.expires) {
            return new Date() > new Date(headers.expires);
        }

        /*
        // it is possible the expires header is not provided and the following logic may be required in the future
        // yarn add @tusbar/cache-control
        // TODO: headers map doesn't allow for title case
        //
        const cacheControl = this.headers['cache-control'];
        if (cacheControl) {
            const headers = parse(cacheControl);

            if (headers.maxAge === 0 || headers.noCache) {
                return true;
            }
            if (headers.mustRevalidate) {
                const lastModified = this.headers['last-modified'];
                if (lastModified) {
                    const date = new Date(lastModified);
                    date.setSeconds(date.getSeconds() + headers.maxAge || 0);
                    return now > date;
                }
            }
        }
        */

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
        return target as T;
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
