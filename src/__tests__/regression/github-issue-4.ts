import { Parse, Parser, Input, IInput, Result } from '../../';
import 'jest-extended';

describe('Github issue 4: regex not working', () => {

    const regex = /[0-9a-fA-F]{2}/i;

    it('foo', () => {
        expect(Parse.regex(regex).parse("7b")).toBe("7b");
    });
});
