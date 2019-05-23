/**
 * Extends one class with another.
 *
 * @link https://oli.me.uk/2013/06/01/prototypical-inheritance-done-right/
 *
 * @param {Function} destination The class that should be inheriting things.
 * @param {Function} source The parent class that should be inherited from.
 *
 * @return {Object} The prototype of the parent.
 */
beestat.extend = function(destination, source) {
  destination.prototype = Object.create(source.prototype);
  destination.prototype.constructor = destination;

  return source.prototype;
};
