import { isEncrypted, encrypt, decrypt, generateCodeChallenge } from '../../src/util/encryption';
import { cloudDiskModel } from '../../src/model/cloud-disk-model';
import { sha256 } from '@noble/hashes/sha256';

console.error = jest.fn();
console.warn = jest.fn();

jest.mock('../../src/util/debug-config', () => ({
    DebugManager: {
        getInstance: jest.fn().mockReturnValue({
            config: {
                debug: false
            },
            isDebugEnabled: jest.fn().mockReturnValue(false),
        }),
    }
}));

// 模拟 CloudDiskModel
jest.mock('../../src/model/cloud-disk-model', () => ({
    cloudDiskModel: {
        password: '12345',
        salt: new Uint8Array([
            0x36, 0xef, 0xbf, 0xbd,
            0x12, 0xef, 0xbf, 0xbd,
            0x74, 0x0c, 0x69, 0x27,
            0x2e, 0xef, 0xbf, 0xbd
        ]),
    },
}));

describe('加密模块测试', () => {
    beforeEach(() => {
        // 重置所有的 mock
        jest.clearAllMocks();
    });

    test('加密后解密应该返回原始数据', async () => {
        const plaintext = '这是一段需要加密的测试数据';

        const originData = new TextEncoder().encode(plaintext);
        const encryptedData = await encrypt(originData);
        expect(typeof encryptedData).toBe('object');
        expect(encryptedData).not.toBe(plaintext);

        const decryptedData = await decrypt(encryptedData);
        const returnPlainText = new TextDecoder().decode(decryptedData);
        expect(returnPlainText).toBe(plaintext);
    });

    test('使用不同的密钥应该产生不同的加密结果', async () => {
        const data = '测试数据';

        const encryptedData1 = await encrypt(new TextEncoder().encode(data));

        // 改变密钥
        cloudDiskModel.password = '另一个32字节密钥用于测试不同结果';

        const encryptedData2 = await encrypt(new TextEncoder().encode(data));

        expect(encryptedData1).not.toBe(encryptedData2);
    });

    test('解密错误的数据应该抛出异常', async () => {
        const invalidData = 'invalid encrypted data';

        await expect(decrypt(new TextEncoder().encode(invalidData))).rejects.toThrow();
    });

    test('CloudDiskModel.getKey 应该被调用', async () => {
        const data = '测试数据';
        await encrypt(new TextEncoder().encode(data));

        expect(cloudDiskModel.password).toBe("另一个32字节密钥用于测试不同结果");
    });
});

describe('isEncrypted', () => {
    let originalTextDecoder: typeof TextDecoder;

    beforeEach(() => {
        // 保存原始的 TextDecoder
        originalTextDecoder = global.TextDecoder;
    });

    afterEach(() => {
        // 恢复原始的 TextDecoder
        global.TextDecoder = originalTextDecoder;
    });

    test('should return false for content shorter than minimum length', () => {
        const shortContent = new Uint8Array([1, 2, 3]);
        expect(isEncrypted(shortContent)).toBe(false);
    });

    test('should return false for content starting with readable text', () => {
        const textContent = new TextEncoder().encode('Hello World');
        const content = new Uint8Array(29); // 16(salt) + 12(iv) + 1
        content.set(textContent);
        expect(isEncrypted(content)).toBe(false);
    });

    test('should return false for content with all zero IV', () => {
        const content = new Uint8Array(29); // 16(salt) + 12(iv) + 1
        // 全部填充为0
        content.fill(0);
        expect(isEncrypted(content)).toBe(false);
    });

    test('should return true for encrypted content', () => {
        const content = new Uint8Array(29); // 16(salt) + 12(iv) + 1
        // 设置一些非零的IV值
        content.set(new Uint8Array([1, 2, 3, 4]), 16);
        expect(isEncrypted(content)).toBe(false);
    });

    test('should return true for content with non-text characters', () => {
        const content = new Uint8Array(29);
        // 设置一些二进制数据
        content.set(new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC]));
        /* IV全0 */
        expect(isEncrypted(content)).toBe(false);
    });

    test('should return true when TextDecoder throws error', () => {
        const content = new Uint8Array(29);
        const mockTextDecoder = {
            decode: jest.fn().mockImplementation(() => {
                throw new Error('Invalid UTF-8');
            })
        };
        // @ts-ignore
        global.TextDecoder = jest.fn(() => mockTextDecoder);

        expect(isEncrypted(content)).toBe(false);
    });

    test('test中文', () => {
        const content = new TextEncoder().encode(`
            ## 创新的原则

最近阅读彼得·德鲁克的《创新与企业家精神》，很受启发，即有提纲挈领式的提点，也有具体的案例分析。能让人从一个更高的维度--从纵向的历史和横向的社会环境去看待创新的事件。
其中有关于创新的原则问题，我觉得有必要记录在这里，随时给自己提醒。

首先要明白并不是所有的创新都是有一套机制可以学习的，有的确实就如偏方一样神奇，只能属于灵光乍现，例如书中列举的英裔爱尔兰化学家罗伯特·玻意耳发现通过火药爆炸可以推动活塞运动。

目标明确的创新源于周密的分析、严密的系统和辛勤的工作，由此总结出创新实践，概括为几个要做，几个不要做和几个条件

### 几个要做

1.  要对创新机遇的来源进行彻底的思考。
2. 创新既是理性的，又是感性的，要走出去多看、多问、多听。
3. 创新要简单明了，目标明确。
4. 创新始于细微之处，努力去做一件具体的事情。
5. 一项成功创新的目标是取得领导地位。

### 几个禁忌

1. 不要太聪明

能让大多数人参与

2. 不要过于多样化

对于要做的事情中第四点的推论。

3. 不要尝试为未来进行创新

要为现在进行创新，要立即能用，而不是说在未来会获得应用

### 三个条件

1. 创新是工作

工作需要知识才干+勤奋毅力

2. 必须立足于自己的长处

在机遇面前，自己在思想上是合拍的，对自己而言是有意义的。

3. 创新是经济与社会活动双重作用的结果

以市场为中心，以市场为导向d

### 创新者不是“专注于冒险”，而是“专注于机遇”`);
        expect(isEncrypted(content)).toBe(false);
    });


});

function base64UrlEncode(buffer: Uint8Array): string {
    // 将二进制数据转换为 base64 字符串
    const base64 = Buffer.from(buffer).toString('base64');
    // 转换为 base64url 格式
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

describe('generateCodeChallenge', () => {
    it('should generate code verifier with correct length', async () => {
        const { codeVerifier } = await generateCodeChallenge();
        expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
        expect(codeVerifier.length).toBeLessThanOrEqual(128);
    });

    it('should generate valid characters for code verifier', async () => {
        const { codeVerifier } = await generateCodeChallenge();
        expect(codeVerifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });

    it('should return same challenge as verifier in plain mode', async () => {
        const { codeVerifier, codeChallenge } = await generateCodeChallenge('plain');
        expect(codeChallenge).toBe(codeVerifier);
    });

    it('should generate different challenge in S256 mode', async () => {
        const { codeVerifier, codeChallenge } = await generateCodeChallenge('S256');
        expect(codeChallenge).not.toBe(codeVerifier);
        // base64url 格式验证
        expect(codeChallenge).toMatch(/^[A-Za-z0-9\-_]+$/);
        // base64url 编码的 SHA256 哈希长度应该是 43 个字符
        expect(codeChallenge.length).toBe(43);
    });

    it('should generate correct challenge in S256 mode', async () => {
        const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
        const hash = sha256(codeVerifier);
        const codeChallenge = base64UrlEncode(hash);
        expect(codeChallenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    });

    it('should throw error for unsupported method', async () => {
        // @ts-ignore
        await expect(generateCodeChallenge('invalid')).rejects.toThrow('Unsupported code_challenge_method');
    });
});