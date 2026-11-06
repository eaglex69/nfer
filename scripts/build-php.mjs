import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const root = process.cwd();
const out = path.join(root, "php");
await mkdir(path.join(out, "assets"), { recursive: true });
await mkdir(path.join(out, "data"), { recursive: true });
await build({ entryPoints:[path.join(root,"src/php-client.tsx")],outfile:path.join(out,"assets/app.js"),bundle:true,minify:true,sourcemap:false,format:"iife",platform:"browser",target:["es2020"],tsconfig:path.join(root,"tsconfig.json"),define:{"process.env.NODE_ENV":'"production"'},legalComments:"none" });
for (const [source,target] of [["src/app/globals.css","game.css"],["src/app/map-redesign.css","map-redesign.css"],["src/app/refinements.css","refinements.css"],["src/app/admin/admin.css","admin.css"]]) {
 const css=await readFile(path.join(root,source),"utf8");
 const result=await postcss(source.endsWith("admin.css")?[]:[tailwind()]).process(css,{from:path.join(root,source)});
 await writeFile(path.join(out,"assets",target),result.css);
}
const configEntry=path.join(out,"data/config-entry.mjs");
await writeFile(configEntry,`
export { ITEMS,CROPS,POND_SPECIES,CAGE_SPECIES,ANIMALS,RECIPES,MINES,JOBS,SHOP_KEYS,UPGRADES,GLOBALS,PROMOTIONS,NEWS,BLESSINGS,WHEEL,PVZ,FISHING_COOLDOWN_MS } from ${JSON.stringify(path.join(root,"src/lib/game-config.ts"))};
export { AVATARS,DEFAULT_AVATARS } from ${JSON.stringify(path.join(root,"src/lib/avatars.ts"))};
export { COVERS,DEFAULT_COVERS,COVER_UPLOAD_GEMS } from ${JSON.stringify(path.join(root,"src/lib/covers.ts"))};
export { WORKER_TYPES,WORKER_HOURS } from ${JSON.stringify(path.join(root,"src/lib/workers-config.ts"))};
export { ACHIEVEMENTS,initialGameState } from ${JSON.stringify(path.join(root,"src/lib/game-engine.ts"))};
export { SEASON_LEVELS,POINTS_PER_LEVEL,PREMIUM_COST,WEEKLY_FARMER_REWARDS,WEEKLY_COOP_REWARDS,seasonReward } from ${JSON.stringify(path.join(root,"src/lib/season.ts"))};
export { DEFAULT_DESIGN,DESIGN_SLOT_DEFS,DESIGN_SLOTS,FONT_SCOPES,FONT_STACKS,FONT_MODULE_LABELS } from ${JSON.stringify(path.join(root,"src/lib/design-config.ts"))};
`);
const configBundle=path.join(out,"data/config.cjs");
await build({entryPoints:[configEntry],outfile:configBundle,bundle:true,platform:"node",format:"cjs",target:"node20",tsconfig:path.join(root,"tsconfig.json")});
const config=require(configBundle);const json={};
for(const [key,value] of Object.entries(config))if(!key.startsWith("__")&&typeof value!=="function")json[key]=value;
json.INITIAL_STATE=config.initialGameState(0);
json.SEASON_REWARDS={free:Array.from({length:config.SEASON_LEVELS},(_,i)=>config.seasonReward("free",i+1)),premium:Array.from({length:config.SEASON_LEVELS},(_,i)=>config.seasonReward("premium",i+1))};
await writeFile(path.join(out,"data/config.json"),JSON.stringify(json,null,2));
await rm(configEntry,{force:true});await rm(configBundle,{force:true});
await rm(path.join(out,"images"),{recursive:true,force:true});
await cp(path.join(root,"public/images"),path.join(out,"images"),{recursive:true});
console.log("PHP client, all CSS, graphics and shared game configuration built");
