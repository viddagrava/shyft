
import {
  passOrThrow,
  isFunction,
} from '../util';

import { isEntity } from '../entity/Entity';
import { isDataType } from './DataType';
import ComplexDataType, { isComplexDataType } from './ComplexDataType';


class ListDataType extends ComplexDataType {

  constructor (setup = {}) {

    super()

    const {
      name,
      itemType,
    } = setup

    passOrThrow(name, () => 'Missing list data type name')
    passOrThrow(itemType, () => `Missing item type for list data type '${name}'`)

    passOrThrow(
      isDataType(itemType) || isEntity(itemType) || isComplexDataType(itemType) || isFunction(itemType),
      () => `List data type '${name}' has invalid item type '${String(itemType)}'`
    )

    this.name = name
    this.itemType = itemType
  }


  _processItemType() {
    return isFunction(this.itemType)
      ? this.itemType(this.name)
      : this.itemType
  }


  getItemType() {
    if (this._itemType) {
      return this._itemType
    }

    const ret = this._itemType = this._processItemType()
    return ret
  }


  toString() {
    return this.name
  }

}


export default ListDataType


export const isListDataType = (obj) => {
  return (obj instanceof ListDataType)
}


export const buildListDataType = (obj) => {
  return (name) => new ListDataType({
    ...obj,
    name,
  })
}
