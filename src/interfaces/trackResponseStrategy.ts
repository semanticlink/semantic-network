import { AxiosResponse } from 'axios';

export type TrackResponseStrategy = (axiosResponse: AxiosResponse, trackResponse: boolean) => unknown;
