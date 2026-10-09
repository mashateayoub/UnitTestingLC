const calculateTotal = require('../src/calculateTotal');

// test('calcule le total pour quatre articles à 25', () => {
//   // Arrange : préparer les données.
//   const unitPrice = 25;
//   const quantity = 4;

//   // Act : exécuter la fonction.
//   const result = calculateTotal(unitPrice, quantity);

//   // Assert : comparer le résultat au résultat attendu.
//   expect(result).toBe(100);
//   expect(result).not.toBe(0);
//   expect(result).not.toBe(25);
// });

describe('calculateTotal', () => {
  test('calcule le total pour plusieurs articles', () => {
    expect(calculateTotal(25, 4)).toBe(100);
  });

  test('retourne zéro lorsque la quantité est nulle', () => {
    expect(calculateTotal(25, 0)).toBe(0);
  });

  test('retourne le prix unitaire pour un seul article', () => {
    expect(calculateTotal(25, 1)).toBe(25);
  });
});


