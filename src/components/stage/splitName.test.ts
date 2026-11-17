import { describe, expect, it } from 'vitest';
import { splitName } from './splitName';

describe('splitName', () => {
  it('keeps a single word on one line', () => {
    expect(splitName('Ensaymada')).toEqual(['Ensaymada']);
  });

  it('breaks where the two lines are closest in length', () => {
    expect(splitName('Ube cheese pandesal')).toEqual(['Ube cheese', 'pandesal']);
    expect(splitName('Coconut cold brew')).toEqual(['Coconut', 'cold brew']);
  });
});
