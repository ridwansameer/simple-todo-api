const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set test environment
require('./util/testEnv');

// Set up Jest to work with async tests
jest.setTimeout(30000); // 30 seconds timeout for tests 