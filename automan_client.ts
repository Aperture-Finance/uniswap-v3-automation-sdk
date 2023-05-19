import axios from 'axios';
import {
  CreateTriggerRequest,
  DeleteTriggerRequest,
  ListTriggerRequest,
  ListTriggerResponse,
} from './interfaces';

export class AutomanClient {
  constructor(private readonly endpoint: string) {
    if (endpoint == null || endpoint == '') throw 'Invalid endpoint url';
  }

  private async query(url: URL, method: string, request: string) {
    const queryParams = new URLSearchParams({
      params: request,
    });

    return await axios({
      method: method,
      url: url.toString(),
      params: queryParams,
    });
  }

  async createTrigger(
    request: Readonly<CreateTriggerRequest>,
  ): Promise<string> {
    const url = new URL('/Prod/createTrigger', this.endpoint);
    return (await this.query(url, 'post', JSON.stringify(request))).data;
  }

  async listTrigger(
    request: Readonly<ListTriggerRequest>,
  ): Promise<ListTriggerResponse> {
    const url = new URL('/Prod/listTrigger', this.endpoint);
    return (await this.query(url, 'get', JSON.stringify(request))).data;
  }

  async deleteTrigger(
    request: Readonly<DeleteTriggerRequest>,
  ): Promise<string> {
    const url = new URL('/Prod/deleteTrigger', this.endpoint);
    return (await this.query(url, 'post', JSON.stringify(request))).data;
  }
}
