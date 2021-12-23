import Bottleneck from 'bottleneck';
import anylogger from 'anylogger';
import { Loader, LoaderJobOptions, LoaderOptions } from '../interfaces/loader';
import { LoaderRequest } from '../interfaces/loaderRequest';

const log = anylogger('Loader');


/**
 * Loading service to allow for rate limiting and prioritising concurrent requests and
 * being able to cancel some or all requests.
 *
 * Wraps bottleneck and axios cancellable in the background using es6 promises.
 *
 */
export class BottleneckLoader implements Loader {
    public readonly requests: Map<string, LoaderRequest>;
    private readonly _currentOptions: Bottleneck.ConstructorOptions;

    constructor(options: LoaderOptions = {}) {
        this._currentOptions = options;
        this._limiter = BottleneckLoader.limiterFactory(options);
        this.requests = new Map<string, LoaderRequest>();

        this._limiter.on(BottleneckLoader.event.ERROR, error => {
            log.error('[Limiter] Error: %s', error);
        });

        this._limiter.on(BottleneckLoader.event.DEBUG, message => {
            // this is quite noisy so limiting down to trace
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (log.level === 7) {
                log.debug('[Limiter] %s', message);
            }
        });
    }

    /**
     */
    public static get defaultOptions(): LoaderOptions {
        return {
            // num of jobs that can be running at the same time
            maxConcurrent: 5,
            // immediately launch the next job
            minTime: 0,
            // default: how long can the queue get? At this stage unlimited
            highWater: null,
            // this is actually the default
            strategy: Bottleneck.strategy.LEAK,
            // use es6 promise over the default Bluebird
            Promise: Promise,
        };
    }

    /**
     * @see {@link Bottleneck.on}
     * @return {{EMPTY: string, IDLE: string, DROPPED: string, DEPLETED: string, DEBUG: string, ERROR: string}}
     */
    public static get event(): LoaderOptions {
        return {
            EMPTY: 'empty',
            IDLE: 'idle',
            DROPPED: 'dropped',
            DEPLETED: 'depleted',
            DEBUG: 'debug',
            ERROR: 'error',
        };
    }

    private _limiter: Bottleneck;

    /**
     * Access to the limiter. Chain the methods of this instance if you require it
     *
     * @example loader.limiter.on(loader.event.DEBUG, () => {});
     * @example itemsInQueue = loader.limiter.queued();
     * @example loader.limiter.schedule( ...
     */
    public get limiter(): Bottleneck {
        return this._limiter;
    }

    /**
     * Current options in the limiter
     */
    public get currentOptions(): Bottleneck.ConstructorOptions {
        return this._currentOptions;
    }

    /**
     * Make a new limiter with the options
     */
    public static limiterFactory(options: Bottleneck.ConstructorOptions): Bottleneck {
        log.debug('limiter factory created');
        return new Bottleneck({ ...BottleneckLoader.defaultOptions, ...options });
    }

    /**
     * This method wraps the limiter scheduler because it cannot deal with multiple requests at the same time on
     * the same 'id'. This queues up subsequent requests and then resolves them upon the original request.
     *
     * This is primarily used for GET requests.
     *
     * Note: this is a naive implementation of queue clearing.
     *
     * TODO: cancelled promises need to be cleared out of this queue too
     *
     * @see https://github.com/SGrondin/bottleneck/issues/68
     *
     */
    async schedule<T>(id: string, action: () => Promise<T>, options?: LoaderJobOptions | undefined): Promise<T> {
        log.debug('request queue pending (%s total)', this.requests.size);

        const request = this.requests.get(id);
        if (!request) {
            const p = new Promise<T>(async (resolve, reject) => {

                try {

                    const { loaderJob } = { ...options };
                    const result = await this._limiter.schedule({ ...loaderJob, id }, action);

                    // Do this before request is resolved,
                    // so a request with the same id must now resolve to a new request
                    log.debug('request queue remove \'%s\'', id);
                    this.requests.delete(id);

                    // resolving with chain through to the pending requests
                    resolve(result);
                } catch (error) {
                    // Do this before request is resolved,
                    // so a request with the same id must now resolve to a new request
                    this.requests.delete(id);
                    reject(error);
                }
            });


            this.requests.set(id, { request: p, promises: [] });

            log.debug('request queue add \'%s\'', id);

            return p;
        } else {
            // construct an array of promises that will be resolved with the original request value
            const p = new Promise<T>(async (resolve, reject) => {
                try {
                    const result = await request.request;
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
            request.promises.push(p);
            log.debug('request queue resolved \'%s\' (%s in queue)', id, request.promises.length);
            return p;
        }
    }

    /**
     * This method wraps the limiter scheduler.
     *
     * This is primarily used for POST, PUT, PATCH, DELETE requests
     */
    submit<T>(action: () => PromiseLike<T>, options?: LoaderJobOptions | undefined): Promise<T> {
        return this._limiter.schedule(action, options);
    }

    /**
     * Stop all current and pending requests and reset all queues.
     */
    async clearAll(): Promise<void> {
        const { RECEIVED, RUNNING, EXECUTING, QUEUED } = this._limiter.counts();
        const itemsQueued = RECEIVED + QUEUED + RUNNING + EXECUTING;

        if (itemsQueued === 0) {
            log.debug('no requests to clear');
            return;
        }

        log.debug('aborting all request (%s in queue)', itemsQueued);

        // this will abort any xhr requests
        try {
            await this._limiter.stop();
            // unfortunately, we still need one! TODO: ask library for update to be able to clear queues and keep running
            this._limiter = BottleneckLoader.limiterFactory(this._currentOptions);
        } catch (e) {
            log.warn('stopping loader failure');
        }
    }

    getRequest(id: string): LoaderRequest | undefined {
        return this.requests.get(id);
    }
}

const bottleneckLoader = new BottleneckLoader();

export { bottleneckLoader };
