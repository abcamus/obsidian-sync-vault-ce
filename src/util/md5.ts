export const EMPTY_FILE_MD5 = "d41d8cd98f00b204e9800998ecf8427e";

import SparkMD5 from 'spark-md5';

export function calculateMD5(data: ArrayBuffer): string {
    const spark = new SparkMD5.ArrayBuffer();
    spark.append(data);
    return spark.end();
}