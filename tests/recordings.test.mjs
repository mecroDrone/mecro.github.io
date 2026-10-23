import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingsFor} from '../server/recordings.mjs';
const aliases={uav:['uav','DRONES_101'],esp32:['ES32_AUTOMATION']};
const rows=[
 {CursoID:'DRONES_101',SemanaCode:'S1',Titulo:'Original',Video_G1:'https://drive.google.com/file/d/one/preview',Video_G10:'https://drive.google.com/file/d/ten/preview'},
 {CursoID:'DRONES_101',SemanaCode:'S2',Titulo:'Pendiente'},
 {CursoID:'ES32_AUTOMATION',SemanaCode:'S1',Titulo:'ESP32-S3',Video_G1:'https://drive.google.com/file/d/esp/preview'}
];
test('recordings retain historic titles and pending sessions and isolate courses/groups',()=>{
 const user={cursosInscritos:['DRONES_101'],grupo:'G1'};
 const result=recordingsFor(user,'uav',aliases,rows);
 assert.equal(result.length,2);assert.equal(result[0].title,'Original');assert.match(result[0].video,/\/one\//);assert.equal(result[1].video,'');
 assert.deepEqual(recordingsFor(user,'esp32',aliases,rows),[]);
 assert.equal(recordingsFor({...user,grupo:'G10'},'uav',aliases,rows)[0].video,rows[0].Video_G10);
 assert.equal(recordingsFor({...user,grupo:'G2'},'uav',aliases,rows)[0].video,'');
 assert.deepEqual(recordingsFor({...user,grupos:{DRONES_101:''}},'uav',aliases,rows),[]);
});
test('course group overrides global group and output omits all other sheet columns',()=>{
 const result=recordingsFor({cursosInscritos:['DRONES_101'],grupo:'G1',grupos:{DRONES_101:'G10'}},'uav',aliases,rows);
 assert.match(result[0].video,/\/ten\//);
 assert.deepEqual(Object.keys(result[0]).sort(),['code','courseId','group','title','video']);
});
