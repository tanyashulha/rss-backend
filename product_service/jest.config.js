module.exports = {
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
