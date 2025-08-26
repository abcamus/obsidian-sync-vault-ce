import { cloudDiskModel } from "../model/cloud-disk-model";
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { createLogger } from "./logger";

const logger = createLogger('encryption');

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

/* magic words，16 bytes in total:
 * [0-3]   magic bytes: "OSVC" (Obsidian Sync Vault Crypted)
 * [4]     version: 0x01
 * [5]     indicator: 
 *         - bit 0-3: reserved
 *         - bit 4: compression flag(0: not compressed)
 *         - bit 5-7: algorithm(0: AES-GCM)
 * [6-9]   text content lentgh(uint32, big endian)
 * [10-13] hash of encrypted data(SHA256 first 4 bytes)
 * [14-15] CRC16(previous 14 bytes)
 */
export const MAGIC_BYTES = new Uint8Array([
    0x4F, 0x53, 0x56, 0x43, // "OSVC"
    0x01, // 版本号
    0x00, // 标志位
    0x00, 0x00, 0x00, 0x00, // 原文长度占位
    0x00, 0x00, 0x00, 0x00, // 哈希占位
    0x00, 0x00  // CRC占位
]);

interface MagicInfo {
    version: number;
    isCompressed: boolean;
    algorithm: number;
    plainTextLength: number;
    contentHash: Uint8Array;
}

interface EncryptedData {
    iv: string;
    content: string;
}

export function crc16(data: Uint8Array): number {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i] << 8;
        for (let j = 0; j < 8; j++) {
            crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        }
    }
    return crc & 0xFFFF;
}

export function generateMagicBytes(plainTextLength: number, encryptedData: Uint8Array, isCompressed = false): Uint8Array {
    const magic = new Uint8Array(16);
    magic.set(MAGIC_BYTES.slice(0, 6));

    if (isCompressed) {
        magic[5] |= 0x10;
    }

    const view = new DataView(magic.buffer);
    view.setUint32(6, plainTextLength, false);  // 大端序

    const hash = sha256(encryptedData);
    magic.set(hash.slice(0, 4), 10);

    const crc = crc16(magic.slice(0, 14));
    view.setUint16(14, crc, false);

    return magic;
}

function verifyMagicBytes(magic: Uint8Array): boolean {
    if (magic.length !== 16) {
        logger.debug(`magic too short, length: ${magic.length}`);
        return false;
    }

    if (!magic.slice(0, 4).every((b, i) => b === MAGIC_BYTES[i])) {
        logger.debug('magic not match');
        return false;
    }

    return true;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

export function generateSalt(): Uint8Array {
    /* random salt */
    const array = new Uint8Array(16);
    return crypto.getRandomValues(array);
}

export async function encrypt(data: Uint8Array): Promise<Uint8Array> {
    const password = cloudDiskModel.password;
    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const encryptedContent = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv
        },
        key,
        new Uint8Array(data)
    );

    const encryptedArray = new Uint8Array(encryptedContent);

    const resultArray = new Uint8Array(MAGIC_BYTES.length + salt.length + iv.length + encryptedArray.length);
    resultArray.set(salt, MAGIC_BYTES.length);
    resultArray.set(iv, MAGIC_BYTES.length + salt.length);
    resultArray.set(encryptedArray, MAGIC_BYTES.length + salt.length + iv.length);

    const magic = generateMagicBytes(data.length, resultArray.slice(MAGIC_BYTES.length));
    resultArray.set(magic);

    return resultArray;
}

function parseMagicBytes(magic: Uint8Array): MagicInfo | null {
    if (!verifyMagicBytes(magic)) {
        return null;
    }

    const view = new DataView(magic.buffer);
    return {
        version: magic[4],
        isCompressed: (magic[5] & 0x10) !== 0,
        algorithm: magic[5] >> 5,
        plainTextLength: view.getUint32(6, false),
        contentHash: magic.slice(10, 14)
    };
}

export async function decrypt(encryptedData: Uint8Array, userPassword?: string, userSalt?: Uint8Array): Promise<Uint8Array> {
    const password = userPassword ?? cloudDiskModel.password;
    const magicInfo = parseMagicBytes(encryptedData.slice(0, MAGIC_BYTES.length));
    if (!magicInfo) {
        throw new Error('Invalid encrypted data format');
    }

    const encryptedArray = encryptedData.slice(MAGIC_BYTES.length);
    const salt = encryptedArray.slice(0, 16);

    const iv = encryptedArray.slice(salt.length, salt.length + IV_LENGTH);
    const data = encryptedArray.slice(salt.length + IV_LENGTH);

    const hash = sha256(encryptedArray);
    if (!hash.slice(0, 4).every((byte: number, i: number) => byte === magicInfo.contentHash[i])) {
        throw new Error('Content hash mismatch');
    }

    const key = await deriveKey(password, salt);

    const decryptedContent = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            iv: iv
        },
        key,
        data
    );

    const result = new Uint8Array(decryptedContent);
    if (result.length !== magicInfo.plainTextLength) {
        throw new Error('decrypted content length mismatch');
    }

    return result;
}

export function getEncryptedFileInfo(content: Uint8Array): MagicInfo | null {
    if (content.length < MAGIC_BYTES.length) {
        return null;
    }
    return parseMagicBytes(content.slice(0, MAGIC_BYTES.length));
}

export function isEncrypted(content: Uint8Array): boolean {
    const minEncryptedLength = 16 + IV_LENGTH + 1 + MAGIC_BYTES.length;
    if (content.length < minEncryptedLength) {
        logger.debug(`content too short, length: ${content.length}, minimum: ${minEncryptedLength}`);
        return false;
    }

    const magic = content.slice(0, MAGIC_BYTES.length);
    return verifyMagicBytes(magic);
}

function generateRandomString(minLength: number, maxLength: number): string {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function base64UrlEncode(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function generateCodeChallenge(code_challenge_method: 'plain' | 'S256' = 'S256'): Promise<{ codeVerifier: string, codeChallenge: string }> {
    const codeVerifier = generateRandomString(43, 128);
    let codeChallenge: string;

    if (code_challenge_method === 'plain') {
        codeChallenge = codeVerifier;
    } else if (code_challenge_method === 'S256') {
        const hash = sha256(codeVerifier);
        codeChallenge = base64UrlEncode(hash);
    } else {
        throw new Error('Unsupported code_challenge_method');
    }

    return { codeVerifier, codeChallenge };
}

