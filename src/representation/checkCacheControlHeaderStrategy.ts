import { parse } from 'cache-control-parser';

export type CheckHeaderStrategy = (headers: Record<string, string>, now: Date) => boolean;

/**
 * The goal is to leave all heavy lifting to the browser (ie implement caching rules). The key issue
 * here is whether to return the in-memory resource or push through to the browser request (ie xhr).
 */
export class CheckHeaders {

    public static defaultStrategies: CheckHeaderStrategy[] = [
        CheckHeaders.checkExpiresBeforeDateHeaderStrategy,
        CheckHeaders.checkExpiresHeaderStrategy,
        CheckHeaders.checkNoCacheHeaderStrategy,
        CheckHeaders.checkMaxAgeHeaderStrategy,
    ];

    /**
     * The main issue is whether "time" is up and a potential refresh is required. This calculation is the
     * last-modified + max-age. The server provides this as an absolute date in the expires header.
     */
    public static checkExpiresHeaderStrategy(headers: Record<string, string>, now: Date): boolean {
        const {
            expires = undefined,
        } = headers;

        /*
         * The goal is to leave all heavy lifting to the browser (ie implement caching rules). The key issue
         * here is whether to return the in-memory resource or push through to the browser request (ie xhr).
         *
           */
        if (expires) {
            return now > new Date(expires);
        }

        return false;
    }

    /**
     * Caters for the non-sensical situation where the Expires header is BEHIND the Date header.
     * @param headers
     */
    public static checkExpiresBeforeDateHeaderStrategy(headers: Record<string, string>): boolean {
        const {
            'date': date = undefined,
            expires = undefined,
        } = headers;

        return !!(expires && date && new Date(date) > new Date(expires));
    }

    /**
     * Looks through the 'cache-control' headers and checks for max-age and no-cache.
     */
    public static checkNoCacheHeaderStrategy(headers: Record<string, string>): boolean {
        const {
            'cache-control': cacheControl = undefined,
        } = headers;

        if (cacheControl) {
            const {
                /* in seconds */
                'max-age': maxAge = undefined,
                'no-cache': noCache = undefined,
            } = parse(cacheControl);

            if (maxAge === 0 || noCache) {
                return true;
            }

        }

        return false;
    }

    /**
     * Looks through the 'cache-control' headers and checks for expiry as the last served ('date') plus max-age being reached
     */
    public static checkMaxAgeHeaderStrategy(headers: Record<string, string>, now: Date): boolean {
        const {
            'cache-control': cacheControl = undefined,
            // date will need to be exposed (eg as CORS headers—Access-Control-Expose-Headers: Date)
            'date': date = undefined,
        } = headers;

        if (date && cacheControl) {
            const {
                /* in seconds */
                'max-age': maxAge = undefined,
            } = parse(cacheControl);

            if (maxAge) {
                const lastServed = new Date(date);
                lastServed.setTime(lastServed.getTime() + (maxAge || 0));
                return now > lastServed;
            }
        }

        return false;
    }

}
