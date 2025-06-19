// app.js
document.addEventListener('DOMContentLoaded', function () {
    const fileItems = document.getElementById('file-items');
    const breadcrumb = document.getElementById('breadcrumb');

    // 示例文件数据
    const files = {
        '/': [
            { name: 'file1.txt', type: 'file', size: '1.2KB', lastModified: '2023-09-01', synced: true },
            { name: 'file2.jpg', type: 'file', size: '2.5MB', lastModified: '2023-09-02', synced: false },
            {
                name: 'folder1', type: 'directory', children: [
                    { name: 'file3.txt', type: 'file', size: '3.2KB', lastModified: '2023-09-03', synced: true },
                    { name: 'file4.jpg', type: 'file', size: '4.5MB', lastModified: '2023-09-04', synced: false }
                ]
            }
        ],
        '/folder1': [
            { name: 'file3.txt', type: 'file', size: '3.2KB', lastModified: '2023-09-03', synced: true },
            { name: 'file4.jpg', type: 'file', size: '4.5MB', lastModified: '2023-09-04', synced: false }
        ]
    };

    let currentPath = '/';

    // 动态构建文件列表
    function renderFiles(path) {
        const items = files[path] || [];
        fileItems.innerHTML = ''; // 清空现有的文件列表

        items.forEach(item => {
            const row = document.createElement('tr');
            const columns = Object.keys(item).map(key => {
                if (key === 'type') return null; // 不显示类型列
                const cell = document.createElement('td');
                if (key === 'name' && item.type === 'directory') {
                    cell.textContent = item.name;
                    cell.classList.add('directory');
                    cell.addEventListener('click', () => navigate(`${path}/${item.name}`));
                } else {
                    cell.textContent = item[key];
                }
                return cell;
            }).filter(Boolean); // 过滤掉 null 或 undefined 的单元格

            // 将每个单元格添加到行中
            columns.forEach(cell => {
                row.appendChild(cell);
            });

            // 将行添加到文件列表中
            fileItems.appendChild(row);
        });
    }

    // 导航到新目录
    function navigate(path) {
        updateBreadcrumb(path);
        renderFiles(path);
        currentPath = path;
    }

    // 更新面包屑导航
    function updateBreadcrumb(path) {
        breadcrumb.innerHTML = '';
        const pathParts = path.split('/').filter(part => part.length > 0);
        let currentCrumbPath = '/';
        pathParts.forEach(part => {
            const crumb = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = part;
            link.dataset.path = currentCrumbPath + part;
            link.addEventListener('click', (event) => {
                event.preventDefault();
                navigate(link.dataset.path);
            });
            crumb.appendChild(link);
            breadcrumb.appendChild(crumb);
            currentCrumbPath += part + '/';
        });
    }

    // 初始化
    renderFiles(currentPath);
    updateBreadcrumb(currentPath);

    // 处理面包屑点击事件
    document.addEventListener('click', function (event) {
        const link = event.target.closest('a[data-path]');
        if (link) {
            event.preventDefault();
            navigate(link.dataset.path);
        }
    });
});