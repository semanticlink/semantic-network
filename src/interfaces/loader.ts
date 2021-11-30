import { LoaderRequest } from './loaderRequest';
import Bottleneck from 'bottleneck';

/**
 * Wrapper over the Bottleneck options
 * @see {@Link Loader.defaultOptions}
 */
export type LoaderOptions = Bottleneck.ConstructorOptions;
/**
 * Wrapper over the {@see Bottleneck.JobOptions}
 */
export interface LoaderJobOptions {
    loaderJob?: Bottleneck.JobOptions
}

export interface Loader {

    /**
     * Schedules a request based on an id
     */
    schedule<T>(id: string, action: () => Promise<T>, options?: LoaderJobOptions): Promise<T>;

    /**
     * Submits (schedules) a request
     */
    submit<T>(action: () => PromiseLike<T>, options?: LoaderJobOptions): Promise<T>;

    /**
     * Stop all current and pending requests and reset all queues.
     */
    clearAll(): Promise<void>;

    /**
     * Returns back a pending request if exists
     */
    getRequest(id: string): LoaderRequest | undefined;
}
