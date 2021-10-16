import axios, { AxiosError } from 'axios';

export type HttpRequestError = AxiosError

export const isHttpRequestError = (e: unknown): e is HttpRequestError => axios.isAxiosError(e);
