import { AddRequestHeaderStrategy } from '../interfaces/addRequestHeaderStrategy';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';

export const loadOnStaleETagAddIfNoneMatchesHeaderStrategy: AddRequestHeaderStrategy = (documentResource) => {
    return TrackedRepresentationUtil.hasETag(documentResource) ?
        { headers: { 'if-none-match': TrackedRepresentationUtil.getETag(documentResource) } } :
        {};

};

