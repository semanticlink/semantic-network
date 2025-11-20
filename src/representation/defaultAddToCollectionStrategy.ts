import { RepresentationUtil } from '../utils/representationUtil';
import { AddItemToCollectionStrategy } from '../interfaces/addItemToCollectionStrategy';

export const defaultAddToCollectionStrategy: AddItemToCollectionStrategy = (collection, item, addType) => {
    if (addType === 'prepend') {
        return RepresentationUtil.prependItemToCollection(collection, item);
    }
    return RepresentationUtil.appendItemToCollection(collection, item);
};
