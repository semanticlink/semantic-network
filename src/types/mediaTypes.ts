import { Uri } from 'semantic-link';

/**
 *
 * The format of text/uri-list resources is:
 *
 * Any lines beginning with the '#' character are comment lines and are ignored during processing. (Note that URIs may
 * contain the '#' character, so it is only a comment character when it is the first character on a line.)
 *
 * The remaining non-comment lines shall be URIs (URNs or URLs), encoded according to the URL or URN specifications
 * (RFC2141, RFC1738 and RFC2396). Each URI shall appear on one and only one line. Very long URIs are not
 * broken in the text/uri-list format. Content-transfer-encodings may be used to enforce line length limitations.
 *
 * As for all text/* formats, lines are terminated with a CRLF pair.
 *
 * @example
 *
 *     # urn:isbn:0-201-08372-8
 *     http://www.huh.org/books/foo.html
 *     http://www.huh.org/books/foo.pdf
 *     ftp://ftp.foo.org/books/foo.txt
 *
 * @see http://amundsen.com/hypermedia/urilist/
 * @see http://tools.ietf.org/html/rfc2483#section-5
 */
export type UriList = Uri | Uri[] | string;
