// 模拟的 obsidian 模块
class Notice {
    constructor(message) {
        this.message = message;
    }
    show() {
        console.log(`Notice: ${this.message}`);
    }
}

class TFile {
    constructor(name) {
        this.name = name;
    }
}

class TFolder {
    constructor(name) {
        this.name = name;
    }
}

class Vault {
    constructor() {
        // 模拟 Vault 的方法和属性
    }
}

module.exports = {
    Notice,
    TFile,
    TFolder,
    Vault,
};