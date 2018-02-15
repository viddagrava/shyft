import './beforeAll';
import {
  find,
} from './db';

import {
  asAdmin,
  removeListDynamicData,
} from './testUtils';

import { Profile } from './models/Profile';


const orderByIdAsc = {
  orderBy: [{
    attribute: 'id',
    direction: 'ASC'
  }]
}

const orderByIdDesc = {
  orderBy: [{
    attribute: 'id',
    direction: 'DESC'
  }]
}

describe('list', () => {

  it('orderBy', async () => {
    const profiles = await find(Profile, { ...orderByIdAsc }, asAdmin())
    profiles.data = removeListDynamicData(Profile, profiles.data)
    expect(profiles).toMatchSnapshot()
  })


  it('orderBy + first', async () => {
    const profiles = await find(Profile, { ...orderByIdAsc, first: 3 }, asAdmin())
    profiles.data = removeListDynamicData(Profile, profiles.data)
    expect(profiles).toMatchSnapshot()
  })


  it('orderBy + last', async () => {
    const profiles = await find(Profile, { ...orderByIdAsc, last: 3 }, asAdmin())
    profiles.data = removeListDynamicData(Profile, profiles.data)
    expect(profiles).toMatchSnapshot()
  })


  it('descending orderBy', async () => {
    const profiles = await find(Profile, { ...orderByIdDesc }, asAdmin())
    profiles.data = removeListDynamicData(Profile, profiles.data)
    expect(profiles).toMatchSnapshot()
  })


  it('descending orderBy + first', async () => {
    const profiles = await find(Profile, { ...orderByIdDesc, first: 3 }, asAdmin())
    profiles.data = removeListDynamicData(Profile, profiles.data)
    expect(profiles).toMatchSnapshot()
  })


  it('descending orderBy + last', async () => {
    const profiles = await find(Profile, { ...orderByIdDesc, last: 3 }, asAdmin())
    profiles.data = removeListDynamicData(Profile, profiles.data)
    expect(profiles).toMatchSnapshot()
  })

})
