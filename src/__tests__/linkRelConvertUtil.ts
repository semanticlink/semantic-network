import { LinkRelConvertUtil } from '../utils/linkRelConvertUtil';

const { camelToDash, dashToCamel, filterCamelToDash, relTypeToCamel } = LinkRelConvertUtil;

describe('link rel converter utils', () => {
    describe('dashToCamel', () => {
        it('should match dashed', () => {
            expect(dashToCamel('question-item')).toBe('questionItem');
        });
        it('should leave non-dashed alone', () => {
            expect(dashToCamel('questionitem')).toBe('questionitem');
        });
    });

    describe('filter CamelToDash', () => {
        it('should match camel', () => {
            expect(filterCamelToDash(['questionItem'])).toEqual(['question-item']);
        });
        it('should match camel and all lower', () => {
            expect(filterCamelToDash(['questionItem', 'question'])).toEqual(['question-item']);
        });
        it('should match just all lower', () => {
            expect(filterCamelToDash(['question'])).toEqual([]);
        });
    });

    describe('camelToDash', () => {
        it('should match camel on string and returns string', () => {
            expect(camelToDash('questionItem')).toBe('question-item');
        });

        it('should match all lower on string and returns string', () => {
            expect(camelToDash('question')).toBe('question');
        });

        it('should match camel', () => {
            expect(camelToDash(['questionItem'])).toEqual(['question-item']);
        });

        it('should match camel and all lower', () => {
            expect(camelToDash(['questionItem', 'question'])).toEqual(['question-item', 'question']);
        });

        it('should match just all lower', () => {
            expect(camelToDash(['question'])).toEqual(['question']);
        });
    });

    describe('rel type to camel', function() {
        it('should match string', function() {
            expect(relTypeToCamel('test')).toBe('test');
        });

        it('should match case insensitive regex', function() {
            expect(relTypeToCamel('Test')).toBe('Test');
        });

        it('should match camel case regex', function() {
            expect(relTypeToCamel('create-form')).toBe('createForm');
        });
    });
});
