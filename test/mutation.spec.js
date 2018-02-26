import './setupAndTearDown';
import {
  mutate,
} from './db';

import {
  asUser,
  removeDynamicData,
} from './testUtils';

import { Participant } from './models/Participant';
import { Board } from './models/Board';


describe('mutation', () => {

  it('reject mutations without state transitions on stateful entities', async () => {

    const payload = {
      board: 50,
    }

    await mutate(Participant, 'create', payload, null, asUser(99))
      .catch(e => {
        expect(e).toMatchSnapshot()
      })

  })



  it('perform create mutations', async () => {

    const payload = {
      board: 50,
    }

    const result = await mutate(Participant, 'join', payload, null, asUser(99))
    expect(removeDynamicData(Participant, result)).toMatchSnapshot()
  })


  it('perform update mutations', async () => {

    const payload = {
      board: 50,
      invitee: 80,
    }

    let result = await mutate(Participant, 'invite', payload, null, asUser(84))
    const inviteId = result.id
    expect(removeDynamicData(Participant, result)).toMatchSnapshot()

    result = await mutate(Participant, 'accept', {}, inviteId, asUser(80))
    expect(removeDynamicData(Participant, result)).toMatchSnapshot()
  })


  it('handle uniqueness constraints', async () => {

    const payload = {
      name: 'New Board',
      isPrivate: false,
    }

    await mutate(Board, 'build', payload, null, asUser(99))

    await mutate(Board, 'build', payload, null, asUser(99))
      .catch(e => {
        expect(e).toMatchSnapshot()
      })
  })


  it('perform delete mutations', async () => {

    const payload = {
      board: 50,
      invitee: 80,
    }

    let result = await mutate(Participant, 'invite', payload, null, asUser(65))
    const inviteId = result.id
    expect(removeDynamicData(Participant, result)).toMatchSnapshot()

    result = await mutate(Participant, 'remove', {}, inviteId, asUser(80))
    expect(removeDynamicData(Participant, result)).toMatchSnapshot()
  })


  it('reject mutations if ID not found', async () => {

    await mutate(Participant, 'remove', {}, 99999, asUser(80))
      .catch(e => {
        expect(e).toMatchSnapshot()
      })
  })


  it('reject unknown mutations', async () => {

    await mutate(Participant, 'findInnerPeace', {}, 1, asUser(80))
      .catch(e => {
        expect(e).toMatchSnapshot()
      })
  })

})
