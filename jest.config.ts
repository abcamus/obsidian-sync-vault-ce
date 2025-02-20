export { }
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleNameMapper: {
        '^obsidian$': '<rootDir>/test/mock/obsidian.js', // 如果需要模拟
    },
};