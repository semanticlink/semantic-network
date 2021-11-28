import Bottleneck from 'bottleneck';
import anylogger from 'anylogger';

const log = anylogger('Loader');

/**
 * Wrapper over the Bottleneck options
 * @see {@Link Loader.defaultOptions}
 */
export type LoaderOptions = Bottleneck.ConstructorOptions;

/**
 * Loading service to allow for rate limiting and prioritising concurrent requests and
 * being able to cancel some or all requests.
 *
 * Wraps bottleneck and axios cancellables in the background using es6 promises.
 *
 */
export class Loader {
    requests: Record<string, any>;
    private readonly _currentOptions: Bottleneck.ConstructorOptions;
    private readonly _cancel: () => Promise<void>;

    constructor(options: Bottleneck.ConstructorOptions = {}) {
        this._currentOptions = options;

        this._limiter = Loader.limiterFactory(options);

        this.requests = [];

        this._cancel = () => this._limiter.stop();

        this._limiter.on(Loader.event.ERROR, error => {
            log.error('[Limiter] Error: %s', error);
        });

        this._limiter.on(Loader.event.DEBUG, message => {
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
     * @return {module:bottleneck.ConstructorOptions|*}
     */
    public get currentOptions(): Bottleneck.ConstructorOptions {
        return this._currentOptions;
    }

    /**
     * Make a new limiter with the options
     */
    public static limiterFactory(options: Bottleneck.ConstructorOptions): Bottleneck {
        log.debug('limiter factory created');
        return new Bottleneck({ ...Loader.defaultOptions, ...options });
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
     * @param {string} id
     * @param {PromiseLike<T>} action
     * @param {*[]} args
     * @return {Promise<AxiosResponse>}
     */
    public async schedule<T>(id: string, action: () => Promise<T>, ...args: any[]): Promise<T> {
        log.debug('pending requests (%s total)', this.requests.length);

        if (!this.requests[id]) {
            const p = new Promise<T>(async (resolve, reject) => {

                try {
                    const result = await this._limiter.schedule({ id }, action, args);

                    log.debug(`[Loader] resolved '${id}' (${this.requests[id].promises.length} subsequent requests)`);

                    // Do this before request is resolved,
                    // so a request with the same id must now resolve to a new request
                    delete this.requests[id];

                    // resolving with chain through to the subsequent requests
                    resolve(result);
                } catch (error) {
                    // Do this before request is resolved,
                    // so a request with the same id must now resolve to a new request
                    delete this.requests[id];
                    reject(error);
                }
            });

            this.requests[id] = {
                request: p,
                promises: [],
            };

            log.debug('add \'%s\' (%s in queue)', id, this.requests[id].promises.length);

            return p;
        } else {
            // construct an array of promises that will be resolved with the original request value
            const p = new Promise<T>(async (resolve, reject) => {
                try {
                    const result = await this.requests[id].request;
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
            this.requests[id].promises.push(p);
            log.debug('queued \'%s\' (%s in queue)', id, this.requests[id].promises.length);
            return p;
        }
    }

    /**
     * This method wraps the limiter scheduler.
     *
     * This is primarily used for POST, PUT, PATCH, DELETE requests
     *
     * @param {PromiseLike<T>} action
     * @param {*[]} args

     * @return {*}
     */
    public submit<T>(action: () => PromiseLike<T>, ...args: any[]): Promise<T> {
        return this._limiter.schedule(action, args);
    }

    /**
     * Stop all current and pending requests and reset all queues.
     */
    public async clearAll(): Promise<void> {
        const { RECEIVED, RUNNING, EXECUTING, QUEUED } = this._limiter.counts();
        const itemsQueued = RECEIVED + QUEUED + RUNNING + EXECUTING;

        if (itemsQueued === 0) {
            log.debug('no requests to clear');
            return;
        }

        log.debug('aborting all request (%s in queue)', itemsQueued);

        // this will abort any xhr requests
        try {
            await this._cancel();
            // unfortunately, we still need one! TODO: ask library for update to be able to clear queues and keep running
            this._limiter = Loader.limiterFactory(this._currentOptions);
        } catch (e) {
            log.warn('Stopping loader: %s');
        }
    }
}

const loader = new Loader();

export { loader };
