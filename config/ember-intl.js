/* eslint-env node */
module.exports = function() {
  return {
    disablePolyfill: true,
    publicOnly: true,
    requiresTranslation() { return false; }
  };
};
