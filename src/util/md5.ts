export const EMPTY_FILE_MD5 = "d41d8cd98f00b204e9800998ecf8427e";

import SparkMD5 from 'spark-md5';

export function calculateMD5(data: ArrayBuffer | string): string {
    if (typeof data === 'string') {
        return SparkMD5.hash(data);
    }
    const spark = new SparkMD5.ArrayBuffer();
    spark.append(data);
    return spark.end();
}

export function calculateMD5Base64(data: string): string {
    const hash = SparkMD5.hash(data, true); // true for raw binary string
    return btoa(hash);
}