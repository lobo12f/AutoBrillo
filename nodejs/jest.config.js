// nodejs/jest.config.js
export default {
    testEnvironment: 'node',
    rootDir: '.',
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 60000,
    transform: {},
    // ❌ ELIMINADO: extensionsToTreatAsEsm: ['.js'] 
    //    (Jest 30 lo infiere automáticamente con "type": "module" en package.json)
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },
    collectCoverageFrom: [
        'backend/**/*.js',
        '!backend/models/**',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    verbose: true,
};