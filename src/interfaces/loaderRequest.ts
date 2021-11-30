export interface LoaderRequest {
    request: Promise<any>
    promises: Promise<any>[]
}
