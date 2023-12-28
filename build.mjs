import esbuild from "esbuild";

const shouldWatch = process.env.DEV == "true";
const bundle = shouldWatch ? esbuild.context : esbuild.build;

const commonOptions = {
  external: ["@aws-sdk/client-dynamodb", "@aws-sdk/util-dynamodb"],
  target: "es6",
  bundle: true,
  minify: !process.env.DEV,
  sourcemap: shouldWatch,
  dropLabels: shouldWatch ? undefined : ["DEV"],
  outdir: "dist",
  entryPoints: ["src/index.ts"],
  plugins: [
    {
      name: "watcher",
      setup(build) {
        const { format } = build.initialOptions;
        build.onEnd(() => {
          console.log(`Build ${format}`, new Date().toLocaleString());
        });
      },
    },
  ],
};

const cjs = {
  ...commonOptions,
  platform: "node",
  format: "cjs",
};

const esm = {
  ...commonOptions,
  platform: "node",
  format: "esm",
  outExtension: { ".js": ".mjs" },
};

const cjsContext = await bundle(cjs);
const esmContext = await bundle(esm);

if (shouldWatch) {
  await cjsContext.watch();
  await esmContext.watch();
}
