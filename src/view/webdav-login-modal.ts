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
        contentEl.createEl("h2", { text: "Login" });

        let url = cloudDiskModel.webdavUrl;
        let username = cloudDiskModel.webdavUsername;
        let password = cloudDiskModel.webdavPassword;

        new Setting(contentEl)
            .setName("Server address")
            .addText((text) =>
                text
                    .setValue(url)
                    .setPlaceholder("https://example.com/webdav/")
                    .onChange((value) => (url = value))
            );

        new Setting(contentEl)
            .setName("Username")
            .addText((text) =>
                text
                    .setPlaceholder("Username")
                    .setValue(username)
                    .onChange((value) => (username = value))
            );

        new Setting(contentEl)
            .setName("Password")
            .addText((text) => {
                text
                    .setPlaceholder("Password")
                    .setValue(password)
                    .onChange((value) => (password = value));
                if (text.inputEl) {
                    text.inputEl.setAttribute("type", "password");
                }
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Login")
                    .setCta()
                    .onClick(() => {
                        if (!url || !username || !password) {
                            new Notice("Please fill in all fields");
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