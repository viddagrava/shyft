import { ComplexDataType } from '../datatype/ComplexDataType';
import { DataType, DataTypeFunction } from '../datatype/DataType';
import { Entity } from '../entity/Entity';

/**
 * base of a model attribute
 */
export type AttributeBase = {
  /**
   * attribute description for documentation purposes
   */
  description: string;

  /**
   * data type of the attribute
   */
  type: DataType | ComplexDataType | Entity;

  /**
   * make attribute non-nullable on the storage level
   */
  required?: boolean;

  /**
   * make this attribute the primary key on the storage level
   */
  primary?: boolean;

  /**
   * enforce uniqueness on this attribute on the storage level
   */
  unique?: boolean;

  /**
   * enable storage level index for faster filtering and lookups
   */
  index?: boolean;

  /**
   * derives a value from the retrieved row data (attribute is not part of the storage model)
   *
   * @param row instance data
   */
  resolve?: (row: object) => any;

  /**
   * default value generator for create type mutations
   */
  defaultValue?: () => any;

  /**
   * custom data serializer function
   */
  serialize?: () => any;

  /**
   * custom validation function
   */
  validate?: () => any;

  /**
   * hide the attribute in the protocol (graphql) layer
   */
  hidden?: boolean;

  /**
   * enable internationalization (extends the given storage model)
   */
  i18n?: boolean;

  /**
   * a custom mock data generator
   */
  mock?: () => any;

  /**
   * attribute is an input for a mutation and not part of the storage model
   */
  mutationInput?: boolean;

  /**
   * place to store custom (project-related) meta data
   */
  meta?: any;
};

/**
 * a model attribute
 */
export type Attribute = AttributeBase & {
  /**
   * name of the attribute
   */
  name: string;

  /**
   * map of target attributes when referencing another entity
   */
  targetAttributesMap?: any;

  /**
   * internal flag for system attributes (e.g. time tracking, state, ...)
   */
  isSystemAttribute?: boolean;
};

/**
 * setup of an attribute
 */
export type AttributeSetup = AttributeBase;

/**
 * map of attributes
 */
export type AttributesMap = {
  /**
   * an attribute
   */
  [key: string]: Attribute;
};

/**
 * setup of a map of attributes
 */
export type AttributesSetupMap = {
  /**
   * an attribute
   */
  [key: string]: AttributeSetup;
};

/**
 * a generator function returning a setup of a map of attributes
 */
export type AttributesMapGenerator = () => AttributesSetupMap;
