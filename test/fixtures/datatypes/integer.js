
'use strict';

module.exports = {

  valid: [
    {
      name: 'lorem',
      type: 'integer',
      description: 'lorem ipsum'
    },
    {
      name: 'ipsum',
      type: 'integer',
      description: 'lorem ipsum',
      required: true
    },
    {
      name: 'dolor',
      type: 'integer',
      description: 'lorem ipsum',
      minimum: 1,
      maximum: 10
    },
    {
      name: 'dolor',
      type: 'integer',
      description: 'lorem ipsum',
      minimum: 1,
      maximum: 10,
      exclusiveMinimum: true,
      exclusiveMaximum: false
    }
  ],


  invalid: [

    {
      setup: {
        type: 'integer',
        description: 'lorem ipsum'
      },
      errors: [
        {
          reason: '"name" is missing',
          msg: /"missingProperty": "name"/
        }
      ]
    },

    {
      setup: {
        type: 'integer',
        required: true
      },
      errors: [
        {
          reason: '"name" is missing',
          msg: /"missingProperty": "name"/
        },
        {
          reason: '"description" is missing',
          msg: /"missingProperty": "description"/
        }
      ]
    },

    {
      setup: {
        name: 'dolor',
        type: 'integer',
        description: 'lorem ipsum',
        minimum: true,
        maximum: 'some text',
        exclusiveMinimum: 1,
        exclusiveMaximum: 1.2,
        required: 123
      },
      errors: [
        {
          reason: '"minimum" is not a number',
          msg: /should be number/
        },
        {
          reason: '"maximum" is not a number',
          msg: /should be number/
        },
        {
          reason: '"exclusiveMinimum" is not a boolean',
          msg: /should be boolean/
        },
        {
          reason: '"exclusiveMaximum" is not a boolean',
          msg: /should be boolean/
        },
        {
          reason: '"required" is not a boolean',
          msg: /should be boolean/
        }
      ]

    }
  ]
}
