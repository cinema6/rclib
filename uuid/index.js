var generator = require('./lib/generator');

module.exports.createUuid = generator.generate.bind(generator);

module.exports.parseUuid = generator.parse.bind(generator);

module.exports.randomUuid = generator.randomUuid.bind(generator);
