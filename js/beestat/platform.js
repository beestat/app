beestat.platform = function() {
  const url_parameters = new URLSearchParams(window.location.search);
  return url_parameters.get('platform');
};
