import axios from 'axios';

import {
  AcceptInviteRequest,
  BindSocialAccountRequest,
  CheckPositionPermitRequest,
  CheckUserLimitRequest,
  CreateTriggerRequest,
  DeleteTriggerRequest,
  GeneralResponse,
  GetPointUserStatusRequest,
  GetStrategiesDetailRequest,
  GetStrategiesDetailResponse,
  GetStrategyDetailRequest,
  GetStrategyDetailResponse,
  HasSignedPrivateBetaAgreementRequest,
  HasSignedPrivateBetaAgreementResponse,
  ListLeaderboardResponse,
  ListTriggerRequest,
  ListTriggerResponse,
  PointUserStatusResponse,
  RaffleRequest,
  RaffleResponse,
  SignPrivateBetaAgreementRequest,
  SocialLoginRequest,
  SocialLoginResponse,
  UpdatePositionPermitRequest,
  UpdateTriggerRequest,
  UserActivityTrackingRequest,
  ValidateInviteCodeRequest,
  VerifySocialAccountRequest,
  VerifySocialAccountResponse,
  WalletTrackingRequest,
} from './interfaces';

async function buildAxiosGetRequest(
  url: URL,
  request: Readonly<
    | ListTriggerRequest
    | CheckPositionPermitRequest
    | CheckUserLimitRequest
    | GetStrategyDetailRequest
    | HasSignedPrivateBetaAgreementRequest
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
    | UpdateTriggerRequest
    | DeleteTriggerRequest
    | UpdatePositionPermitRequest
    | SignPrivateBetaAgreementRequest
    | WalletTrackingRequest
    | UserActivityTrackingRequest
    | VerifySocialAccountRequest
    | AcceptInviteRequest
    | RaffleRequest
    | ValidateInviteCodeRequest
    | SocialLoginRequest
    | BindSocialAccountRequest
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

  async trackWallet(request: Readonly<WalletTrackingRequest>): Promise<string> {
    const url = new URL('/trackWallet', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async trackUserActivity(
    request: Readonly<UserActivityTrackingRequest>,
  ): Promise<string> {
    const url = new URL('/trackUserActivity', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async listLeaderboard(): Promise<ListLeaderboardResponse> {
    const url = new URL('/listLeaderboard', this.endpoint);
    return (await buildAxiosGetRequest(url, null)).data;
  }

  async verifySocialAccount(
    request: Readonly<VerifySocialAccountRequest>,
  ): Promise<VerifySocialAccountResponse> {
    const url = new URL('/verifySocialAccount', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async socialLogin(
    request: Readonly<SocialLoginRequest>,
  ): Promise<SocialLoginResponse> {
    const url = new URL('/social/login', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async bindSocialAccount(
    request: Readonly<BindSocialAccountRequest>,
  ): Promise<VerifySocialAccountResponse> {
    const url = new URL('/social/bind', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async acceptInvitation(
    request: Readonly<AcceptInviteRequest>,
  ): Promise<GeneralResponse> {
    const url = new URL('/invitations/accept', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async validateInviteCode(
    request: Readonly<ValidateInviteCodeRequest>,
  ): Promise<GeneralResponse> {
    const url = new URL('/invitations/validate', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async raffle(request: Readonly<RaffleRequest>): Promise<RaffleResponse> {
    const url = new URL('/raffle', this.endpoint);
    return (await buildAxiosPostRequest(url, request)).data;
  }

  async getPointUserStatus(
    request: Readonly<GetPointUserStatusRequest>,
  ): Promise<PointUserStatusResponse> {
    const url = new URL(
      `/pointUserStatus/${request.userAddress}`,
      this.endpoint,
    );
    return (await buildAxiosGetRequest(url, null)).data;
  }
}
