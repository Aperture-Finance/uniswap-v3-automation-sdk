import { AutomanClient } from '../automan_client';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('Automan client test', () => {
  const mock = new MockAdapter(axios);
  const url = 'https://test-url/';
  const client = new AutomanClient(url);
  beforeEach(() => {
    mock.reset();
  });

  it('Should call create trigger', async () => {
    const request = {
      payload: {
        ownerAddr: '0x087d531a59Ab1C89a831715a6B171B7FdF5A0566',
        chainId: 5,
        nftId: 64448,
        condition: { type: 'Time', timeAfterEpochSec: 1683258065 },
        action: { type: 'Close', maxGasProportion: 1, slippage: 0.8 },
      },
      payloadSignature:
        '0xd924e9111f675eb8dab6ab2d615db517b6e84fbdecf09031784b50fe973bb0602c21bef0e46318ece56d013be00774dd8f33fa0d3195976b409f7b4d1b7ce93b1c',
      permitInfo: {
        signature:
          '0x932c7ffa49893a536a8bae5854afededf22c984e99475ca3a357daa9a4837fe469409540970f7eccb89c0f3f38230c299f9c1ac7fb236c8780c3f49fb75483501c',
        deadline: 2546981066,
      },
    };
    const responseData = 'Success';
    mock.onPost(`${url}Prod/createTrigger`).reply(200, responseData);

    const response = await client.createTrigger(request);
    expect(response).toEqual(responseData);
    // Expect to call post once.
    expect(mock.history.post.length).toEqual(1);
    // Expect request params to match.
    expect(mock.history.post[0].params.toString()).toEqual(
      new URLSearchParams({ params: JSON.stringify(request) }).toString(),
    );
  });

  it('Should call list trigger', async () => {
    const request = {
      ownerAddr: '0x087d531a59Ab1C89a831715a6B171B7FdF5A0566',
      chainId: 5,
      isLimitOrder: false,
    };

    const responseData = {
      triggers: [
        { taskId: 0, nftId: 64448, status: 'Deleted' },
        { taskId: 1, nftId: 64448, status: 'Created' },
      ],
    };
    mock.onGet(`${url}Prod/listTrigger`).reply(200, responseData);

    const response = await client.listTrigger(request);
    expect(response).toEqual(responseData);

    // Expect to call get once.
    expect(mock.history.get.length).toEqual(1);
    // Expect request params to match input request.
    expect(mock.history.get[0].params.toString()).toEqual(
      new URLSearchParams({ params: JSON.stringify(request) }).toString(),
    );
  });

  it('Should call delete trigger', async () => {
    const request = {
      payload: {
        ownerAddr: '0x087d531a59Ab1C89a831715a6B171B7FdF5A0566',
        chainId: 5,
        taskId: 0,
      },
      payloadSignature:
        '0x62b2152b10e570cbe68069584a62f274103d3bb0ec5dc75ad803ba84221e464008b657b831bf1b040a66f5f0247aae0cedb26db4cdf27cdc1c8a8c7f3c1ae1c81c',
    };

    const responseData = 'Success';
    mock.onPost(`${url}Prod/deleteTrigger`).reply(200, responseData);

    const response = await client.deleteTrigger(request);
    expect(response).toEqual(responseData);
    // Expect to call post once.
    expect(mock.history.post.length).toEqual(1);
    // Expect request params to match.
    expect(mock.history.post[0].params.toString()).toEqual(
      new URLSearchParams({ params: JSON.stringify(request) }).toString(),
    );
  });
});
