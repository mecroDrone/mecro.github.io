// Asset compression only: preserve the source images and their original content.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_PATH || 'sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'images'),{recursive:true});
await sharp(path.join(root,'images/image_b9e999.jpg')).resize({width:1400,withoutEnlargement:true}).webp({quality:85}).toFile(path.join(root,'images/laboratorio.webp'));
await sharp(path.join(root,'images/logo-mecro-blanco.png')).resize({height:100,withoutEnlargement:true}).png().toFile(path.join(root,'images/brand-mark.png'));
await sharp(path.join(root,'images/logo-mecro-blanco.png')).resize(48,48,{fit:'contain',background:'#ffffff'}).png().toFile(path.join(root,'images/favicon.png'));
console.log('Optimized delivery copies; originals preserved.');
