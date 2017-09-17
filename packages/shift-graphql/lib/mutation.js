
import {
  GraphQLString,
  GraphQLID,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLInt,
} from 'graphql';

import {
  fromGlobalId,
} from 'graphql-relay';

import _ from 'lodash';

import ProtocolGraphQL from './ProtocolGraphQL';

import {
  isEntity,
  constants,
  MUTATION_TYPE_CREATE,
  MUTATION_TYPE_UPDATE,
  INDEX_UNIQUE,
} from 'shift-engine';

import {
  generateTypeNamePascalCase,
} from './util';


export const generateMutationInstanceInput = (entity, entityMutation) => {

  const typeNamePascalCase = entity.graphql.typeNamePascalCase

  const entityMutationInstanceInputType = new GraphQLInputObjectType({
    name: generateTypeNamePascalCase(`${entityMutation.name}_${typeNamePascalCase}InstanceInput`),
    description: `**\`${entityMutation.name}\`** mutation input type for **\`${typeNamePascalCase}\`**`,

    fields: () => {
      const fields = {}

      const entityAttributes = entity.getAttributes()

      _.forEach(entityMutation.attributes, (attributeName) => {

        const attribute = entityAttributes[ attributeName ]

        let attributeType = attribute.type

        // it's a reference
        if (isEntity(attributeType)) {
          const targetEntity = attributeType
          const primaryAttribute = targetEntity.getPrimaryAttribute()
          attributeType = primaryAttribute.type
        }

        const fieldType = ProtocolGraphQL.convertToProtocolDataType(attributeType)

        fields[ attribute.gqlFieldName ] = {
          type: attribute.required && !entityMutation.ignoreRequired
            ? new GraphQLNonNull(fieldType)
            : fieldType
        };

      });

      return fields
    }
  })

  return entityMutationInstanceInputType
}



export const generateMutationInput = (entity, typeName, entityMutation, entityMutationInstanceInputType) => {

  const typeNamePascalCase = entity.graphql.typeNamePascalCase

  const entityMutationInputType = new GraphQLInputObjectType({

    name: generateTypeNamePascalCase(`${entityMutation.name}_${typeNamePascalCase}Input`),
    description: `Mutation input type for **\`${typeNamePascalCase}\`**`,

    fields: () => {
      const fields = {
        clientMutationId: {
          type: GraphQLString,
        }
      }

      if (entityMutation.needsInstance) {
        fields.nodeId = {
          type: new GraphQLNonNull( GraphQLID )
        }
      }

      if (entityMutationInstanceInputType) {
        fields[ typeName ] = {
          type: new GraphQLNonNull( entityMutationInstanceInputType )
        }
      }

      return fields
    }
  })

  return entityMutationInputType
}



export const generateMutationByPrimaryAttributeInput = (entity, typeName, entityMutation, entityMutationInstanceInputType, primaryAttribute) => {

  const fieldName = primaryAttribute.gqlFieldName
  const fieldType = ProtocolGraphQL.convertToProtocolDataType(primaryAttribute.type)
  const typeNamePascalCase = entity.graphql.typeNamePascalCase

  const entityMutationInputType = new GraphQLInputObjectType({

    name: generateTypeNamePascalCase(`${entityMutation.name}_${typeNamePascalCase}_by_${fieldName}_Input`),
    description: `Mutation input type for **\`${typeNamePascalCase}\`** using the **\`${fieldName}\`**`,

    fields: () => {
      const fields = {
        clientMutationId: {
          type: GraphQLString,
        }
      }

      if (entityMutation.needsInstance) {
        fields[ fieldName ] = {
          type: new GraphQLNonNull( fieldType )
        }
      }

      if (entityMutationInstanceInputType) {
        fields[ typeName ] = {
          type: new GraphQLNonNull( entityMutationInstanceInputType )
        }
      }

      return fields
    }
  })

  return entityMutationInputType
}



const getEntityUniquenessAttributes = (entity) => {

  const ret = []
  const entityIndexes = entity.getIndexes()

  if (entityIndexes) {
    entityIndexes.map(({type, attributes}) => {
      if (type === INDEX_UNIQUE) {
        ret.push({
          uniquenessName: _.camelCase(attributes.join('-and-')),
          attributes,
        })
      }
    })
  }

  return ret
}


export const generateMutationOutput = (entity, typeName, type, entityMutation) => {

  const typeNamePascalCase = entity.graphql.typeNamePascalCase

  const entityMutationOutputType = new GraphQLObjectType({

    name: generateTypeNamePascalCase(`${entityMutation.name}_${typeNamePascalCase}Output`),
    description: `Mutation output type for **\`${typeNamePascalCase}\`**`,

    fields: () => {
      const fields = {
        clientMutationId: {
          type: GraphQLString,
        }
      }

      if (entityMutation.isTypeDelete) {
        fields.deleteRowCount = {
          type: new GraphQLNonNull( GraphQLInt ),
          description: 'Number of deleted rows',
        }
      }
      else {
        fields[ typeName ] = {
          type: new GraphQLNonNull( type )
        }
      }

      return fields
    }
  })

  return entityMutationOutputType
}



const extractIdFromNodeId = (graphRegistry, sourceEntityName, nodeId) => {
  let instanceId

  if (nodeId) {
    const {
      type,
      id
    } = fromGlobalId(nodeId);

    instanceId = id

    const entity = graphRegistry.types[ type ]
      ? graphRegistry.types[ type ].entity
      : null

    if (!entity || entity.name !== sourceEntityName) {
      throw new Error('Incompatible nodeId used with this mutation')
    }
  }

  return instanceId
}



const fillSystemAttributesDefaultValues = (entity, entityMutation, payload, context) => {

  const ret = {
    ...payload
  }

  const entityAttributes = entity.getAttributes()
  const systemAttributes = _.filter(
    entityAttributes,
    attribute => attribute.isSystemAttribute && attribute.defaultValue
  )

  systemAttributes.map((attribute) => {
    const attributeName = attribute.name
    const defaultValue = attribute.defaultValue

    const value = defaultValue(ret, entityMutation, context)
    if (typeof value !== 'undefined') {
      ret[ attributeName ] = value
    }

  })

  return ret
}



const fillDefaultValues = (entity, entityMutation, payload, context) => {

  const ret = {
    ...payload
  }

  const entityAttributes = entity.getAttributes()
  const requiredAttributes = _.filter(
    entityAttributes,
    attribute => attribute.required && !attribute.isSystemAttribute
  )

  requiredAttributes.map((attribute) => {
    const attributeName = attribute.name
    if (!entityMutation.attributes.includes(attributeName)) {
      if (attribute.defaultValue) {
        ret[ attributeName ] = attribute.defaultValue(ret, entityMutation, context)
      }
    }
  })

  return ret
}


const getMutationResolver = (entity, entityMutation, typeName, storageType, graphRegistry) => {

  return async (source, args, context, info) => {

    const id = extractIdFromNodeId(graphRegistry, entity.name, args.input.nodeId)

    if (entityMutation.type === MUTATION_TYPE_CREATE) {
      args.input[typeName] = fillDefaultValues(entity, entityMutation, args.input[typeName], context)
    }

    if (entityMutation.type === MUTATION_TYPE_CREATE || entityMutation.type === MUTATION_TYPE_UPDATE) {
      args.input[typeName] = fillSystemAttributesDefaultValues(entity, entityMutation, args.input[typeName], context)
    }

    const result = await storageType.mutate(entity, id, source, args.input, typeName, entityMutation, context, info, constants.RELAY_TYPE_PROMOTER_FIELD)
    if (result[ typeName ]) {
      result[ typeName ] = entity.graphql.dataShaper(result[ typeName ])
    }
    return {
      ...result,
      clientMutationId: args.input.clientMutationId,
    }
  }
}


const getMutationByFieldNameResolver = (entity, entityMutation, typeName, storageType, fieldName) => {
  return async (source, args, context, info) => {

    const id = args.input[ fieldName ]

    if (entityMutation.type === MUTATION_TYPE_UPDATE) {
      args.input[typeName] = fillSystemAttributesDefaultValues(entity, entityMutation, args.input[typeName], context)
    }

    const result = await storageType.mutate(entity, id, source, args.input, typeName, entityMutation, context, info, constants.RELAY_TYPE_PROMOTER_FIELD)
    if (result[ typeName ]) {
      result[ typeName ] = entity.graphql.dataShaper(result[ typeName ])
    }
    return {
      ...result,
      clientMutationId: args.input.clientMutationId,
    }
  }
}


export const generateMutations = (graphRegistry) => {

  const mutations = {}

  _.forEach(graphRegistry.types, ( { type, entity }, typeName) => {

    const entityMutations = entity.getMutations()

    if (!entityMutations || entityMutations.length < 1) {
      return
    }

    const storageType = entity.storageType

    entityMutations.map(entityMutation => {

      const mutationName = _.camelCase(`${entityMutation.name}_${typeName}`)

      let entityMutationInstanceInputType

      if (entityMutation.attributes) {
        entityMutationInstanceInputType = generateMutationInstanceInput(entity, entityMutation)
      }

      const mutationInputType = generateMutationInput(entity, typeName, entityMutation, entityMutationInstanceInputType)
      const mutationOutputType = generateMutationOutput(entity, typeName, type, entityMutation)

      mutations[ mutationName ] = {
        type: mutationOutputType,
        description: entityMutation.description,
        args: {
          input: {
            description: 'Input argument for this mutation',
            type: new GraphQLNonNull( mutationInputType ),
          },
        },
        resolve: getMutationResolver(entity, entityMutation, typeName, storageType, graphRegistry),
      }



      if (entityMutation.needsInstance) {

        const primaryAttribute = entity.getPrimaryAttribute()

        if (primaryAttribute) {
          const fieldName = primaryAttribute.gqlFieldName
          const mutationByPrimaryAttributeInputType = generateMutationByPrimaryAttributeInput(entity, typeName, entityMutation, entityMutationInstanceInputType, primaryAttribute)
          const mutationByPrimaryAttributeName = _.camelCase(`${entityMutation.name}_${typeName}_by_${fieldName}`)

          mutations[ mutationByPrimaryAttributeName ] = {
            type: mutationOutputType,
            description: entityMutation.description,
            args: {
              input: {
                description: 'Input argument for this mutation',
                type: new GraphQLNonNull( mutationByPrimaryAttributeInputType ),
              },
            },
            resolve: getMutationByFieldNameResolver(entity, entityMutation, typeName, storageType, fieldName),
          }
        }
      }

    })

  })

  return mutations
}

