/**
 * Get the dimensions of a text string.
 *
 * @param {string} text
 * @param {number} font_size
 * @param {number} font_weight
 *
 * @return {number}
 */
beestat.text_dimensions = function(text, font_size, font_weight) {
  const div = document.createElement('div');
  div.style.fontSize = font_size + 'px';
  div.style.fontWeight = font_weight;
  div.style.position = 'absolute';
  div.style.left = -1000;
  div.style.top = -1000;

  div.textContent = text;

  document.body.appendChild(div);

  const bounding_box = div.getBoundingClientRect();

  document.body.removeChild(div);

  return {
    'width': bounding_box.width,
    'height': bounding_box.height
  };
};
