import * as _ from 'lodash';
import { isObjectDataType, ObjectDataType } from './datatype/ObjectDataType';
import { isListDataType } from './datatype/ListDataType';
import { isComplexDataType } from './datatype/ComplexDataType';
import { isMap, passOrThrow, isDefined, asyncForEach } from './util';
import { MUTATION_TYPE_CREATE, Mutation } from './mutation/Mutation';
import { Action } from './action/Action';
import { DataType, Entity } from '..';
import { Attribute } from './attribute/Attribute';
import { Context } from './context/Context';
import { Source } from 'graphql';
import { isDataType } from './datatype/DataType';
// import { Attribute } from './attribute/Attribute';

const validateDataTypePayload = async ({
  dataType,
  payload,
  context,
  source,
}: {
  dataType: DataType | ObjectDataType;
  payload: any;
  context?: Context;
  source: Source;
}): Promise<void> => {
  if (isDataType(dataType)) {
    const dataTypeValidator = dataType.validate;

    if (dataTypeValidator) {
      console.log(`==========> ${dataType.name}`);
      await dataTypeValidator({ value: payload, context, source });
    }
  }
};

const validatePayload = async (
  param: any,
  payload: any,
  source: Source,
  context?: Context,
  path = [],
): Promise<void> => {
  if (typeof payload !== 'undefined' && payload !== null) {
    const paramName = param.name;

    const paramType = isListDataType(param.type)
      ? param.type.getItemType()
      : param.type;

    await validateDataTypePayload({
      dataType: param.type,
      payload: payload[paramName],
      context,
      source,
    });

    if (isObjectDataType(paramType)) {
      const attributes = paramType.getAttributes();

      await asyncForEach(Object.keys(attributes), async (attributeName) => {
        const attribute = attributes[attributeName];

        const newPath = [...path, attribute.name];

        await validatePayload(
          attribute,
          payload[paramName],
          source,
          context,
          newPath,
        );
      });
    }

    if (isListDataType(param.type)) {
      const payloadList = payload[paramName];

      if (typeof payloadList !== 'undefined' && payloadList !== null) {
        await Promise.all(
          payloadList.map(async (itemPayload) => {
            if (isObjectDataType(paramType)) {
              await validateDataTypePayload({
                dataType: paramType,
                payload: itemPayload,
                context,
                source,
              });

              const attributes = paramType.getAttributes();
              const pathString = path.length ? `${path.join('.')}.` : '';

              await asyncForEach(
                Object.keys(attributes),
                async (attributeName) => {
                  const attribute = attributes[attributeName];

                  passOrThrow(
                    !attribute.required ||
                      isDefined(itemPayload[attribute.name]),
                    () =>
                      `Missing required input attribute '${pathString}${attribute.name}'`,
                  );
                  const newPath = [...path, attribute.name];
                  await validatePayload(
                    attribute,
                    itemPayload,
                    source,
                    context,
                    newPath,
                  );
                },
              );
            }
          }),
        );
      }
    }

    if (!isComplexDataType(paramType)) {
      const attribute: Attribute = param;

      const attributeName = attribute.name;
      const attributeValidator = attribute.validate;

      await validateDataTypePayload({
        dataType: paramType,
        payload: payload[attributeName],
        context,
        source,
      });

      if (attributeValidator) {
        if (
          param.isSystemAttribute ||
          typeof payload[attributeName] !== 'undefined'
        ) {
          const result = await attributeValidator(
            payload[attributeName],
            attributeName,
            payload,
            source,
            context,
          );
          if (result instanceof Error) {
            throw result;
          }
        }
      }
    }
  }
};

export const validateActionPayload = async (
  param: any,
  payload: any,
  action: Action,
  context?: Context,
): Promise<void> => {
  const newParam = {
    ...param,
    name: 'input',
  };

  const newPayload = {
    input: {
      ...payload,
    },
  };

  if (!isMap(payload)) {
    newPayload.input = payload;
  }

  await validatePayload(newParam, newPayload, { action }, context);
};

export const validateMutationPayload = async (
  entity: Entity,
  mutation: Mutation,
  payload: any,
  context?: Context,
): Promise<void> => {
  const attributes: any = entity.getAttributes();
  const systemAttributes = _.filter(
    attributes,
    (attribute) => attribute.isSystemAttribute && attribute.defaultValue,
  ).map((attribute) => attribute.name);

  await Promise.all(
    systemAttributes.map(async (attributeName) => {
      const attribute = attributes[attributeName];
      await validatePayload(attribute, payload, { mutation, entity }, context);
    }),
  );

  const attributesToValidate = mutation.attributes || [];

  await Promise.all(
    attributesToValidate.map(async (attributeName) => {
      const attribute = attributes[attributeName];

      if (mutation.type === MUTATION_TYPE_CREATE && !attribute.i18n) {
        passOrThrow(
          !attribute.required || isDefined(payload[attributeName]),
          () => `Missing required input attribute '${attributeName}'`,
        );
      }

      await validatePayload(attribute, payload, { mutation, entity }, context, [
        attributeName,
      ]);
    }),
  );
};
