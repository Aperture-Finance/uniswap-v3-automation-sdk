import axios from 'axios';

import {
  CheckPositionPermitRequest,
  CheckUserLimitRequest,
  CreateTriggerRequest,
  DeleteTriggerRequest,
  GetStrategiesDetailRequest,
  GetStrategiesDetailResponse,
  GetStrategyDetailRequest,
  GetStrategyDetailResponse,
  ListTriggerRequest,
  ListTriggerResponse,
  UpdatePositionPermitRequest,
  UpdateTriggerRequest,
} from './interfaces';

async function buildAxiosGetRequest(
  url: URL,
  request: Readonly<
    | CheckPositionPermitRequest
    | CheckUserLimitRequest
    | GetStrategyDetailRequest
    | GetStrategiesDetailRequest
    | ListTriggerRequest
    | null
  >,
) {
  return axios.get(url.toString(), {
    params: new URLSearchParams({
      request: JSON.stringify(request),
    }),
  });
}

async function buildAxiosPostRequest(
  url: URL,
  request: Readonly<
    | CreateTriggerRequest
    | DeleteTriggerRequest
    | UpdatePositionPermitRequest
    | UpdateTriggerRequest
  >,
) {
  return axios.post(url.toString(), request);
}

export class AutomanClient {
  constructor(private readonly endpoint: string) {
    if (endpoint == null || endpoint == '') throw 'Invalid endpoint url';
  }

  async createTrigger(
    request: Readonly<CreateTriggerRequest>,
  ): Promise<string> {
    const url = new URL('/createTrigger', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async listTrigger(
    request: Readonly<ListTriggerRequest>,
  ): Promise<ListTriggerResponse> {
    const url = new URL('/listTrigger', this.endpoint);
    return (await buildAxiosGetRequest(url, request)).data;
  }

  async updateTrigger(
    request: Readonly<UpdateTriggerRequest>,
  ): Promise<string> {
    const url = new URL('/updateTrigger', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async deleteTrigger(
    request: Readonly<DeleteTriggerRequest>,
  ): Promise<string> {
    const url = new URL('/deleteTrigger', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async checkPositionApproval(
    request: Readonly<CheckPositionPermitRequest>,
  ): Promise<string> {
    const url = new URL('/checkPositionApproval', this.endpoint);
    return (await buildAxiosGetRequest(url, request)).data;
  }

  async updatePositionPermit(
    request: Readonly<UpdatePositionPermitRequest>,
  ): Promise<string> {
    const url = new URL('/updatePositionPermit', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async checkUserLimit(
    request: Readonly<CheckUserLimitRequest>,
  ): Promise<string> {
    const url = new URL('/checkUserLimit', this.endpoint);
    return (await buildAxiosGetRequest(url, request)).data;
  }

  async getStrategyDetail(
    request: Readonly<GetStrategyDetailRequest>,
  ): Promise<GetStrategyDetailResponse> {
    const url = new URL('/getStrategyDetail', this.endpoint);
    return (await buildAxiosGetRequest(url, request)).data;
  }

  async getStrategiesDetail(
    request: Readonly<GetStrategiesDetailRequest>,
  ): Promise<GetStrategiesDetailResponse> {
    const url = new URL('/getStrategiesDetail', this.endpoint);
    return (await buildAxiosGetRequest(url, request)).data;
  }
}
