module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
      "\.util\.",
      "\.d\.ts$",
      "/dist/"
  ]
};
