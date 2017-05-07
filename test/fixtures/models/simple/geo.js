
export default {

  domain: 'geo',

  entities: [

    {
      name: 'country',
      description: 'A country on our beautiful planet',

      attributes: [

        {
          name: 'name',
          type: 'string',
          description: 'The name of the country',
          minLength: 1
        },

        {
          name: 'iso_code',
          type: 'string',
          description: 'ISO code of the country',
          pattern: '^[a-z]+$',
          minLength: 3,
          maxLength: 3
        },

        {
          name: 'continent',
          type: 'string',
          description: 'The continent where the country is located'
        }

      ],

      indexing: {
        unique: [
          [ 'name' ]
        ]
      }

    }
  ]
}
