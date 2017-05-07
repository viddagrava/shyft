
import util from './util';
import _ from 'lodash';
import constants from './constants';
import ProtocolGraphQL from './ProtocolGraphQL';

import { generateSortInput } from './sort';

import {
  isEntity,
} from 'shift-engine';

import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLID,
} from 'graphql';

import {
  globalIdField,
  nodeDefinitions,
  fromGlobalId,
  connectionDefinitions,
  connectionFromPromisedArray,
  connectionArgs,
} from 'graphql-relay';



// collect object types, connections ... for each entity
const graphRegistry = {}


// prepare models for graphql
const extendModelsForGql = (entities) => {

  _.forEach(entities, (entity) => {

    entity.graphql = entity.graphql || {}

    // generate type names for various cases
    entity.graphql.typeName = util.generateTypeName(entity.name)
    entity.graphql.typeNamePlural = util.generateTypeNamePlural(entity.name)
    entity.graphql.typeNamePascalCase = util.generateTypeNamePascalCase(entity.name)
    entity.graphql.typeNamePluralPascalCase = util.generateTypeNamePluralPascalCase(entity.name)

    _.forEach(entity.getAttributes(), (attribute) => {

      attribute.gqlFieldName = _.camelCase(attribute.name)

      // exception: name collision with relay ID field
      if (attribute.gqlFieldName === constants.RELAY_ID_FIELD) {
        attribute.gqlFieldName = constants.FALLBACK_ID_FIELD
      }

    })

  })
}


// get node definitions for relay
const getNodeDefinitions = (resolverMap) => {

  return nodeDefinitions(

    (globalId) => {

      const {
        type,
        id
      } = fromGlobalId(globalId);

      // resolve based on type and id
      return resolverMap.findById(type, id)
    },

    (obj) => {

      const type = obj[ constants.RELAY_TYPE_PROMOTER_FIELD ]

      // return the graphql type definition
      return graphRegistry[ type ]
        ? graphRegistry[ type ].type
        : null
    }
  );
}



// register a new connection
const registerConnection = (entity) => {

  const typeName = entity.graphql.typeName

  const { connectionType } = connectionDefinitions({
    nodeType: graphRegistry[ typeName ].type
  })

  graphRegistry[ typeName ].connection = connectionType

}



const generateListQueries = (resolverMap) => {

  const listQueries = {}

  _.forEach(graphRegistry, ( { type, entity }, typeName) => {
    const typeNamePlural = entity.graphql.typeNamePlural
    const typeNamePluralListName = entity.graphql.typeNamePluralPascalCase
    const queryName = _.camelCase(`all_${typeNamePlural}`)

    listQueries[ queryName ] = {
      type: graphRegistry[ typeName ].connection,
      description: `Fetch a list of **\`${typeNamePluralListName}\`**`,
      args: {
        ...connectionArgs,
        orderBy: {
          ...generateSortInput(entity),
        }
      },
      resolve: (source, args, context, info) => connectionFromPromisedArray(
        resolverMap.find(entity, source, args, context, info),
        args,
      ),
    }
  })

  return listQueries
}


const generateInstanceQueries = (resolverMap) => {

  const instanceQueries = {}

  _.forEach(graphRegistry, ( { type, entity }, typeName) => {
    const typeNamePascalCase = entity.graphql.typeNamePascalCase
    const queryName = typeName

    instanceQueries[ queryName ] = {
      type: type,
      description: `Fetch a single **\`${typeNamePascalCase}\`** using its node ID`,
      args: {
        id: {
          type: new GraphQLNonNull( GraphQLID )
        }
      },
      resolve: (source, args, context, info) => {
        return resolverMap.findById(entity, args.id, source, args, context, info)
      },
    }


    // find the primary attribute and add a query for it
    const primaryAttribute = _.find(entity.attributes, { isPrimary: true })

    if (primaryAttribute) {

      const fieldName = primaryAttribute.gqlFieldName
      const graphqlDataType = ProtocolGraphQL.convertToProtocolDataType(primaryAttribute.type)
      const queryNamePrimaryAttribute = _.camelCase(`${typeName}_by_${fieldName}`)

      instanceQueries[ queryNamePrimaryAttribute ] = {
        type: type,
        description: `Fetch a single **\`${typeNamePascalCase}\`** using its **\`${fieldName}\`**`,
        args: {
          [ fieldName ]: {
            type: new GraphQLNonNull( graphqlDataType )
          }
        },
        resolve: (source, args, context, info) => {
          return resolverMap.findById(entity, args[ fieldName ], source, args, context, info)
        },
      }
    }

  })

  return instanceQueries
}



export const generateGraphQLSchema = (schema, resolverMap) => {

  const {
    nodeInterface,
    nodeField,
  } = getNodeDefinitions(resolverMap)

  // prepare models for graphql
  extendModelsForGql(schema.getEntities())


  _.forEach(schema.getEntities(), (entity) => {

    const typeName = entity.graphql.typeName

    const objectType = new GraphQLObjectType({

      name: entity.graphql.typeNamePascalCase,
      description: entity.description,
      interfaces: [ nodeInterface ],

      fields: () => {
        const fields = {
          id: globalIdField(typeName)
        }

        _.forEach(entity.getAttributes(), (attribute) => {

          const field = {
            description: attribute.description,
          };

          // it's a reference
          if (isEntity(attribute.type)) {

            const targetEntity = attribute.type
            const targetTypeName = targetEntity.graphql.typeName

            field.type = graphRegistry[ targetTypeName ].type
            field.resolve = (source, args, context, info) => {
              const referenceId = source[ attribute.gqlFieldName ]
              return resolverMap.findById(targetEntity, referenceId, source, args, context, info)
            }

          }
          // it's a regular attribute
          else {
            field.type = ProtocolGraphQL.convertToProtocolDataType(attribute.type)
          }

          // make it non-nullable if it's required
          if (attribute.required) {
            field.type = new GraphQLNonNull(field.type)
          }

          // use computed value's function as the field resolver
          if (attribute.computedValue) {
            field.resolve = attribute.computedValue
          }

          fields[ attribute.gqlFieldName ] = field;

        });

        return fields
      }
    })

    graphRegistry[ typeName ] = {
      entity,
      type: objectType
    }

    registerConnection(entity)
  })



  // build the query type
  const queryType = new GraphQLObjectType({
    name: 'Query',
    root: 'The root query type',

    fields: () => {

      const listQueries = generateListQueries(resolverMap)
      const instanceQueries = generateInstanceQueries(resolverMap)

      return {
        node: nodeField,
        ...instanceQueries,
        ...listQueries,
      };
    },
  });



  // put it all together into a graphQL schema
  return new GraphQLSchema({
    query: queryType,
  });
}


export default {
  generateGraphQLSchema
}
