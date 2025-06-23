export function join(...paths: string[]): string {
    return paths
        .filter(Boolean) // 移除空路径段
        .map(segment => segment.replace(/^\/+|\/+$/g, '')) // 去除每段开头结尾的斜杠
        .filter(segment => segment !== '') // 再次过滤空字符串
        .join('/'); // 用单斜杠连接
}

export function dirname(path: string): string {
    // 查找最后一个路径分隔符的位置
    const lastSeparatorIndex = path.lastIndexOf('/');
    // 如果没有找到分隔符，返回空字符串
    if (lastSeparatorIndex === -1) return '';
    // 返回分隔符之前的部分
    return path.slice(0, lastSeparatorIndex);
}

export function relative(from: string, to: string): string {
    // 将路径转换为数组
    const fromParts = from.split('/');
    const toParts = to.split('/');

    // 移除相同的前缀部分
    while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
        fromParts.shift();
        toParts.shift();
    }

    // 计算相对路径
    const relativePath = '../'.repeat(fromParts.length) + toParts.join('/');
    return relativePath || '.';
}

export function basename(path: string, ext?: string): string {
    // 查找最后一个路径分隔符的位置
    const lastSeparatorIndex = path.lastIndexOf('/');
    // 获取文件名部分
    let base = lastSeparatorIndex === -1 ? path : path.slice(lastSeparatorIndex + 1);

    // 如果提供了扩展名，去除扩展名
    if (ext && base.endsWith(ext)) {
        base = base.slice(0, -ext.length);
    }

    return base;
}

