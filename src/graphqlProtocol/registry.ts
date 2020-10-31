import { ViewEntity } from '..';
import { Entity } from '../engine/entity/Entity';

interface Data {
  [key: string]: unknown;
}

export interface RegistryEntityAttributes {
  [key: string]: {
    fieldName: string;
    fieldNameI18n: string;
    fieldNameI18nJson: string;
  };
}

export interface RegistryEntity {
  entity: Entity | ViewEntity;
  typeName: string;
  typeNamePlural: string;
  typeNamePascalCase: string;
  typeNamePluralPascalCase: string;
  attributes: RegistryEntityAttributes;
  dataShaper: (data: Data) => Data;
  dataSetShaper: (set: Data[]) => Data[];
  reverseDataShaper: (data: Data) => Data;
}

export interface Registry {
  [key: string]: RegistryEntity;
}

export const registry: Registry = {};

export const registerEntity = ({
  entity,
  typeName,
  typeNamePlural,
  typeNamePascalCase,
  typeNamePluralPascalCase,
  attributes,
  dataShaper,
  dataSetShaper,
  reverseDataShaper,
}: RegistryEntity) => {
  const entityName = entity.name;
  if (registry[entityName]) {
    throw new Error(`Entity '${entityName}' is already registered`);
  }

  registry[entityName] = {
    entity,
    typeName,
    typeNamePlural,
    typeNamePascalCase,
    typeNamePluralPascalCase,
    attributes,
    dataShaper,
    dataSetShaper,
    reverseDataShaper,
  };
};
