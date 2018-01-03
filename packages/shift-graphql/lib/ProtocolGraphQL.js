
import {
  ProtocolType,
  DataTypeID,
  DataTypeInteger,
  DataTypeBigInt,
  DataTypeFloat,
  DataTypeBoolean,
  DataTypeString,
  DataTypeJson,
  DataTypeTimestamp,
  DataTypeTimestampTz,
  DataTypeDate,
  isDataTypeState,
  isDataTypeEnum,
  isObjectDataType,
  isListDataType,
} from 'shift-engine';

import {
  GraphQLScalarType,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLEnumType,
} from 'graphql';

import {
  GraphQLBigInt,
  GraphQLJSON,
  GraphQLDateTime,
  GraphQLDate,
} from './dataTypes';

import {
  generateDataInput,
  generateDataOutput,
 } from './io';



export const ProtocolGraphQL = new ProtocolType({
  name: 'ProtocolGraphQL',
  description: 'GraphQL API protocol',
  isProtocolDataType(protocolDataType) {
    return (protocolDataType instanceof GraphQLScalarType)
  }
})

export default ProtocolGraphQL


ProtocolGraphQL.addDataTypeMap(DataTypeID, GraphQLID);
ProtocolGraphQL.addDataTypeMap(DataTypeInteger, GraphQLInt);
ProtocolGraphQL.addDataTypeMap(DataTypeBigInt, GraphQLBigInt);
ProtocolGraphQL.addDataTypeMap(DataTypeFloat, GraphQLFloat);
ProtocolGraphQL.addDataTypeMap(DataTypeBoolean, GraphQLBoolean);
ProtocolGraphQL.addDataTypeMap(DataTypeString, GraphQLString);
ProtocolGraphQL.addDataTypeMap(DataTypeJson, GraphQLJSON);
ProtocolGraphQL.addDataTypeMap(DataTypeTimestamp, GraphQLDateTime);
ProtocolGraphQL.addDataTypeMap(DataTypeTimestampTz, GraphQLDateTime);
ProtocolGraphQL.addDataTypeMap(DataTypeDate, GraphQLDate);



const dataTypesRegistry = {
  object: {},
  enum: {},
}



ProtocolGraphQL.addDynamicDataTypeMap(isDataTypeState, (attributeType) => {

  const name = attributeType.name
  const values = {}

  if (dataTypesRegistry.enum[name]) {
    if (attributeType === dataTypesRegistry.enum[name].attributeType) {
      return dataTypesRegistry.enum[name].type
    }
  }

  const states = attributeType.states
  const stateNames = Object.keys(states)
  stateNames.map(stateName => {
    values[ stateName ] = {
      value: states[ stateName ]
    }
  })

  const type = new GraphQLEnumType({
    name,
    values,
  })

  dataTypesRegistry.enum[name] = {
    type,
    attributeType,
  }

  return type
})



ProtocolGraphQL.addDynamicDataTypeMap(isDataTypeEnum, (attributeType) => {

  const name = attributeType.name
  const values = {}

  if (dataTypesRegistry.enum[ name ]) {
    if (attributeType === dataTypesRegistry.enum[ name ].attributeType) {
      return dataTypesRegistry.enum[ name ].type
    }
  }

  attributeType.values.map(value => {
    values[ value ] = {
      value
    }
  })


  const type = new GraphQLEnumType({
    name,
    values,
  })

  dataTypesRegistry.enum[ name ] = {
    type,
    attributeType,
  }

  return type
});



ProtocolGraphQL.addDynamicDataTypeMap(isObjectDataType, (attributeType, sourceName, asInput) => {

  const name = attributeType.name
  const uniqueName = `${name}-${sourceName}-${asInput ? 'Input' : 'Output' }`

  if (asInput) {
    if (!dataTypesRegistry.object[ uniqueName ]) {
      const dataInputType = generateDataInput(name, attributeType.getAttributes())
      dataTypesRegistry.object[ uniqueName ] = dataInputType
    }

    return dataTypesRegistry.object[ uniqueName ]
  }


  if (!dataTypesRegistry.object[ uniqueName ]) {
    const dataOutputType = generateDataOutput(name, attributeType.getAttributes())
    dataTypesRegistry.object[ uniqueName ] = dataOutputType
  }

  return dataTypesRegistry.object[ uniqueName ]
});



ProtocolGraphQL.addDynamicDataTypeMap(isListDataType, (attributeType, sourceName, asInput) => {

  const name = attributeType.name
  const uniqueName = `${name}-${sourceName}-${asInput ? 'Input' : 'Output'}`

  // hack: wrap list type into an object data type and extract later that single field
  // to reuse the same input / ouput logic as with object data types
  const params = {
    wrapped: {
      type: attributeType
    }
  }


  if (asInput) {
    if (!dataTypesRegistry.object[uniqueName]) {
      const dataInputType = generateDataInput(name, params)
      dataTypesRegistry.object[uniqueName] = dataInputType.getFields().wrapped.type
    }

    return dataTypesRegistry.object[uniqueName]
  }


  if (!dataTypesRegistry.object[uniqueName]) {
    const dataOutputType = generateDataOutput(name, params)
    dataTypesRegistry.object[uniqueName] = dataOutputType.getFields().wrapped.type
  }

  return dataTypesRegistry.object[uniqueName]
});
