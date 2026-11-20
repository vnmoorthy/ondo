#!/usr/bin/env python3
"""Add slide transitions and staggered entrance animations to the Ondo deck.

Usage: python3 deck/add_motion.py deck/Ondo-Pitch.pptx

Shapes whose name starts with g<N><f|u|w>- (set via objectName in build_deck.js) are animated:
  N = group order (groups play one after another, automatically, no clicks)
  f = fade, u = fly in from bottom, w = wipe from left
Every slide gets a transition; none auto-advances.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

TRANSITIONS = {
    1: '<p:fade/>', 2: '<p:fade/>', 3: '<p:push dir="u"/>', 4: '<p:fade/>', 5: '<p:wipe dir="r"/>',
    6: '<p:fade/>', 7: '<p:push dir="u"/>', 8: '<p:wipe dir="r"/>', 9: '<p:fade/>', 10: '<p:fade/>',
}
DUR = 500        # ms per effect
STAGGER = 380    # ms between groups

SHAPE_RE = re.compile(r'<p:(sp|pic|graphicFrame|cxnSp)>\s*<p:nv\w+Pr>\s*<p:cNvPr id="(\d+)" name="([^"]*)"')
NAME_RE = re.compile(r'^g(\d+)([fuw])-')


class Ids:
    def __init__(self):
        self.n = 2

    def next(self):
        self.n += 1
        return self.n


def set_visible(ids, spid):
    return (f'<p:set><p:cBhvr><p:cTn id="{ids.next()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>'
            f'</p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>')


def effect(ids, spid, kind, node_type, grp):
    grp_attr = ' grpId="0"' if grp else ''
    if kind == 'f':
        head = f'<p:cTn id="{ids.next()}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold"{grp_attr} nodeType="{node_type}">'
        body = set_visible(ids, spid) + (
            f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{ids.next()}" dur="{DUR}"/>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>')
    elif kind == 'w':
        head = f'<p:cTn id="{ids.next()}" presetID="22" presetClass="entr" presetSubtype="8" fill="hold"{grp_attr} nodeType="{node_type}">'
        body = set_visible(ids, spid) + (
            f'<p:animEffect transition="in" filter="wipe(left)"><p:cBhvr><p:cTn id="{ids.next()}" dur="{DUR}"/>'
            f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>')
    else:  # fly in from bottom
        head = f'<p:cTn id="{ids.next()}" presetID="2" presetClass="entr" presetSubtype="4" decel="100000" fill="hold"{grp_attr} nodeType="{node_type}">'
        def anim(attr, frm, to):
            return (f'<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="{ids.next()}" dur="{DUR}" fill="hold"/>'
                    f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr>'
                    f'<p:tavLst><p:tav tm="0"><p:val><p:strVal val="{frm}"/></p:val></p:tav>'
                    f'<p:tav tm="100000"><p:val><p:strVal val="{to}"/></p:val></p:tav></p:tavLst></p:anim>')
        body = set_visible(ids, spid) + anim('ppt_x', '#ppt_x', '#ppt_x') + anim('ppt_y', '1+#ppt_h/2', '#ppt_y')
    return (f'<p:par>{head}<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{body}</p:childTnLst></p:cTn></p:par>')


def timing_xml(shapes):
    """shapes: list of (group, kind, spid, tag)"""
    groups = {}
    for g, kind, spid, tag in shapes:
        groups.setdefault(g, []).append((kind, spid, tag))
    ids = Ids()  # 1 = root, 2 = main sequence
    outer_id = ids.next()
    inner = []
    bld = []
    for k, g in enumerate(sorted(groups)):
        par_id = ids.next()
        effs = []
        for j, (kind, spid, tag) in enumerate(groups[g]):
            grp = tag in ('sp', 'graphicFrame')
            effs.append(effect(ids, spid, kind, 'afterEffect' if j == 0 else 'withEffect', grp))
            if tag == 'sp':
                bld.append(f'<p:bldP spid="{spid}" grpId="0" animBg="1"/>')
            elif tag == 'graphicFrame':
                bld.append(f'<p:bldGraphic spid="{spid}" grpId="0"><p:bldAsOne/></p:bldGraphic>')
        inner.append(f'<p:par><p:cTn id="{par_id}" fill="hold"><p:stCondLst><p:cond delay="{k * STAGGER}"/></p:stCondLst>'
                     f'<p:childTnLst>{"".join(effs)}</p:childTnLst></p:cTn></p:par>')
    main = (f'<p:par><p:cTn id="{outer_id}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
            f'<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst>'
            f'<p:childTnLst>{"".join(inner)}</p:childTnLst></p:cTn></p:par>')
    xml = ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
           '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
           f'{main}</p:childTnLst></p:cTn>'
           '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
           '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
           '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>')
    if bld:
        xml += f'<p:bldLst>{"".join(bld)}</p:bldLst>'
    return xml + '</p:timing>'


def process_slide(xml, num, animate=True):
    xml = re.sub(r'<p:transition\b.*?</p:transition>|<p:timing>.*?</p:timing>', '', xml, flags=re.S)
    # pptxgenjs 3.12 writes an <a:pPr> before every run of a multi-run paragraph; only the first is
    # schema-valid, so drop any pPr that directly follows a run or line break.
    xml = re.sub(r'(</a:r>|<a:br/>|<a:br>.*?</a:br>)\s*<a:pPr\b(?:[^>]*/>|[^>]*>.*?</a:pPr>)', r'\1', xml, flags=re.S)
    # pptxgenjs gives the slide-number field a fixed id (25) that can collide with a real shape: renumber it.
    all_ids = [int(i) for i in re.findall(r'<p:cNvPr id="(\d+)"', xml)]
    nxt = max(all_ids) + 1
    def renum(m):
        nonlocal nxt
        if all_ids.count(int(m.group(1))) > 1:
            nxt += 1
            return f'<p:cNvPr id="{nxt - 1}" name="Slide Number Placeholder'
        return m.group(0)
    xml = re.sub(r'<p:cNvPr id="(\d+)" name="Slide Number Placeholder', renum, xml)
    ids_now = re.findall(r'<p:cNvPr id="(\d+)"', xml)
    assert len(ids_now) == len(set(ids_now)), f'slide {num}: duplicate shape ids remain'
    shapes = []
    for m in SHAPE_RE.finditer(xml):
        tag, spid, name = m.group(1), m.group(2), m.group(3)
        nm = NAME_RE.match(name)
        if nm:
            shapes.append((int(nm.group(1)), nm.group(2), spid, tag))
    ids_seen = [s[2] for s in shapes]
    assert len(ids_seen) == len(set(ids_seen)), f'slide {num}: duplicate shape ids {ids_seen}'
    extra = f'<p:transition spd="med">{TRANSITIONS.get(num, "<p:fade/>")}</p:transition>'
    if animate and shapes:
        extra += timing_xml(shapes)
    anchor = '</p:clrMapOvr>'
    if anchor in xml:
        xml = xml.replace(anchor, anchor + extra, 1)
    else:
        xml = xml.replace('</p:cSld>', '</p:cSld>' + extra, 1)
    return xml, len(shapes)


def main():
    deck = os.path.abspath(sys.argv[1])
    no_anim = '--transitions-only' in sys.argv
    tmp = tempfile.mkdtemp(prefix='ondo-motion-', dir=os.environ.get('MOTION_TMP', '/private/tmp/claude-501'))
    try:
        with zipfile.ZipFile(deck) as z:
            z.extractall(tmp)
        sdir = os.path.join(tmp, 'ppt', 'slides')
        for f in sorted(os.listdir(sdir)):
            m = re.match(r'slide(\d+)\.xml$', f)
            if not m:
                continue
            n = int(m.group(1))
            p = os.path.join(sdir, f)
            xml = open(p, encoding='utf-8').read()
            xml, count = process_slide(xml, n, animate=not no_anim)
            open(p, 'w', encoding='utf-8').write(xml)
            print(f'slide {n}: transition={TRANSITIONS.get(n)} animated_shapes={count if not no_anim else 0}')
        out = deck + '.tmp'
        if os.path.exists(out):
            os.remove(out)
        # zip from inside the dir; [Content_Types].xml first
        subprocess.run(['zip', '-X', '-r', '-D', '-q', out, '[Content_Types].xml'], cwd=tmp, check=True)
        subprocess.run(['zip', '-X', '-r', '-D', '-q', out, '.', '-x', '[Content_Types].xml'], cwd=tmp, check=True)
        shutil.move(out, deck)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    main()
