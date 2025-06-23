import { App, Modal, Setting, Notice } from "obsidian";
import { cloudDiskModel } from "src/model/cloud-disk-model";

export interface WebDAVLoginResult {
    username: string;
    password: string;
    url: string;
}

export class WebDAVLoginModal extends Modal {
    result: WebDAVLoginResult | null = null;
    onSubmit: (result: WebDAVLoginResult) => void;

    constructor(app: App, onSubmit: (result: WebDAVLoginResult) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "WebDAV 登录" });

        let url = "";
        let username = "";
        let password = "";

        new Setting(contentEl)
            .setName("WebDAV 服务器地址")
            .addText((text) =>
                text
                    .setValue(cloudDiskModel.webdavUrl)
                    .setPlaceholder("https://example.com/webdav/")
                    .onChange((value) => (url = value))
            );

        new Setting(contentEl)
            .setName("用户名")
            .addText((text) =>
                text
                    .setPlaceholder("用户名")
                    .setValue(cloudDiskModel.webdavUsername)
                    .onChange((value) => (username = value))
            );

        new Setting(contentEl)
            .setName("密码")
            .addText((text) => {
                text
                    .setPlaceholder("密码")
                    .setValue(cloudDiskModel.webdavPassword)
                    .onChange((value) => (password = value));
                if (text.inputEl) {
                    text.inputEl.setAttribute("type", "password");
                }
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("登录")
                    .setCta()
                    .onClick(() => {
                        if (!url || !username || !password) {
                            new Notice("请填写所有字段");
                            return;
                        }
                        this.result = { url, username, password };
                        this.onSubmit(this.result);
                        this.close();
                    })
            );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}