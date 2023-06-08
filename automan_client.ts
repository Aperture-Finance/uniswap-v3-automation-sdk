import axios from 'axios';
import stringify from 'json-stable-stringify';
import {
  CheckPositionPermitRequest,
  CreateTriggerRequest,
  DeleteTriggerRequest,
  ListTriggerRequest,
  ListTriggerResponse,
  UpdatePositionPermitRequest,
  UpdateTriggerRequest,
} from './interfaces';

export class AutomanClient {
  constructor(private readonly endpoint: string) {
    if (endpoint == null || endpoint == '') throw 'Invalid endpoint url';
  }

  private async query(url: URL, method: string, request: string) {
    const queryParams = new URLSearchParams({
      params: request,
    });

    return axios({
      method: method,
      url: url.toString(),
      params: queryParams,
    });
  }

  async createTrigger(
    request: Readonly<CreateTriggerRequest>,
  ): Promise<string> {
    const url = new URL('/Prod/createTrigger', this.endpoint);
    return (await this.query(url, 'post', stringify(request))).data;
  }

  async listTrigger(
    request: Readonly<ListTriggerRequest>,
  ): Promise<ListTriggerResponse> {
    const url = new URL('/Prod/listTrigger', this.endpoint);
    return (await this.query(url, 'get', stringify(request))).data;
  }

  async updateTrigger(
    request: Readonly<UpdateTriggerRequest>,
  ): Promise<string> {
    const url = new URL('/Prod/updateTrigger', this.endpoint);
    return (await this.query(url, 'post', stringify(request))).data;
  }

  async deleteTrigger(
    request: Readonly<DeleteTriggerRequest>,
  ): Promise<string> {
    const url = new URL('/Prod/deleteTrigger', this.endpoint);
    return (await this.query(url, 'post', stringify(request))).data;
  }

  async checkPositionApproval(
    request: Readonly<CheckPositionPermitRequest>,
  ): Promise<string> {
    const url = new URL('/Prod/checkPositionApproval', this.endpoint);
    return (await this.query(url, 'get', stringify(request))).data;
  }

  async updatePositionPermit(
    request: Readonly<UpdatePositionPermitRequest>,
  ): Promise<string> {
    const url = new URL('/Prod/updatePositionPermit', this.endpoint);
    return (await this.query(url, 'post', stringify(request))).data;
  }
}
