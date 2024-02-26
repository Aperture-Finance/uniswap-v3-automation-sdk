import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import {
  ActionTypeEnum,
  AutomanClient,
  CheckPositionPermitRequest,
  CheckUserLimitRequest,
  ConditionTypeEnum,
  GetStrategyDetailRequest,
  GetStrategyDetailResponse,
  UpdatePositionPermitRequest,
  WalletTypeEnum,
} from '../../src';

describe('Automan client test', () => {
  const mock = new MockAdapter(axios);
  const url = 'https://test-url';
  const client = new AutomanClient(url);
  beforeEach(() => {
    mock.reset();
  });

  it('Should call create trigger', async () => {
    const request = {
      payload: {
        ownerAddr: '0x087d531a59Ab1C89a831715a6B171B7FdF5A0566',
        chainId: 5,
        nftId: '64448',
        condition: {
          type: ConditionTypeEnum.enum.Time,
          timeAfterEpochSec: 1683258065,
        },
        action: {
          type: ActionTypeEnum.enum.Close,
          maxGasProportion: 1,
          slippage: 0.8,
        },
        expiration: 1983258065,
      },
      payloadSignature:
        '0xd924e9111f675eb8dab6ab2d615db517b6e84fbdecf09031784b50fe973bb0602c21bef0e46318ece56d013be00774dd8f33fa0d3195976b409f7b4d1b7ce93b1c',
      permitInfo: {
        signature:
          '0x932c7ffa49893a536a8bae5854afededf22c984e99475ca3a357daa9a4837fe469409540970f7eccb89c0f3f38230c299f9c1ac7fb236c8780c3f49fb75483501c',
        deadline: '2546981066',
      },
    };
    const responseData = 'Success';
    mock.onPost(`${url}/createTrigger`).reply(200, responseData);

    const response = await client.createTrigger(request);
    expect(response).toEqual(responseData);
    // Expect to call post once.
    expect(mock.history.post.length).toEqual(1);
    // Expect request params to match.
    expect(JSON.parse(mock.history.post[0].data)).toEqual(request);
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
    mock.onGet(`${url}/listTrigger`).reply(200, responseData);

    const response = await client.listTrigger(request);
    expect(response).toEqual(responseData);

    // Expect to call get once.
    expect(mock.history.get.length).toEqual(1);
    // Expect request params to match input request.
    expect(JSON.parse(mock.history.get[0].params.get('request'))).toEqual(
      request,
    );
  });

  it('Should call update trigger', async () => {
    const request = {
      payload: {
        ownerAddr: '0x087d531a59Ab1C89a831715a6B171B7FdF5A0566',
        chainId: 5,
        taskId: 0,
        expiration: 123,
      },
      payloadSignature:
        '0x62b2152b10e570cbe68069584a62f274103d3bb0ec5dc75ad803ba84221e464008b657b831bf1b040a66f5f0247aae0cedb26db4cdf27cdc1c8a8c7f3c1ae1c81c',
    };

    const responseData = 'Success';
    mock.onPost(`${url}/updateTrigger`).reply(200, responseData);

    const response = await client.updateTrigger(request);
    expect(response).toEqual(responseData);
    // Expect to call post once.
    expect(mock.history.post.length).toEqual(1);
    // Expect request params to match.
    expect(JSON.parse(mock.history.post[0].data)).toEqual(request);
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
    mock.onPost(`${url}/deleteTrigger`).reply(200, responseData);

    const response = await client.deleteTrigger(request);
    expect(response).toEqual(responseData);
    // Expect to call post once.
    expect(mock.history.post.length).toEqual(1);
    // Expect request params to match.
    expect(JSON.parse(mock.history.post[0].data)).toEqual(request);
  });

  it('Should call check position approval', async () => {
    const request: CheckPositionPermitRequest = {
      chainId: 1,
      tokenId: '2',
    };

    const responseData = false;
    mock.onGet(`${url}/checkPositionApproval`).reply(200, responseData);

    const response = await client.checkPositionApproval(request);
    expect(response).toEqual(responseData);
    // Expect to call get once.
    expect(mock.history.get.length).toEqual(1);
    // Expect request params to match.
    expect(JSON.parse(mock.history.get[0].params.get('request'))).toEqual(
      request,
    );
  });

  it('Should call update position permit', async () => {
    const request: UpdatePositionPermitRequest = {
      chainId: 1,
      tokenId: '2',
      permitInfo: {
        signature: '0x111',
        deadline: '123',
      },
    };

    const responseData = 'Success';
    mock.onPost(`${url}/updatePositionPermit`).reply(200, responseData);

    const response = await client.updatePositionPermit(request);
    expect(response).toEqual(responseData);
    // Expect to call post once.
    expect(mock.history.post.length).toEqual(1);
    // Expect request params to match.
    expect(JSON.parse(mock.history.post[0].data)).toEqual(request);
  });

  it('Should call check user limit', async () => {
    const request: CheckUserLimitRequest = {
      chainId: 1,
      tokenId: '2',
      ownerAddr: '0x087d531a59Ab1C89a831715a6B171B7FdF5A0566',
      actionType: 'Reinvest',
    };

    const responseData = false;
    mock.onGet(`${url}/checkUserLimit`).reply(200, responseData);

    const response = await client.checkUserLimit(request);
    expect(response).toEqual(responseData);
    // Expect to call get once.
    expect(mock.history.get.length).toEqual(1);
    // Expect request params to match.
    expect(JSON.parse(mock.history.get[0].params.get('request'))).toEqual(
      request,
    );
  });

  it('Should call get strategy detail', async () => {
    const request: GetStrategyDetailRequest = {
      chainId: 5,
      ownerAddr: '0x087d531a59Ab1C89a831715a6B171B7FdF5A0566',
      strategyId:
        'effc0cdc899eba75ea5294dccd78194ec0bd36eae80ed53acfa0a9b3fe8e6bb0',
    };

    const responseData = {} as GetStrategyDetailResponse;
    mock.onGet(`${url}/getStrategyDetail`).reply(200, responseData);

    const response = await client.getStrategyDetail(request);
    expect(response).toEqual(responseData);
    // Expect to call get once.
    expect(mock.history.get.length).toEqual(1);
    // Expect request params to match.
    expect(JSON.parse(mock.history.get[0].params.get('request'))).toEqual(
      request,
    );
  });

  it('Should call tract wallet', async () => {
    const request = {
      chainId: 5,
      address: '0xdC333239245ebBC6B656Ace7c08099AA415585d1',
      timestamp_secs: 1708938824,
      walletClient: WalletTypeEnum['HALO'],
    };

    const responseData = 'Success';
    mock.onPost(`${url}/trackWallet`).reply(200, responseData);

    const response = await client.trackWallet(request);
    expect(response).toEqual(responseData);
    // Expect to call post once.
    expect(mock.history.post.length).toEqual(1);
    // Expect request params to match.
    expect(JSON.parse(mock.history.post[0].data)).toEqual(request);
  });
});
