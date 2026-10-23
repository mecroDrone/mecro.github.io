"""Import supplied MECRO archives; originals stay untouched. Student files stay local.
Usage: python scripts/import-courses.py <directory-containing-the-six-ZIPs>
"""
import argparse, hashlib, io, json, pathlib, re, zipfile
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
PACKAGES = {
    'uav': ('Drones', 'MECRO_Drones_Paquete_Academico.zip'),
    'cohetes': ('Coheteria', 'MECRO_Coheteria_Curso_Completo.zip'),
    'esp32': ('ESP32', 'MECRO_ESP32_Paquete_Academico.zip'),
}
def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def safe_write(folder, name, data):
    target=(folder/name).resolve()
    if not target.is_relative_to(folder.resolve()):
        raise ValueError('Archive path escapes destination: '+name)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return target

def run(source):
    courses=json.loads((ROOT/'data/cursos.json').read_text(encoding='utf-8'))
    campus=[]; audit=[]
    for cid,(label,academic_name) in PACKAGES.items():
        folder=ROOT/'materiales'/cid
        archive=source/f'MECRO_{label}_Para_Web.zip'
        with zipfile.ZipFile(archive) as z:
            names=z.namelist()
            for info in z.infolist():
                if info.is_dir(): continue
                rel=pathlib.PurePosixPath(info.filename)
                if rel.parts[0]!='Web': raise ValueError(info.filename)
                if info.file_size>100_000_000: raise ValueError('Unexpected large entry')
                safe_write(folder, pathlib.Path(*rel.parts[1:]), z.read(info))
            full=json.loads(z.read('Web/fuentes/curso.json'))
            refs=full['refs']; entries=[]; presentation_files=[]
            for name in sorted(n for n in names if re.fullmatch(r'Web/fuentes/clase-\d+\.json',n)):
                lesson=json.loads(z.read(name)); n=lesson['n']; number=f'{n:02}'
                lesson['references']={k:refs[k] for k in lesson.get('refs',[]) if k in refs}
                lesson['assetMap']={pathlib.PurePosixPath(a).stem:a.removeprefix('Web/') for a in names if '/assets/' in a}
                html=z.read(f'Web/clase-{number}.html').decode('utf-8')
                eqs=iter(re.findall(r'<img[^>]+src=[\"\'](assets/eq[^\"\']+)',html))
                for page in lesson['pages']:
                    for block in page['blocks']:
                        if block['type']=='equation': block['image']=next(eqs,None)
                write_json(folder/f'lecciones/{number}.json',lesson)
                pdf=next(n.removeprefix('Web/') for n in names if re.search(rf'_Clase_{number}\.pdf$',n))
                week=lesson['week']; deck=next(n.removeprefix('Web/') for n in names if re.search(rf'_Semana_{week:02}\.pptx$',n))
                entries.append({k:lesson[k] for k in ['n','week','title','goal','hours','mode','delivery']})
                entries[-1].update({'reading':f'lecciones/{number}.json','pdf':pdf,'ppt':deck,'presentation':f'presentaciones/semana-{week:02}.json','topics':[page['title'] for page in lesson['pages']]})
            for name in sorted(n for n in names if n.endswith('.pptx')):
                week=int(re.search(r'_Semana_(\d+)',name)[1]); slides=[]
                with zipfile.ZipFile(io.BytesIO(z.read(name))) as deck:
                    xmls=sorted((n for n in deck.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)),key=lambda n:int(re.search(r'slide(\d+)',n)[1]))
                    for i,n in enumerate(xmls):
                        tree=ET.fromstring(deck.read(n)); text=[''.join(p.itertext()) for p in tree.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}t')]
                        slides.append({'n':i+1,'text':text})
                out=f'presentaciones/semana-{week:02}'
                write_json(folder/(out+'.json'),{'week':week,'slides':slides,'pdf':out+'.pdf','ppt':name.removeprefix('Web/')})
                presentation_files.append({'source':str(folder/name.removeprefix('Web/')),'target':str(folder/(out+'.pdf')),'slides':len(slides)})
            program=next(n for n in names if '/descargas/' in n and 'Programa' in n and n.endswith('.pdf'))
            public_pdf=f'assets/programas/silabo-{cid}.pdf'; safe_write(ROOT,public_pdf,z.read(program))
            downloads=[n.removeprefix('Web/') for n in names if '/descargas/' in n and not re.search(r'(Guia_Docente|Diagnostico)',n)]
            write_json(folder/'biblioteca.json',{'files':downloads})
        # Preserve complete academic sources for the owner, separately from student resources.
        with zipfile.ZipFile(source/academic_name) as z:
            for item in z.infolist():
                if not item.is_dir(): safe_write(ROOT/'.course-work'/cid,item.filename,z.read(item))
        course=next(c for c in courses if c['id']==cid)
        course.update({'status':'available','hours':sum(l['hours'] for l in entries),'sessions':len(entries),'weeks':max(l['week'] for l in entries),'units':max(l['week'] for l in entries),'syllabusPdf':public_pdf})
        course['modules']=[{'title':f'Semana {week}', 'lessons':[{'title':f"Clase {l['n']:02} · {l['title']}",'topics':[l['goal'],f"{l['mode']} · {l['hours']} horas",f"Entrega: {l['delivery']}"]} for l in entries if l['week']==week]} for week in range(1,course['weeks']+1)]
        campus.append({'id':cid,'title':course['title'],'image':course['image'],'hours':course['hours'],'weeks':course['weeks'],'syllabusPdf':public_pdf,'lessons':entries})
        audit.append({'course':cid,'source':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'lessons':len(entries),'hours':course['hours'],'presentations':presentation_files})
    next(c for c in courses if c['id']=='telemetria')['status']='coming-soon'
    write_json(ROOT/'data/cursos.json',courses)
    write_json(ROOT/'data/campus.json',{'edition':'2026-10-21','courses':campus})
    write_json(ROOT/'.course-work/import-report.json',audit)
    print(json.dumps([{k:v for k,v in a.items() if k!='presentations'} for a in audit],ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('source',type=pathlib.Path)
    run(parser.parse_args().source.resolve())
