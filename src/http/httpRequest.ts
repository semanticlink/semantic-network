import { LinkedRepresentation, LinkType, LinkUtil, RelationshipType } from 'semantic-link';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { DocumentRepresentation } from '../interfaces/document';
import { LinkRelation } from '../linkRelation';
import { Loader, LoaderJobOptions } from '../interfaces/loader';
import anylogger from 'anylogger';
import { bottleneckLoader } from './bottleneckLoader';

const log = anylogger('HttpRequest');

export class HttpRequest {
    private options: Required<HttpRequestOptions>;
    private readonly loader: Loader;

    constructor(options: Required<HttpRequestOptions>) {
        this.options = options;

        const { loader = bottleneckLoader } = { ...options };
        this.loader = loader;

        if (!loader) {
            throw new Error('Loader must be provided');
        }
    }

    /**
     * TODO: should probably return T | undefined
     */
    public async load<T extends LinkedRepresentation>(
        link: LinkType,
        rel: RelationshipType,
        options?: HttpRequestOptions & AxiosRequestConfig & LoaderJobOptions): Promise<AxiosResponse<T>> {

        const { getFactory = this.options.getFactory } = { ...options };

        // note: leaving media type out of id
        const id = LinkUtil.getUri(link, rel);
        if (id) {
            return await this.loader.schedule(id, () => getFactory<T>(link, rel, options), options);
        } else {
            log.warn('uri not found on link for id - using default loader');
            return await this.loader.submit(() => getFactory<T>(link, rel, options), options);
        }
    }

    public async update<T extends LinkedRepresentation>(
        resource: T,
        document: T | DocumentRepresentation<T>,
        options?: HttpRequestOptions & AxiosRequestConfig & LoaderJobOptions): Promise<AxiosResponse<void>> {

        const {
            rel = LinkRelation.Self,
            putFactory = this.options.putFactory,
        } = { ...options };

        return await this.loader.submit(() => putFactory(resource, rel, document, options), options);
    }

    public async create<T extends LinkedRepresentation>(
        resource: T,
        document: T | DocumentRepresentation<T>,
        options?: HttpRequestOptions & AxiosRequestConfig & LoaderJobOptions): Promise<AxiosResponse<T | undefined>> {

        const {
            rel = LinkRelation.Self,
            postFactory = this.options.postFactory,
        } = { ...options };

        return await this.loader.submit(() => postFactory(resource, rel, document, options), options);
    }

    public async del<T extends LinkedRepresentation>(
        resource: T,
        options?: HttpRequestOptions & AxiosRequestConfig & LoaderJobOptions): Promise<AxiosResponse<void>> {

        const {
            rel = LinkRelation.Self,
            deleteFactory = this.options.deleteFactory,
        } = { ...options };

        return await this.loader.submit(() => deleteFactory(resource, rel), options);
    }

}


