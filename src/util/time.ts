export function msToSec(time: number): number {
    return Math.floor(time / 1000);
}

export function secToMs(time: number): number {
    return time * 1000;
}

export function isInTimeRange(time: number, range: [number, number]): boolean {
    return time >= range[0] && time <= range[1];
}