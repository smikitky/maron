import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  figuresSchema,
  referencesSchema,
  stylesSchema,
  tablesSchema
} from './schema.ts';

describe('schema', () => {
  test('styles schema rejects unknown keys (strict)', () => {
    const result = stylesSchema.safeParse({
      reference: { format: '{{title}}', extra: 'x' }
    });
    assert.equal(result.success, false);
  });

  test('figures schema rejects unknown keys (strict)', () => {
    const result = figuresSchema.safeParse({
      fig1: { caption: 'x', unknown: true }
    });
    assert.equal(result.success, false);
  });

  test('tables schema rejects unknown keys (strict)', () => {
    const result = tablesSchema.safeParse({
      tab1: { caption: 'x', extra: 'y' }
    });
    assert.equal(result.success, false);
  });

  test('references schema allows unknown keys (passthrough)', () => {
    const result = referencesSchema.safeParse({
      ref1: { title: 'x', customField: 123 }
    });
    assert.equal(result.success, true);
  });
});
