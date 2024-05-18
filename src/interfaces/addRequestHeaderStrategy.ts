import { ResourceFetchOptions } from './resourceFetchOptions';
import { Tracked } from '../types/types';
import { AxiosHeaders, RawAxiosRequestHeaders } from 'axios';

export type AddRequestHeaderStrategy = {
    (document: Tracked, options?: ResourceFetchOptions): Partial<RawAxiosRequestHeaders | AxiosHeaders>;
};
