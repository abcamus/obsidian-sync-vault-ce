import { join, dirname, relative, basename } from '../../src/util/path';

describe('path utility functions', () => {
    describe('join', () => {
        it('should join multiple paths with a separator', () => {
            expect(join('a', 'b', 'c')).toBe('a/b/c');
            expect(join('a', '', 'c')).toBe('a/c');
            expect(join('a', 'b', '')).toBe('a/b');
        });
    });

    describe('dirname', () => {
        it('should return the directory name of a path', () => {
            expect(dirname('/a/b/c')).toBe('/a/b');
            expect(dirname('/a/b/')).toBe('/a/b');
            expect(dirname('/a')).toBe('');
            expect(dirname('a/b/c')).toBe('a/b');
        });
    });

    describe('relative', () => {
        it('should return the relative path from one path to another', () => {
            expect(relative('/a/b/c', '/a/b/d')).toBe('../d');
            expect(relative('/a/b/c', '/a/b/c/d/e')).toBe('d/e');
            expect(relative('/a/b/c', '/a/b')).toBe('../');
            expect(relative('/a/b/c', '/a/b/c')).toBe('.');
        });
    });

    describe('basename', () => {
        it('should return the base name of a path', () => {
            expect(basename('/a/b/c.txt')).toBe('c.txt');
            expect(basename('/a/b/c.txt', '.txt')).toBe('c');
            expect(basename('/a/b/c')).toBe('c');
            expect(basename('c.txt', '.txt')).toBe('c');
        });
    });
});