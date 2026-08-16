module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // React 19 Compiler — auto-mémoïsation des composants et hooks
      // Reanimated/plugin DOIT rester en dernier
      ["babel-plugin-react-compiler", {}],
      "react-native-reanimated/plugin",
    ],
  };
};