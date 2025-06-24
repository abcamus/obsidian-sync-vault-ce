import '../mock/global-mock';
import { WebDAVClient } from '../../src/service/vendor/webdav';

// 假设WebDAVClient已导出或可访问
// 你可能需要调整导入方式
// import { WebDAVClient } from './index';

describe.skip('WebDAVClient.parseWebDAVResponse', () => {
    const client = WebDAVClient.getInstance();

    it('能正确解析包含文件和文件夹的WebDAV响应', () => {
        const xml = `
        <d:multistatus xmlns:d="DAV:">
            <d:response>
                <d:href>/dav/</d:href>
                <d:propstat>
                    <d:prop>
                        <d:displayname>dav</d:displayname>
                        <d:resourcetype><d:collection/></d:resourcetype>
                        <d:getlastmodified>Mon, 24 Jun 2024 10:00:00 GMT</d:getlastmodified>
                    </d:prop>
                </d:propstat>
            </d:response>
            <d:response>
                <d:href>/dav/test.txt</d:href>
                <d:propstat>
                    <d:prop>
                        <d:displayname>test.txt</d:displayname>
                        <d:resourcetype/>
                        <d:getcontentlength>123</d:getcontentlength>
                        <d:getlastmodified>Mon, 24 Jun 2024 11:00:00 GMT</d:getlastmodified>
                    </d:prop>
                </d:propstat>
            </d:response>
            <d:response>
                <d:href>/dav/folder/</d:href>
                <d:propstat>
                    <d:prop>
                        <d:displayname>folder</d:displayname>
                        <d:resourcetype><d:collection/></d:resourcetype>
                        <d:getlastmodified>Mon, 24 Jun 2024 12:00:00 GMT</d:getlastmodified>
                    </d:prop>
                </d:propstat>
            </d:response>
        </d:multistatus>
        `;

        const result = client['parseWebDAVResponse'](xml);

        expect(result.length).toBe(3);

        // 根目录
        expect(result[0]).toMatchObject({
            path: '/',
            type: 'directory',
            size: 0,
            extension: undefined,
        });

        // 文件
        expect(result[1]).toMatchObject({
            path: '/test.txt',
            type: 'file',
            size: 123,
            extension: 'txt',
        });

        // 文件夹
        expect(result[2]).toMatchObject({
            path: '/folder/',
            type: 'directory',
            size: 0,
            extension: undefined,
        });
    });

    it('遇到非法XML应抛出异常', () => {
        const badXml = `<d:multistatus><d:response></d:multistatus>`;
        expect(() => client['parseWebDAVResponse'](badXml)).toThrow(/Failed to parse XML/);
    });
});