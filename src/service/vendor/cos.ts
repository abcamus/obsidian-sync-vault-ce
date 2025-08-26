// cos-client.ts
import { requestUrl } from 'obsidian';
import * as CryptoJS from 'crypto-js';
import { XMLParser } from "fast-xml-parser";

import * as util from '@/util';

const logger = util.logger.createLogger('cos-client');

// COS 配置接口
export interface CosConfig {
    secretId: string;
    secretKey: string;
    bucket: string;
    region: string;
    endpoint?: string;
    protocol?: 'http' | 'https';
}

// 对象元数据接口
export interface CosObjectMetadata {
    [key: string]: string;
}

// 对象信息接口
export interface CosObject {
    Key: string;
    Size: number;
    LastModified: Date;
    ETag: string;
    StorageClass: string;
    Owner: {
        ID: string;
        DisplayName: string;
    };
    Metadata: CosObjectMetadata;
}

// 列表结果接口
export interface ListObjectsResult {
    Name: string;
    Prefix: string;
    Marker: string;
    MaxKeys: number;
    Delimiter?: string;
    IsTruncated: boolean;
    NextMarker?: string;
    Contents: CosObject[];
    CommonPrefixes?: string[];
    EncodingType?: string;
}

export interface GetCorsResult {
    CORSConfiguration: {
        CORSRule: {
            AllowedOrigin: string;
            AllowedMethod: string[];
            AllowedHeader: string;
            ExposeHeader: string[];
            MaxAgeSeconds: number;
        };
    };
}

// 列表参数接口
export interface ListObjectsParams {
    prefix?: string;
    delimiter?: string;
    marker?: string;
    maxKeys?: number;
    encodingType?: string;
}

interface CosSignParams {
    secretId: string;
    secretKey: string;
    method?: string;
    pathname?: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    expires?: number;
}

export class TencentCosClient {
    private config: CosConfig;

    constructor(config: CosConfig) {
        this.config = {
            protocol: 'https',
            ...config
        };
    }

    // 获取 endpoint
    private getEndpoint(): string {
        if (this.config.endpoint) {
            return `${this.config.protocol}://${this.config.endpoint}`;
        }
        return `${this.config.protocol}://${this.config.bucket}.cos.${this.config.region}.myqcloud.com`;
    }

    private async hmacSha1Crypto(key: string, message: string): Promise<string> {
        // const hmac = crypto.createHmac('sha1', key);
        // hmac.update(message);
        // return hmac.digest('hex'); // 返回16进制字符串

        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const messageData = encoder.encode(message);

        // 导入密钥
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: 'HMAC',
                hash: { name: 'SHA-1' }
            },
            false,
            ['sign']
        );

        // 生成HMAC
        const signature = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            messageData
        );

        // 将ArrayBuffer转换为16进制字符串
        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private sha1Hash(data: string): string {
        return CryptoJS.SHA1(data).toString(CryptoJS.enc.Hex);
    }

    private calculateMD5Hash(content: string): string {
        const md5Hash = CryptoJS.MD5(content);
        return CryptoJS.enc.Base64.stringify(md5Hash);
    }


    async generateSignature(params: CosSignParams): Promise<string> {
        const {
            secretId,
            secretKey,
            method = 'get',
            pathname = '/',
            params: queryParams = {},
            headers = {},
            expires = 3600  // 默认60分钟
        } = params;

        // 1. 生成签名时间
        const signTime = Math.floor(Date.now() / 1000);
        const endTime = signTime + expires;
        const keyTime = `${signTime};${endTime}`;

        // 2. 处理 HTTP 请求方法
        const httpMethod = method.toLowerCase();

        // 3. 处理请求路径
        const httpUri = pathname.startsWith('/') ? pathname : `/${pathname}`;

        // 4. 处理查询参数
        const httpParameters = Object.keys(queryParams)
            .sort()
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
            .join('&');

        // 5. 处理请求头
        const httpHeaders = Object.keys(headers)
            .sort()
            .map(key => `${key.toLowerCase()}=${encodeURIComponent(headers[key])}`)
            .join('&');

        logger.debug({ secretKey, keyTime });
        // 6. 生成签名键
        const signKey = await this.hmacSha1Crypto(secretKey, keyTime);
        logger.debug({ signKey });

        // 7. 生成 HttpString
        const httpString = [
            httpMethod,
            httpUri,
            httpParameters,
            httpHeaders,
            ''  // 以空行结尾
        ].join('\n');

        logger.debug({ httpMethod, httpUri, httpParameters, httpHeaders });
        logger.debug({ httpString });

        // 8. 生成 StringToSign
        const sha256Hash = this.sha1Hash(httpString);
        const stringToSign = [
            'sha1',
            keyTime,
            sha256Hash,
            ''  // 以空行结尾
        ].join('\n');

        logger.debug({ stringToSign });

        // 9. 计算签名
        const signature = await this.hmacSha1Crypto(signKey, stringToSign);

        logger.debug({ signature });

        // 10. 生成签名字符串
        const authorization = [
            'q-sign-algorithm=sha1',
            `q-ak=${secretId}`,
            `q-sign-time=${keyTime}`,
            'q-key-time=' + keyTime,
            'q-header-list=' + Object.keys(headers).sort().join(';').toLowerCase(),
            'q-url-param-list=' + Object.keys(queryParams).sort().join(';'),
            `q-signature=${signature}`
        ].join('&');

        return authorization;
    }

    // 解析 XML 响应
    private async parseXmlResponse<T>(text: string): Promise<T> {
        try {
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '',
                parseTagValue: true,
                trimValues: true,
            });
            return parser.parse(text) as T;
        } catch (error) {
            throw new Error(`Failed to parse XML response: ${error}`);
        }
    }

    // 提取元数据从响应头
    private extractMetadataFromHeaders(headers: Record<string, string>): CosObjectMetadata {
        const metadata: CosObjectMetadata = {};

        for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase().startsWith('x-cos-meta-')) {
                const metaKey = key.toLowerCase().replace('x-cos-meta-', '');
                metadata[metaKey] = value;
            }
        }

        return metadata;
    }

    async getBucketCors(): Promise<GetCorsResult> {
        const method = 'GET';
        const path = '/';

        const authorization = await this.generateSignature({
            secretId: this.config.secretId,
            secretKey: this.config.secretKey,
            method: method,
            pathname: path,
            // params: { 'cors': '' },
            headers: {}
        });

        const url = `${this.getEndpoint()}${path}?cors`;
        logger.debug('Getting bucket CORS with URL:', url);

        try {
            const response = await requestUrl({
                url,
                method: method,
                headers: {
                    'Authorization': authorization,
                    'Date': new Date().toUTCString()
                },
                throw: false,
            });

            logger.debug('Get bucket CORS response:', response);

            if (response.status >= 200 && response.status < 300) {
                return this.parseXmlResponse(response.text);
            } else {
                throw new Error(`Failed to get CORS configuration: ${response.status} ${response.text}`);
            }

        } catch (error) {
            throw error;
        }
    }

    async putBucketCors() {
        const method = 'PUT';
        const path = '/?cors';

        const corsConfiguration = `
            <CORSConfiguration>
                <CORSRule>
                    <AllowedOrigin>*</AllowedOrigin>
                    <AllowedMethod>GET</AllowedMethod>
                    <AllowedMethod>PUT</AllowedMethod>
                    <AllowedMethod>POST</AllowedMethod>
                    <AllowedMethod>DELETE</AllowedMethod>
                    <AllowedHeader>*</AllowedHeader>
                    <ExposeHeader>*</ExposeHeader>
                    <MaxAgeSeconds>3000</MaxAgeSeconds>
                </CORSRule>
            </CORSConfiguration>
        `.trim();

        const authorization = await this.generateSignature({
            secretId: this.config.secretId,
            secretKey: this.config.secretKey,
            method: method,
            pathname: path,
            headers: {}
        });

        const url = `${this.getEndpoint()}${path}`;
        logger.debug('Putting bucket CORS with URL:', url);

        try {
            const response = await requestUrl({
                url,
                method: method,
                headers: {
                    'Authorization': authorization,
                    'Date': new Date().toUTCString(),
                    'Content-Type': 'application/xml',
                    'Content-MD5': this.calculateMD5Hash(corsConfiguration)
                },
                body: corsConfiguration,
                throw: false,
            });

            logger.debug('Put bucket CORS response:', response);

            if (response.status >= 200 && response.status < 300) {
                return true;
            } else {
                throw new Error(`Failed to set CORS configuration: ${response.status} ${response.text}`);
            }

        } catch (error) {
            throw error;
        }
    }

    // 列出对象（主要方法）
    async listObjects(params?: ListObjectsParams): Promise<ListObjectsResult> {
        logger.debug('Listing objects with params:', params);

        const queryParams: Record<string, string> = {
            // 'list-type': '2'
        };

        if (params?.prefix) queryParams.prefix = params.prefix;
        if (params?.delimiter) queryParams.delimiter = params.delimiter;
        if (params?.marker) queryParams.marker = params.marker;
        if (params?.maxKeys) queryParams['max-keys'] = params.maxKeys.toString();
        if (params?.encodingType) queryParams['encoding-type'] = params.encodingType;

        const path = '/';
        const method = 'GET';

        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        // 生成完整的 URL
        const url = `${this.getEndpoint()}${path}${queryString ? '?' + queryString : ''}`;
        logger.debug('List objects URL:', url);

        // 生成签名
        const authorization = await this.generateSignature({
            secretId: this.config.secretId,
            secretKey: this.config.secretKey,
            method: method,
            pathname: path,
            params: queryParams,
            headers: {}
        });

        logger.debug('List objects authorization:', {
            secretId: this.config.secretId,
            secretKey: this.config.secretKey,
            method,
            path,
            queryParams,
            headers: {},
            authorization
        });

        try {
            const response = await requestUrl({
                url,
                method: method,
                headers: {
                    'Authorization': authorization,
                    'Date': new Date().toUTCString()
                },
                throw: false,
            });

            logger.debug('List objects response:', response);

            // 解析 XML 响应
            const xmlResult = await this.parseXmlResponse<any>(response.text);

            if (!xmlResult.ListBucketResult) {
                throw new Error('Invalid response format');
            }

            const result = xmlResult.ListBucketResult;

            // 转换响应数据
            const listResult: ListObjectsResult = {
                Name: result.Name,
                Prefix: result.Prefix || '',
                Marker: result.Marker || '',
                MaxKeys: parseInt(result.MaxKeys || '1000'),
                Delimiter: result.delimiter,
                IsTruncated: result.IsTruncated === 'true',
                NextMarker: result.NextMarker,
                Contents: [],
                CommonPrefixes: result.commonprefixes ?
                    (Array.isArray(result.commonprefixes) ?
                        result.commonprefixes.map((cp: any) => cp.prefix) :
                        [result.commonprefixes.prefix]) :
                    undefined,
                EncodingType: result.encodingtype
            };

            // 处理 Contents
            if (result.Contents) {
                const contents = Array.isArray(result.Contents) ? result.Contents : [result.Contents];

                listResult.Contents = await Promise.all(
                    contents.map(async (content: any) => {
                        // 对于每个对象，获取详细的元数据
                        const metadata = await this.getObjectMetadata(content.Key);

                        return {
                            Key: content.Key,
                            Size: parseInt(content.Size),
                            LastModified: new Date(content.LastModified),
                            ETag: content.ETag ? content.ETag.replace(/"/g, '') : '',
                            StorageClass: content.StorageClass || 'STANDARD',
                            Owner: {
                                ID: content.Owner?.ID || '',
                                DisplayName: content.OWNER?.DisplayName || ''
                            },
                            Metadata: metadata
                        };
                    })
                );
            }

            return listResult;

        } catch (error) {
            throw error;
        }
    }

    // 获取对象元数据
    async getObjectMetadata(key: string): Promise<CosObjectMetadata> {
        const method = 'HEAD';
        const path = `/${key}`;

        const authorization = await this.generateSignature({
            secretId: this.config.secretId,
            secretKey: this.config.secretKey,
            method: method,
            pathname: path,
            headers: {}
        });

        // const queryString = Object.entries(queryParams).map(([key, value]) => `${key}=${value}`).join('&');
        const url = `${this.getEndpoint()}/${encodeURIComponent(key)}`;//?${queryString}`;
        logger.debug(`Getting metadata for object with URL: ${url}`);

        try {
            const response = await requestUrl({
                url,
                method: method,
                headers: {
                    'Authorization': authorization,
                    'Date': new Date().toUTCString()
                },
                throw: false,
            });

            logger.debug('Get object metadata response:', { key, headers: response.headers });

            return this.extractMetadataFromHeaders(response.headers);

        } catch (error) {
            console.warn(`Failed to get metadata for ${key}:`, error);
            return {};
        }
    }

    // 分页列出所有对象
    async listAllObjects(params?: Omit<ListObjectsParams, 'marker' | 'maxKeys'>): Promise<CosObject[]> {
        let allObjects: CosObject[] = [];
        let marker: string | undefined;
        let isTruncated = true;

        while (isTruncated) {
            const result = await this.listObjects({
                ...params,
                marker,
                maxKeys: 1000 // 每次最多获取1000个对象
            });

            allObjects = [...allObjects, ...result.Contents];
            isTruncated = result.IsTruncated;
            marker = result.NextMarker;

            if (isTruncated && !marker) {
                // 如果没有 NextMarker，使用最后一个对象的 Key
                marker = result.Contents[result.Contents.length - 1]?.Key;
            }
        }

        return allObjects;
    }

    // 列出带前缀的对象（简化方法）
    async listObjectsByPrefix(prefix: string, maxKeys?: number): Promise<CosObject[]> {
        const result = await this.listObjects({
            prefix,
            maxKeys
        });
        return result.Contents;
    }

    // 检查对象是否存在
    async objectExists(key: string): Promise<boolean> {
        try {
            const method = 'HEAD';
            const path = `/${encodeURIComponent(key)}`;
            const authorization = await this.generateSignature({
                secretId: this.config.secretId,
                secretKey: this.config.secretKey,
                method: method,
                pathname: path
            });

            await requestUrl({
                url: path,
                method: method,
                headers: {
                    'Authorization': authorization,
                    'Date': new Date().toUTCString()
                }
            });
            return true;
        } catch (error) {
            throw error;
        }
    }

    async deleteObject(key: string): Promise<void> {
        logger.debug(`Deleting object with key: ${key}`);
        const path = `/${key}`;
        const authorization = await this.generateSignature({
            secretId: this.config.secretId,
            secretKey: this.config.secretKey,
            method: 'DELETE',
            pathname: path
        });

        const url = `${this.getEndpoint()}/${encodeURIComponent(key)}`;

        try {
            await requestUrl({
                url,
                method: 'DELETE',
                headers: {
                    'Authorization': authorization,
                    'Date': new Date().toUTCString()
                }
            });
        } catch (error) {
            throw error;
        }
    }

    async copyObject(fromKey: string, toKey: string): Promise<void> {
        logger.debug(`Copying object from ${fromKey} to ${toKey}`);
        const method = 'PUT';
        const path = `/${toKey}`;
        const source = `${this.config.bucket}.cos.${this.config.region}.myqcloud.com/${fromKey}`;
        const authorization = await this.generateSignature({
            secretId: this.config.secretId,
            secretKey: this.config.secretKey,
            method,
            pathname: path,
            headers: {
                'x-cos-copy-source': encodeURIComponent(source)
            }
        });

        const url = `${this.getEndpoint()}/${encodeURIComponent(toKey)}`;

        logger.debug({ 'Copy Object Request': { url, method, headers: { 'x-cos-copy-source': source } } });

        try {
            const response = await requestUrl({
                url,
                method,
                headers: {
                    'Authorization': authorization,
                    'Date': new Date().toUTCString(),
                    'x-cos-copy-source': encodeURIComponent(source)
                },
                throw: false,
            });
            logger.debug({ 'Copy Object Response': response });
            if (response.status >= 200 && response.status < 300) {
                return;
            } else {
                throw new Error(`Failed to copy object: ${response.status} ${response.text}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async putObject(key: string, content: Buffer | Uint8Array, localMtime: string): Promise<void> {
        logger.debug(`Uploading file to key: ${key} with mtime: ${localMtime}`);
        // const md5 = this.calculateMD5Hash(content);
        const path = `/${key}`;

        const authorization = await this.generateSignature({
            secretId: this.config.secretId,
            secretKey: this.config.secretKey,
            method: 'PUT',
            pathname: path,
            headers: {
                'x-cos-meta-mtime': localMtime
            }
        });

        const url = `${this.getEndpoint()}/${encodeURIComponent(key)}`;

        try {
            const response = await requestUrl({
                url,
                method: 'PUT',
                headers: {
                    'Authorization': authorization,
                    'Date': new Date().toUTCString(),
                    'x-cos-meta-mtime': localMtime,
                },
                body: new Uint8Array(content).buffer,
                throw: false,
            });

            logger.debug('Upload file response:', response);
            if (response.status >= 200 && response.status < 300) {
                return;
            } else {
                throw new Error(`Failed to upload file: ${response.status} ${response.text}`);
            }
        } catch (error) {
            throw error;
        }
    }

    async getObject(key: string): Promise<Buffer | null> {
        logger.debug(`Getting object with key: ${key}`);
        const path = `/${key}`;
        const authorization = await this.generateSignature({
            secretId: this.config.secretId,
            secretKey: this.config.secretKey,
            method: 'GET',
            pathname: path
        });

        const url = `${this.getEndpoint()}/${encodeURIComponent(key)}`;

        try {
            const response = await requestUrl({
                url,
                method: 'GET',
                headers: {
                    'Authorization': authorization,
                    'Date': new Date().toUTCString()
                }
            });

            if (response.status === 200) {
                return Buffer.from(response.arrayBuffer);
            } else {
                throw new Error(`Failed to get object: ${response.status} ${response.text}`);
            }
        } catch (error) {
            throw error;
        }
    }
}

export const a = 1;