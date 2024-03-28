import { ApiOptions } from '../interfaces/apiOptions';
import { LinkRelConvertUtil } from './linkRelConvertUtil';

export class ResourceUtil {
    /**
     * Given a set of {@link ApiOptions}, use the {@link ApiOptions.name} and {@ApiOptions.rel}
     * properties to determine a name.
     *
     * Note: a valid name is always returns or throw error
     */
    public static makeName(options?: ApiOptions): string {
        const { name = undefined, rel = undefined } = { ...options };
        if (name) {
            return name;
        }
        if (rel) {
            const relName = LinkRelConvertUtil.relTypeToCamel(rel);
            if (relName) {
                return relName;
            }
        }
        throw new Error(`Options must have a rel or name`);
    }

}
