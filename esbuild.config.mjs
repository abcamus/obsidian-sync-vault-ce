import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import fs from "fs";

/* 版权声明，转成js多行注释 */
const banner = `/*
${fs.readFileSync("./LICENSE", "utf8")}
*/`;

const prod = (process.argv[2] === "production");

const context = await esbuild.context({
	minify: prod,
	minifyIdentifiers: prod,
	minifySyntax: prod,
	minifyWhitespace: prod,
	treeShaking: prod,
	banner: {
		js: banner,
	},
	legalComments: 'inline',
	entryPoints: ["main.ts"],
	bundle: true,
	external: [
		"obsidian",
		/* TODO: 调通加密模块动态加载从主文件中移除 */
		// "./src/service/vendor/baidu/upload",
		// "./src/service/vendor/baidu/download",
		// "./src/service/vendor/aliyun/upload",
		// "./src/service/vendor/aliyun/download",
		// "./src/service/auth",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}