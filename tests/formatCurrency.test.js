const formatCurrency = require('../formatCurrency');

test('formats 10 euros correctly', () => {
  expect(formatCurrency(10)).toBe('€10.00');
});
