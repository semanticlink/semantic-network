import { LinkType, RelationshipType } from 'semantic-link';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { DocumentRepresentation } from './document';
import { Loader } from './loader';

export interface HttpRequestOptions {
    getFactory?: <T>(
        link: LinkType,
        rel: RelationshipType,
        options?: AxiosRequestConfig
    ) => Promise<AxiosResponse<T>>;
    putFactory?: <T>(
        link: LinkType,
        rel: RelationshipType,
        document: T | DocumentRepresentation<T>,
        options?: AxiosRequestConfig
    ) => Promise<AxiosResponse<void>>;
    postFactory?: <T>(
        link: LinkType,
        rel: RelationshipType,
        document: T | DocumentRepresentation<T>,
        options?: AxiosRequestConfig
    ) => Promise<AxiosResponse<T>>;
    deleteFactory?: (link: LinkType, rel: RelationshipType) => Promise<AxiosResponse<void>>;
    loader?: Loader;
    /**
     * Compatability flag to eat {@lnk HttpRequestError} and return undefined. This will be set to true in future versions.
     *
     * @default false
     * @see defaultRequestOptions.throwOnCreateError
     */
    throwOnCreateError?: boolean;
    /**
     * Compatability flag to eat {@lnk HttpRequestError}. This will be set to true in future versions.
     *
     * @default false
     * @see defaultRequestOptions.throwOnUpdateError
     */
    throwOnUpdateError?: boolean;
    /**
     * Compatability flag to eat {@lnk HttpRequestError}. This will be set to true in future versions.
     *
     * @default false
     * @see defaultRequestOptions.throwOnLoadError
     */
    throwOnLoadError?: boolean;
}

