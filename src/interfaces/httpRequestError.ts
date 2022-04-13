import axios, { AxiosError } from 'axios';

export type HttpRequestError = AxiosError

/**
 * Supports detecting {@link axios} {@link AxiosError}
 */
export const isHttpRequestError = (e: unknown): e is HttpRequestError => axios.isAxiosError(e);
