import { Parse } from '../src';

const Float = Parse
    .regex(/[0-9]+\.[0-9]+/)
    .select(x => Number.parseFloat(x))
    .named('a floating point number');

console.log(Float.parse('2.34'))
console.log(Float.parse('0.34'))
console.log(Float.parse('.34'))
console.log(Float.parse('34'))
console.log(Float.parse('34.'))
