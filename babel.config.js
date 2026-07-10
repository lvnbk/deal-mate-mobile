module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin bắt buộc cho Reanimated 4 (do expo-router
    // kéo về) và PHẢI là plugin cuối cùng. Thiếu nó → crash SIGSEGV lúc boot
    // trong JSIWorkletsModuleProxy.
    plugins: ['react-native-worklets/plugin'],
  };
};
