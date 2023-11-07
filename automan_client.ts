import axios from 'axios';

import {
  CheckPositionPermitRequest,
  CheckUserLimitRequest,
  CreateTriggerRequest,
  DeleteTriggerRequest,
  HasSignedPrivateBetaAgreementRequest,
  HasSignedPrivateBetaAgreementResponse,
  ListTriggerRequest,
  ListTriggerResponse,
  SignPrivateBetaAgreementRequest,
  UpdatePositionPermitRequest,
  UpdateTriggerRequest,
} from './interfaces';

async function buildAxiosGetRequest(
  url: URL,
  request: Readonly<
    | ListTriggerRequest
    | CheckPositionPermitRequest
    | CheckUserLimitRequest
    | HasSignedPrivateBetaAgreementRequest
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
    | UpdateTriggerRequest
    | DeleteTriggerRequest
    | UpdatePositionPermitRequest
    | SignPrivateBetaAgreementRequest
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

  async signPrivateBetaAgreement(
    request: Readonly<SignPrivateBetaAgreementRequest>,
  ): Promise<string> {
    const url = new URL('/signPrivateBetaAgreement', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async hasSignedPrivateBetaAgreement(
    request: Readonly<HasSignedPrivateBetaAgreementRequest>,
  ): Promise<HasSignedPrivateBetaAgreementResponse> {
    const url = new URL('/hasSignedPrivateBetaAgreement', this.endpoint);
    return (await buildAxiosGetRequest(url, request)).data;
  }
}
