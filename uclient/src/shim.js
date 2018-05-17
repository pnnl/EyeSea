//To avoid polyfill warnings from React16 in tests till that's fixed

global.requestAnimationFrame = callback => {
  setTimeout(callback, 0);
};
