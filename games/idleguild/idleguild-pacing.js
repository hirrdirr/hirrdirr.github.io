(() => {
  const nativeNow = Date.now.bind(Date);
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const COMBAT_TIME_SCALE = 0.72;

  window.setInterval = (callback, delay, ...args) => {
    if (delay !== 100 || typeof callback !== 'function') {
      return nativeSetInterval(callback, delay, ...args);
    }

    const realStart = nativeNow();
    const virtualStart = realStart;

    return nativeSetInterval(() => {
      const realNow = nativeNow();
      const virtualNow = virtualStart + ((realNow - realStart) * COMBAT_TIME_SCALE);
      const previousNow = Date.now;
      Date.now = () => virtualNow;
      try {
        callback(...args);
      } finally {
        Date.now = previousNow;
      }
    }, delay);
  };

  window.setTimeout = (callback, delay, ...args) => {
    const adjustedDelay = delay === 260 ? 640 : delay;
    return nativeSetTimeout(callback, adjustedDelay, ...args);
  };
})();
