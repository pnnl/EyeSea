//Copyright 2018 Battelle Memorial Institute. All rights reserved.

//To avoid polyfill warnings from React16 in tests till that's fixed

global.requestAnimationFrame = callback => {
  setTimeout(callback, 0);
};
