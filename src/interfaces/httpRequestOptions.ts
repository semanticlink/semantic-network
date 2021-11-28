import { LinkType, RelationshipType } from 'semantic-link';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { DocumentRepresentation } from './document';

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
}

