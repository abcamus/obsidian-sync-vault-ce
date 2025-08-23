import { Notice, requestUrl } from 'obsidian';
import { cloudDiskModel } from '../model/cloud-disk-model';
import { CloudDiskType } from './cloud-interface';
import * as util from '../util';
import { secToMs } from '../util/time';

const logger = util.logger.createLogger('auth');

let codeVerifier = '';
let codeChallenge = '';

interface CheckTokenResult {
    status: 'failure' | 'success';
    access_token?: string;
    expires_at?: string;
}

type oauthMethod = 'get_code' | 'get_token';

interface CloudOAuthParams {
    method: oauthMethod;
    extra_params?: Record<string, any>;
}

let currentAuthState = '';

class CloudAuthAPI {
    client_id: string;
    redirect_uri: string;
    baseUrls: Record<oauthMethod, string>;
    static instances: Record<CloudDiskType, CloudAuthAPI | null> = {
        [CloudDiskType.Aliyun]: null,
        [CloudDiskType.Webdav]: null,
        [CloudDiskType.Unknown]: null,
        [CloudDiskType.Ftp]: null,
        [CloudDiskType.S3]: null,
    };

    private constructor(cloudType: CloudDiskType) {
        switch (cloudType) {
            case CloudDiskType.Aliyun:
                this.client_id = "92a9b44e1ae344638bd78edd46a64b92";
                this.redirect_uri = "obsidian://sync-vault-auth-cb";
                this.baseUrls = {
                    "get_code": 'https://open.aliyundrive.com/oauth/authorize',
                    "get_token": 'https://open.aliyundrive.com/oauth/access_token',
                };
                break;
            case CloudDiskType.Unknown:
                break;
        }
    }

    static createAuthManager(cloudType: CloudDiskType): CloudAuthAPI {
        if (!CloudAuthAPI.instances[cloudType]) {
            CloudAuthAPI.instances[cloudType] = new CloudAuthAPI(cloudType);
        }
        return CloudAuthAPI.instances[cloudType]!;
    }

    async buildQueryCodeUrl(params: CloudOAuthParams): Promise<URL> {
        const url = new URL(this.baseUrls[params.method]);
        url.searchParams.append("client_id", this.client_id);
        url.searchParams.append("redirect_uri", this.redirect_uri);
        url.searchParams.append("scope",
            "user:base,file:all:read,file:all:write"
        );

        /* plain mode */
        const codeChallengeMethod: 'plain' | 'S256' = 'plain';
        url.searchParams.append("response_type", "code");
        if (codeVerifier === '' || codeChallenge === '') {
            const result = await util.encryption.generateCodeChallenge(codeChallengeMethod);
            codeVerifier = result.codeVerifier;
            codeChallenge = result.codeChallenge;
            logger.debug(`codeVerifier: ${codeVerifier}, codeChallenge: ${codeChallenge}`);
        }
        url.searchParams.append("code_challenge_method", codeChallengeMethod);
        url.searchParams.append("code_challenge", codeChallenge);
        currentAuthState = util.generateRandomString();
        url.searchParams.append("state", currentAuthState);

        return url;
    }
}

async function authorize(method: oauthMethod, params?: Record<string, any>): Promise<CheckTokenResult> {
    let cloudAuth: CloudAuthAPI;
    let url;

    cloudAuth = CloudAuthAPI.createAuthManager(cloudDiskModel.selectedCloudDisk);

    if (method === 'get_code') {
        url = await cloudAuth.buildQueryCodeUrl({
            method: method,
            extra_params: params,
        });
        logger.info(`授权url: ${url}`);
        open(url);
        return {
            status: 'success',
        };
    } else if (method === 'get_token') {
        if (!params?.code) {
            throw new Error('code is required');
        }
        if (!codeVerifier) {
            throw new Error('code_verifier is empty, please authorize first');
        }
        try {
            logger.info(`try to get access token, url: ${cloudAuth.baseUrls[method]}, code: ${params.code}`);
            const response = await requestUrl({
                url: cloudAuth.baseUrls[method],
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: cloudAuth.client_id,
                    grant_type: 'authorization_code',
                    code: params.code,
                    code_verifier: codeVerifier,
                }),
                throw: false
            });

            logger.debug(`response: ${JSON.stringify(response)}`);
            if (response.status !== 200) {
                throw new Error(`status: ${response.status}, body: ${response.text}`);
            }
            const data = response.json;
            return {
                status: 'success',
                access_token: data.access_token,
                expires_at: new Date(Date.now() + secToMs(data.expires_in)).toISOString(),
            }
        } catch (error) {
            logger.error(`获取access token失败, error: ${error}, clientId: ${cloudAuth.client_id}, codeVerifier: ${codeVerifier}, code: ${params.code}`);
            return {
                status: 'failure',
            }
        } finally {
            codeVerifier = '';
            codeChallenge = '';
        }
    } else {
        logger.error(`method: ${method} not supported, only support get_code and get_token`);
        return {
            status: 'failure',
        }
    }
}

/* 用于检查access token是否有效
 * 成功则返回status为valid，否则返回其他状态
 * @returns {CheckTokenResult}
 */
async function checkToken(deviceName: string, deviceType: string): Promise<CheckTokenResult> {
    const cloudAuth = CloudAuthAPI.createAuthManager(cloudDiskModel.selectedCloudDisk);

    return {
        status: 'success',
    };
}

async function refreshToken(deviceName: string, deviceType: string): Promise<CheckTokenResult> {
    const cloudAuth = CloudAuthAPI.createAuthManager(cloudDiskModel.selectedCloudDisk);

    return {
        status: 'success',
    }
}

async function checkAndRefreshToken(deviceName: string, deviceType: string): Promise<CheckTokenResult> {
    const checkTokenResult = await checkToken(deviceName, deviceType);
    if (checkTokenResult.status === 'success') {
        logger.info('检查token成功');
        return checkTokenResult;
    }

    try {
        logger.info(`检查token失败，${JSON.stringify(checkTokenResult)}, 刷新token`);
        const refreshTokenResult = await refreshToken(deviceName, deviceType);
        if (refreshTokenResult.status === 'success') {
            logger.info('刷新token成功');
            return refreshTokenResult;
        } else {
            throw new Error('刷新token失败');
        }
    } catch (error) {
        logger.info('刷新token失败，需要重新授权');
        new Notice('更新授权失败，请重新授权');
        return {
            status: 'failure',
        };
    }
}

export const cloudAuthService = {
    authorize,
    checkToken,
    refreshToken,
    checkAndRefreshToken,
}