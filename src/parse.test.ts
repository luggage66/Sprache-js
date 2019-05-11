import { Parse } from "./parse";

describe('Parse', () => {
    describe('regex', () => {
        it('allows regexp flags', () => {
            const MyParser = Parse.regex(/[a-z]/i);
            expect(MyParser.parse('A')).toBe('A');
        })
    })
})
