/**
 * Header dates across HTTP must be GMT formatted.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Last-Modified
 */
export const dateToGMTHeader: (date?: string) => string | undefined = (date?: string) => {
    if (date) {
        // general debate on Date checking
        // @see https://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
        if (isFinite(Date.parse(date))) {
            return new Date(date).toUTCString();
        }
    }
};
