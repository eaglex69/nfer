import { mkdir, rm, cp, stat, readdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ZipArchive } from "archiver";
import "./build-php.mjs";
const root=process.cwd();const downloads=path.join(root,"downloads");
await mkdir(downloads,{recursive:true});
const nextFiles=["src","public","scripts","package.json","package-lock.json","tsconfig.json","next.config.ts","postcss.config.mjs","drizzle.config.json","eslint.config.mjs",".env.example","README-NEXT.md"];
const nextSource=path.join(root,"php/next-source");
await rm(nextSource,{recursive:true,force:true});await mkdir(nextSource,{recursive:true});
for(const file of nextFiles)await cp(path.join(root,file),path.join(nextSource,file),{recursive:true});
async function zip(name,entries){
 const target=path.join(downloads,name);await rm(target,{force:true});
 const output=createWriteStream(target);const archive=new ZipArchive({zlib:{level:6}});
 const done=new Promise((resolve,reject)=>{output.on("close",resolve);output.on("error",reject);archive.on("error",reject);});archive.pipe(output);
 async function add(full,relative){const info=await stat(full);if(info.isDirectory()){for(const child of await readdir(full)){if(["node_modules",".next",".git","downloads","config.local.php",".env",".checks"].includes(child))continue;await add(path.join(full,child),relative?`${relative}/${child}`:child);}}else archive.file(full,{name:relative});}
 for(const entry of entries)await add(path.join(root,entry),entry);
 await archive.finalize();await done;return target;
}
await zip("valley-next.zip",nextFiles);
await zip("valley-php.zip",["php"]);
const manifest={builtAt:new Date().toISOString(),archives:{}};
for(const type of ["next","php"]){const file=path.join(downloads,`valley-${type}.zip`);manifest.archives[type]={bytes:(await stat(file)).size,sha256:createHash("sha256").update(await readFile(file)).digest("hex")};}
await writeFile(path.join(downloads,"manifest.json"),JSON.stringify(manifest,null,2));
console.log("Full archives created:",manifest.archives);
