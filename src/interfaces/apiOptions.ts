import { ResourceQueryOptions } from './resourceQueryOptions';
import { ResourceFetchOptions } from './resourceFetchOptions';
import { ResourceLinkOptions } from './resourceLinkOptions';
import { ResourceAssignOptions } from './resourceAssignOptions';
import { ResourceFactoryOptions } from './resourceFactoryOptions';
import { ResourceUpdateOptions } from './resourceUpdateOptions';
import { MergeOptions } from './mergeOptions';
import { HttpRequestOptions } from './httpRequestOptions';
import { LoaderJobOptions } from './loader';

export type ApiOptions =
    ResourceQueryOptions &
    ResourceFetchOptions &
    ResourceLinkOptions &
    ResourceAssignOptions &
    ResourceFactoryOptions &
    ResourceUpdateOptions &
    HttpRequestOptions &
    MergeOptions &
    LoaderJobOptions;
