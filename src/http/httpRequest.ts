import { LinkedRepresentation, LinkType, RelationshipType } from 'semantic-link';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { DocumentRepresentation } from '../interfaces/document';
import { LinkRelation } from '../linkRelation';
import { Loader } from './loader';

export class HttpRequest {
    private options: Required<HttpRequestOptions>;
    private loader: Loader;

    constructor(options: Required<HttpRequestOptions>) {
        this.options = options;
        // currently not injected
        this.loader = new Loader();
    }

    /**
     * TODO: should probably return T | undefined
     * @param link
     * @param rel
     * @param options
     */
    public async load<T extends LinkedRepresentation>(
        link: LinkType,
        rel: RelationshipType,
        options?: HttpRequestOptions & AxiosRequestConfig): Promise<AxiosResponse<T>> {

        const { getFactory = this.options.getFactory } = { ...options };

        // note: leaving media type out
        // const id = LinkUtil.getUri(link, rel);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // return await this.loader.schedule(id, getFactory, link, rel, options);
        return await getFactory<T>(link, rel, options);
    }

    public async update<T extends LinkedRepresentation>(
        resource: T,
        document: T | DocumentRepresentation<T>,
        options?: HttpRequestOptions & AxiosRequestConfig): Promise<AxiosResponse<void>> {

        const {
            rel = LinkRelation.Self,
            putFactory = this.options.putFactory,
        } = { ...options };

        return await putFactory(resource, rel, document, options);
    }

    public async create<T extends LinkedRepresentation>(
        resource: T,
        document: T | DocumentRepresentation<T>,
        options?: HttpRequestOptions & AxiosRequestConfig): Promise<AxiosResponse<T | undefined>> {

        const {
            rel = LinkRelation.Self,
            postFactory = this.options.postFactory,
        } = { ...options };

        return await postFactory(resource, rel, document, options);
    }

    public async del<T extends LinkedRepresentation>(
        resource: T,
        options?: HttpRequestOptions & AxiosRequestConfig): Promise<AxiosResponse<void>> {

        const {
            rel = LinkRelation.Self,
            deleteFactory = this.options.deleteFactory,
        } = { ...options };

        return await deleteFactory(resource, rel);
    }

}


