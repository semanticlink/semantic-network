import { ResourceFetchOptions } from './resourceFetchOptions';
import { Tracked } from '../types/types';
import { AxiosRequestConfig } from 'axios';

export type AddRequestHeaderStrategy = {
    (document: Tracked, options?: ResourceFetchOptions): AxiosRequestConfig;
};
