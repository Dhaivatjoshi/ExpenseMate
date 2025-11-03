function formatCurrency(amount) {
  return `€${parseFloat(amount).toFixed(2)}`;
}

module.exports = formatCurrency;
