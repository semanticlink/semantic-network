import { Comparator } from '../../interfaces/comparator';
import { Tracked } from '../../types/types';
import { TrackedRepresentationUtil } from '../trackedRepresentationUtil';

/**
 * Simple match on the eTag in the header of a {@link Tracked}
 */
export const eTag: Comparator<Tracked> = (lvalue: Tracked, rvalue: Tracked): boolean => {
    /*
    if (instanceOfTrackedRepresentation(lvalue) && instanceOfTrackedRepresentation(rvalue)){
        return TrackedRepresentationUtil.getETag(lvalue) === TrackedRepresentationUtil.getETag(rvalue);
    } else {
        // because both are not eTagged then treat them as the same
        return true;
    }
    */
    return TrackedRepresentationUtil.getETag(lvalue) === TrackedRepresentationUtil.getETag(rvalue);
};
