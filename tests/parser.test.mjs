import test from 'node:test';
import assert from 'node:assert/strict';
import { parseItemInput, detectCategory } from '../js/parser.mjs';

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

test('parseItemInput understands spoken units and number words', () => {
  const tomato = parseItemInput('dois quilos de tomate');
  assert.equal(tomato.name, 'Tomate');
  assert.equal(tomato.qty, 2);
  assert.equal(tomato.unit, 'kg');

  const milk = parseItemInput('3 caixas de leite');
  assert.equal(milk.qty, 3);
  assert.equal(milk.unit, 'cx');
  assert.equal(milk.category, 'Laticínios & Ovos');

  const soda = parseItemInput('2 litros de Coca');
  assert.equal(soda.unit, 'L');
  assert.equal(soda.category, 'Bebidas');

  const meat = parseItemInput('meio quilo de carne moída');
  assert.equal(meat.qty, 0.5);
  assert.equal(meat.unit, 'kg');
  assert.equal(meat.name, 'Carne moída');
});

test('parseItemInput converts half dozen into units', () => {
  const eggs = parseItemInput('Meia dúzia de ovos');
  assert.equal(eggs.name, 'Ovos');
  assert.equal(eggs.qty, 6);
  assert.equal(eggs.unit, 'un');
});

test('parseItemInput extracts price and suffix quantity', () => {
  const tomato = parseItemInput('2 kg tomate R$ 8,50');
  assert.equal(tomato.name, 'Tomate');
  assert.equal(tomato.price, 8.5);

  const soap = parseItemInput('Sabonete x3');
  assert.equal(soap.name, 'Sabonete');
  assert.equal(soap.qty, 3);

  assert.equal(parseItemInput('Arroz').price, null);
});

test('parseItemInput does not treat words starting like units as units', () => {
  const oranges = parseItemInput('2 laranjas');
  assert.equal(oranges.name, 'Laranjas');
  assert.equal(oranges.unit, 'un');
  assert.equal(oranges.category, 'Hortifruti');

  // "meia" sozinha não é quantidade
  assert.equal(parseItemInput('meias').name, 'Meias');
});

test('detectCategory prefers the head noun and the longest phrase', () => {
  assert.equal(detectCategory('Água sanitária'), 'Limpeza & Higiene');
  assert.equal(detectCategory('Água mineral'), 'Bebidas');
  assert.equal(detectCategory('Suco de laranja'), 'Bebidas');
  assert.equal(detectCategory('Molho de tomate'), 'Mercearia');
  assert.equal(detectCategory('Pão de queijo'), 'Padaria');
  assert.equal(detectCategory('Tomates'), 'Hortifruti');
  assert.equal(detectCategory('feijao carioca'), 'Mercearia');
});
