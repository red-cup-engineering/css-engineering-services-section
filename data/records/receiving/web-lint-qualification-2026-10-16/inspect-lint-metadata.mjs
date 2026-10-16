import {writeFileSync} from 'node:fs';
import {readRegistryPackageVersion} from '/gnu/store/082w7cllxg9pi4jydyy4npr2k21dmrjm-registry-runtime/node_modules/.pnpm/@red-cup-engineering+npm-workspace-publication-service@0.14.3/node_modules/@red-cup-engineering/npm-workspace-publication-service/src/registry.mjs';
const wanted=[['@eslint/js','10.0.1'],['eslint','10.4.1'],['typescript-eslint','8.61.0']];
const registry='https://registry.npmjs.org/';
const entries=[];
for(const [name,version] of wanted){
 const r=await readRegistryPackageVersion(registry,name,version);
 const m=r.manifest;
 entries.push({requested:{name,version},found:r.found,reachable:r.reachable,name:m?.name,version:m?.version,engines:m?.engines,peerDependencies:m?.peerDependencies,peerDependenciesMeta:m?.peerDependenciesMeta,dependencies:m?.dependencies,dist:{integrity:m?.dist?.integrity,shasum:m?.dist?.shasum,tarball:m?.dist?.tarball}});
 if(!r.found||m?.name!==name||m?.version!==version||!m?.dist?.integrity?.startsWith('sha512-'))throw new Error('Unqualified registry metadata identity: '+name);
}
const receipt={observedAt:new Date().toISOString(),registry,owner:'npm-workspace-publication-service@0.14.3',selection:'Exact existing declared lower bounds; typescript-eslint 8.61.0 is already exact in HTTP. No latest selection.',entries};
writeFileSync(new URL('./lint-metadata.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
