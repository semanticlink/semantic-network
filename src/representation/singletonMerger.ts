import { ResourceAssignOptions, ResourceMergeOptions } from '../interfaces/resourceAssignOptions';

export const defaultOptions: ResourceMergeOptions = {};

let optionsInstance: ResourceMergeOptions;

export const createInstance = (options?: ResourceMergeOptions): ResourceMergeOptions => {

    if (!optionsInstance) {
        optionsInstance = { ...defaultOptions, ...options };
    }

    return optionsInstance;
};

export const options = createInstance();

/**
 * A helper class for manipulating items in a {@link SingletonRepresentation}.
 */
export class SingletonMerger {

    /**
     * Copy the values of all the enumerable own properties from one or more source objects to a target object.
     * Returns the target object.
     *
     * @param target The target object to copy to
     * @param source The source object from which to copy properties
     * @param options
     */
    public static merge<T extends object, U>(target: T, source: U, options?: ResourceMergeOptions): Extract<U, T> {

        const { set = optionsInstance.set } = { ...options };

        if (set) {
            for (const key in source) {
                set(target, key, source[key]);
            }
            return target as Extract<U, T>;
        }

        /** ensure that the original object (and bindings) are returned—ie don't use spread */
        return Object.assign(target, source) as Extract<U, T>;
    }

    /**
     * Adds a resource object to the target object on the named property.
     * Returns the target object
     *
     * @param target The target object to add a resource to
     * @param prop The property name to be added to the target
     * @param resource The resource object that is added to the target
     * @param options
     */
    public static add<T extends object, U>(target: T, prop: keyof T | string, resource: U, options?: ResourceAssignOptions): T {
        const { set = optionsInstance.set } = { ...options };
        if (set) {
            set(target, prop as keyof T, resource);
        } else {
            /** ensure that the original object (and bindings) are returned—ie don't use spread */
            Object.assign(target, { [prop]: resource });
        }
        return target;
    }

}
