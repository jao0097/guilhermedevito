import test from 'node:test';
import assert from 'node:assert/strict';
import { parseItemInput } from '../js/parser.mjs';

test('parseItemInput parses simple item without qty as default 1 un', () => {
  const result = parseItemInput('Pão Francês');
  assert.equal(result.name, 'Pão Francês');
  assert.equal(result.qty, 1);
  assert.equal(result.unit, 'un');
  assert.equal(result.category, 'Padaria');
});

test('parseItemInput parses quantity with decimal and units', () => {
  const result = parseItemInput('1,5 kg de tomate maduro');
  assert.equal(result.name, 'Tomate maduro');
  assert.equal(result.qty, 1.5);
  assert.equal(result.unit, 'kg');
  assert.equal(result.category, 'Hortifruti');
});

test('parseItemInput parses "2x" or "3 un" prefix or suffix', () => {
  const result = parseItemInput('2x Detergente Neutro');
  assert.equal(result.name, 'Detergente Neutro');
  assert.equal(result.qty, 2);
  assert.equal(result.unit, 'un');
  assert.equal(result.category, 'Limpeza & Higiene');
});

test('parseItemInput recognizes dairy and beverages', () => {
  const milk = parseItemInput('3 L de leite integral');
  assert.equal(milk.name, 'Leite integral');
  assert.equal(milk.qty, 3);
  assert.equal(milk.unit, 'L');
  assert.equal(milk.category, 'Laticínios & Ovos');

  const beer = parseItemInput('6 un de cerveja lata');
  assert.equal(beer.name, 'Cerveja lata');
  assert.equal(beer.category, 'Bebidas');
});

test('parseItemInput handles meat, grams and default fallback', () => {
  const meat = parseItemInput('500g de carne moída');
  assert.equal(meat.name, 'Carne moída');
  assert.equal(meat.qty, 500);
  assert.equal(meat.unit, 'g');
  assert.equal(meat.category, 'Carnes & Aves');

  const unknown = parseItemInput('Caderno espiral');
  assert.equal(unknown.name, 'Caderno espiral');
  assert.equal(unknown.category, 'Outros');
});
