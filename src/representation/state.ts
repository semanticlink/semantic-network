import { Status } from './status';
import { StandardResponseHeader } from '../types/types';
import { HttpRequestError } from '../interfaces/httpRequestError';

export class State {


    /**
     * Current state of the {@link TrackedRepresentation}
     */
    status: Status;
    /**
     * Error added on 400 & 500 {@link Status.unknown}, {@link Status.forbidden} and {@link Status.unknown}
     */
    error?: HttpRequestError;
    /**
     * Previous state of the {@link TrackedRepresentation}
     */
    previousStatus: Status | undefined;
    /**
     * List of the named singleton resources which have been added onto the resource.
     */
    readonly singleton: Set<string>;
    /**
     * List of named collection resources which have been added onto the resource.
     */
    readonly collection: Set<string>;
    /**
     * Header meta data from the across-the-wire response
     *
     * TODO: axios changed its implementation away from array to record (object)
     */
    headers: Record<StandardResponseHeader | string, string>;
    /**
     * Time when the resource was last retrieved
     */
    retrieved: Date | undefined;

    /**
     * Header values that are eager provided via a feed. Currently, only eTags are likely to be provided
     */
    feedHeaders: Record<StandardResponseHeader | string, string>;

    constructor(status?: Status, eTag?: string) {
        this.status = status || Status.unknown;
        this.previousStatus = undefined;
        this.singleton = new Set<string>();
        this.collection = new Set<string>();
        this.headers = {};
        this.retrieved = undefined;
        this.feedHeaders = { ...(eTag && { etag: eTag }) };
    }
}

