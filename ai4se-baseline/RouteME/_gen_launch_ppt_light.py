# -*- coding: utf-8 -*-
"""RouteMe 3-minute light-theme launch deck (7 slides, 1280x720)."""
import math
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.dml import MSO_LINE
from pptx.oxml.ns import qn

PXE = 9525
CJK = "Microsoft YaHei"

BG = "FAF8F3"
BG_WARM = "F3ECE1"
CARD = "FFFFFF"
CARD_WARM = "F6F0E6"
BORDER = "E6DFD3"
INK = "1F2733"
BODY = "5A6472"
MUTED = "6E7887"
FAINT = "9AA3AF"
ORANGE = "C2440F"
ORANGE_BRIGHT = "E85D2A"
TEAL = "0F766E"

W, H = 1280, 720


def px(v):
    return Emu(int(round(v * PXE)))


def bg(slide, color):
    f = slide.background.fill
    f.solid()
    f.fore_color.rgb = RGBColor.from_string(color)


def shp(slide, kind, x, y, w, h, fill=None, line=None, line_w=1.0, dash=None, adj=None):
    s = slide.shapes.add_shape(kind, px(x), px(y), px(w), px(h))
    s.shadow.inherit = False
    if fill is None:
        s.fill.background()
    else:
        s.fill.solid()
        s.fill.fore_color.rgb = RGBColor.from_string(fill)
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = RGBColor.from_string(line)
        s.line.width = Pt(line_w)
        if dash is not None:
            s.line.dash_style = dash
    if adj is not None:
        try:
            s.adjustments[0] = adj
        except Exception:
            pass
    return s


def connector(slide, x1, y1, x2, y2, color=BORDER, width=1.5, dash=None):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, px(x1), px(y1), px(x2), px(y2))
    c.line.color.rgb = RGBColor.from_string(color)
    c.line.width = Pt(width)
    if dash is not None:
        c.line.dash_style = dash
    return c


def _fix_fonts(run, font):
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {})
            latin = rPr.find(qn("a:latin"))
            if latin is not None:
                latin.addnext(el)
            else:
                rPr.append(el)
        el.set("typeface", font)


def _run(run, rd, fb_size, fb_color, fb_bold):
    run.text = rd["text"]
    run.font.size = Pt(rd.get("size", fb_size))
    run.font.bold = rd.get("bold", fb_bold)
    run.font.color.rgb = RGBColor.from_string(rd.get("color", fb_color))
    font = rd.get("font", CJK)
    run.font.name = font
    _fix_fonts(run, font)
    if rd.get("spc"):
        run._r.get_or_add_rPr().set("spc", str(rd["spc"]))


def txt(slide, x, y, w, h, paras, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = slide.shapes.add_textbox(px(x), px(y), px(w), px(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    for i, p in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = p.get("align", align)
        if "after" in p:
            para.space_after = Pt(p["after"])
        para.line_spacing = p.get("line", 1.2)
        runs = p.get("runs") or [{"text": p["text"]}]
        for rd in runs:
            r = para.add_run()
            _run(r, rd, p.get("size", 14), p.get("color", BODY), p.get("bold", False))
    return tb


def footer(slide, num):
    shp(slide, MSO_SHAPE.RECTANGLE, 80, 664, 1120, 1, fill=BORDER)
    txt(slide, 80, 680, 500, 20, [{"text": "RouteMe 路觅 · 产品发布会", "size": 10.5, "color": FAINT}])
    txt(slide, 1130, 680, 70, 20, [{"text": "%02d" % num, "size": 10.5, "color": FAINT, "align": PP_ALIGN.RIGHT}])


def heading(slide, tag, title, sub=None):
    txt(slide, 80, 74, 760, 20, [{"text": tag, "size": 12, "color": ORANGE, "bold": True, "spc": 260}])
    txt(slide, 80, 96, 1080, 66, [{"text": title, "size": 36, "color": INK, "bold": True}])
    if sub:
        txt(slide, 80, 168, 1080, 28, [{"text": sub, "size": 15, "color": MUTED}])


def new_slide(prs, color=BG):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s, color)
    return s


def card(slide, x, y, w, h, fill=CARD):
    return shp(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h, fill=fill, line=BORDER, line_w=1.0, adj=0.05)


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


prs = Presentation()
prs.slide_width = px(W)
prs.slide_height = px(H)

# ------------------------------------------------------------------ P1 cover
s = new_slide(prs, BG)
shp(s, MSO_SHAPE.OVAL, 738, 108, 474, 474, fill=None, line="DED4C4", line_w=2)
shp(s, MSO_SHAPE.OVAL, 800, 170, 350, 350, fill=None, line="E9E1D4", line_w=1, dash=MSO_LINE.DASH)
shp(s, MSO_SHAPE.OVAL, 900, 272, 150, 150, fill="F2EADF", line=None)
cx, cy, R = 975, 345, 237
nodes = []
for ang in (200, 292, 75):
    rad = math.radians(ang)
    nodes.append((cx + R * math.cos(rad), cy + R * math.sin(rad)))
connector(s, nodes[0][0], nodes[0][1], nodes[1][0], nodes[1][1], color=ORANGE_BRIGHT, width=2, dash=MSO_LINE.DASH)
connector(s, nodes[1][0], nodes[1][1], nodes[2][0], nodes[2][1], color=TEAL, width=2, dash=MSO_LINE.DASH)
for (nx, ny), col in zip(nodes, (ORANGE_BRIGHT, TEAL, INK)):
    shp(s, MSO_SHAPE.OVAL, nx - 8, ny - 8, 16, 16, fill=col, line=BG, line_w=3)

txt(s, 80, 176, 640, 22, [{"text": "ROUTEME · PRODUCT LAUNCH 2026", "size": 13, "color": ORANGE, "bold": True, "spc": 300}])
txt(s, 80, 208, 700, 108, [{"text": "路觅 RouteMe", "size": 64, "color": INK, "bold": True}])
txt(s, 80, 328, 660, 46, [{"text": "让每一次出发，都有路可循。", "size": 30, "color": ORANGE, "bold": True}])
txt(s, 80, 394, 620, 26, [{"text": "面向大学生的路线驱动型轻社交旅行 App", "size": 15, "color": BODY}])
kw = ["路线生成", "同路匹配", "安心同行"]
kx = 80
for i, k in enumerate(kw):
    wgt = 24 + sum(13 * 1.4 if ord(c) > 127 else 13 * 0.76 for c in k)
    b = shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, kx, 462, int(wgt), 40, fill=CARD, line=BORDER, line_w=1, adj=0.5)
    tf = b.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    _run(r, {"text": k, "size": 13, "color": ORANGE if i == 0 else INK, "bold": i == 0}, 13, INK, i == 0)
    kx += int(wgt) + 14
txt(s, 80, 630, 700, 22, [{"text": "产品发布会 · 3 分钟", "size": 12, "color": FAINT}])
notes(s, "【15 秒】大家好，今天用三分钟介绍路觅——一款让大学生从「想去」走到「出发」的产品。")

# ------------------------------------------------------------------ P2 pain
s = new_slide(prs)
heading(s, "01 · WHY", "出发，为什么这么难？", "我们和许多同学聊过，最常听到的是这三句话——")
quotes = [
    ("想去旅行，但不知道去哪、怎么去。", "规划的门槛"),
    ("想找人一起，但开口太难了。", "社交的墙"),
    ("约到了人，又怕不靠谱。", "信任的坎"),
]
for i, (q, src) in enumerate(quotes):
    x = 80 + i * 384
    card(s, x, 232, 352, 300)
    txt(s, x + 28, 250, 108, 60, [{"text": "\u201C", "size": 46, "color": ORANGE_BRIGHT, "bold": True}])
    txt(s, x + 28, 316, 296, 144, [{"text": q, "size": 19, "color": INK, "line": 1.35}])
    txt(s, x + 28, 452, 296, 22, [{"text": "—— " + src, "size": 12, "color": MUTED}])
txt(s, 80, 572, 1120, 32, [{"runs": [
    {"text": "他们不是不想出发，", "size": 17, "color": INK},
    {"text": "而是缺一条合适的路、一个合适的人、一份可信的保障。", "size": 17, "color": ORANGE, "bold": True}]}])
footer(s, 2)
notes(s, "【30 秒】做产品之前我们先听了学生的真话：不知道去哪怎么去，开口找人太难，约到了又怕不靠谱。规划、社交、信任三道坎，挡住了大部分出发。")

# ------------------------------------------------------------------ P3 who
s = new_slide(prs)
heading(s, "02 · WHO", "我们为谁而做")
txt(s, 80, 202, 400, 100, [{"text": "18–25", "size": 60, "color": ORANGE, "bold": True, "font": "Arial"}])
txt(s, 80, 304, 400, 34, [{"text": "岁 · 在校大学生", "size": 20, "color": INK, "bold": True}])
txt(s, 80, 352, 420, 160, [{"text": "预算有限、规划经验有限，但旅行意愿强烈。偏内向的同学，更接受因共同路线而自然认识。",
                            "size": 14, "color": BODY, "line": 1.55}])
personas = [
    ("特种兵挑战者", "时间少、想体验密度高；需要体力与风险校验。"),
    ("悠闲探索者", "重节奏与体验；要美食、拍照与可调整的路线。"),
    ("临时出发者", "只有半天或一个周末；要 3 分钟拿出方案。"),
    ("无障碍需求者", "关注台阶、电梯与设施；要可核验的信息。"),
]
for i, (t, d) in enumerate(personas):
    y = 206 + i * 90
    b = shp(s, MSO_SHAPE.OVAL, 560, y + 2, 32, 32, fill=ORANGE if i == 0 else CARD_WARM, line=None)
    tf = b.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    _run(r, {"text": "%02d" % (i + 1), "size": 11, "color": CARD if i == 0 else ORANGE, "bold": True}, 11, ORANGE, True)
    txt(s, 612, y - 2, 580, 30, [{"text": t, "size": 17, "color": INK, "bold": True}])
    txt(s, 612, y + 30, 580, 24, [{"text": d, "size": 12.5, "color": BODY}])
footer(s, 3)
notes(s, "【25 秒】我们不为所有人做产品。18 到 25 岁在校大学生：预算有限、经验有限、意愿强烈。特种兵、悠闲派、临时起意、无障碍需求——四种人，四种走法。")

# ------------------------------------------------------------------ P4 insight
s = new_slide(prs, BG_WARM)
txt(s, 80, 142, 1120, 22, [{"text": "03 · INSIGHT", "size": 12, "color": ORANGE, "bold": True, "spc": 300, "align": PP_ALIGN.CENTER}])
txt(s, 80, 176, 1120, 108, [{"text": "以路线为社交媒介。", "size": 54, "color": INK, "bold": True, "align": PP_ALIGN.CENTER}])
txt(s, 80, 292, 1120, 32, [{"text": "RouteMe 不提供更多景点，而是回答三个具体的问题：", "size": 18, "color": BODY, "align": PP_ALIGN.CENTER}])
qs = ["我现在适合怎样玩？", "谁可能与我同路？", "怎样安心地一起出发？"]
for i, q in enumerate(qs):
    x = 100 + i * 370
    card(s, x, 356, 340, 108)
    txt(s, x + 24, 376, 292, 20, [{"text": "问题 0%d" % (i + 1), "size": 11, "color": TEAL, "bold": True, "spc": 120}])
    txt(s, x + 24, 404, 292, 36, [{"text": q, "size": 19, "color": INK, "bold": True}])
shp(s, MSO_SHAPE.RECTANGLE, 460, 524, 360, 1, fill=BORDER)
txt(s, 80, 546, 1120, 32, [{"text": "这条界线，就是路觅与其他旅行产品的分水岭。", "size": 16, "color": ORANGE, "bold": True, "align": PP_ALIGN.CENTER}])
txt(s, 80, 616, 1120, 24, [{"text": "路线驱动型轻社交旅行 App", "size": 12, "color": FAINT, "align": PP_ALIGN.CENTER}])
notes(s, "【20 秒】我们的答案只有一句：以路线为社交媒介。不给你更多景点，只回答三个问题——适合怎样玩、谁与我同路、怎样安心出发。")

# ------------------------------------------------------------------ P5 how
s = new_slide(prs)
heading(s, "04 · HOW", "一条路线，串起全部答案", "规划、匹配、信任与闭环——四个动作，一条旅程。")
cols = [
    ("01", "规划路线", ["地图选点 + AI 规划师", "3 分钟生成可执行行程", "天气与预算同步提醒"]),
    ("02", "匹配同路", ["按目的地与兴趣匹配", "结果附匹配原因", "双向同意后才能开聊"]),
    ("03", "安心同行", ["学生认证才能发起", "信用分守约加分、失约扣分", "举报有回执，通知实时达"]),
    ("04", "灵感闭环", ["结束旅行分享真实体验", "一键参考此行程发布", "成为下一个人的灵感"]),
]
for i, (num, t, items) in enumerate(cols):
    x = 80 + i * 282
    card(s, x, 210, 270, 330)
    txt(s, x + 24, 234, 120, 54, [{"text": num, "size": 30, "color": ORANGE, "bold": True, "font": "Arial"}])
    txt(s, x + 24, 292, 220, 32, [{"text": t, "size": 18, "color": INK, "bold": True}])
    for j, it in enumerate(items):
        txt(s, x + 24, 344 + j * 40, 224, 30, [{"text": it, "size": 12.5, "color": BODY, "line": 1.3}])
txt(s, 80, 588, 1120, 32, [{"runs": [
    {"text": "产品、信任与运营，", "size": 16, "color": BODY},
    {"text": "都在为同一个闭环服务。", "size": 16, "color": INK, "bold": True}]}])
footer(s, 5)
notes(s, "【40 秒】四个动作。地图加 AI，三分钟把想法变成可执行行程；按路线匹配同路人，双向同意才开聊；学生认证、信用分、举报与通知，把安全感写进规则；旅行结束分享体验，一键成为下一个人的灵感。")

# ------------------------------------------------------------------ P6 stories
s = new_slide(prs)
heading(s, "05 · STORIES", "五个用户故事，一条完整旅程")
stories = [
    ("US-01", "浏览者", "获得灵感", "我想浏览别人的行程与真实体验，找到旅行的方向。"),
    ("US-02", "发布者", "发布行程", "我想发布目的地、日期与路线，让同路的人找到我。"),
    ("US-03", "寻找搭子", "发现同行者", "我想看到路线与兴趣相近的计划，减少筛选成本。"),
    ("US-04", "申请者 / 发布者", "建立连接", "我想申请或被裁决，在双方同意后开始聊天。"),
    ("US-05", "旅行归来", "分享体验", "我想留下真实体验和建议，帮助下一个出发的人。"),
]
for i, (num, role, title, story) in enumerate(stories):
    y = 206 + i * 84
    shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 80, y, 1120, 76,
        fill=CARD if i % 2 == 0 else CARD_WARM, line=None, adj=0.14)
    txt(s, 106, y + 28, 70, 22, [{"text": num, "size": 12, "color": ORANGE, "bold": True, "font": "Arial", "spc": 100}])
    txt(s, 190, y + 29, 128, 22, [{"text": role, "size": 11.5, "color": TEAL, "bold": True}])
    txt(s, 330, y + 24, 210, 30, [{"text": title, "size": 17, "color": INK, "bold": True}])
    txt(s, 560, y + 28, 616, 24, [{"text": story, "size": 13, "color": BODY}])
txt(s, 80, 636, 1120, 26, [{"text": "五条故事共用同一套行程、同行、信用与通知能力——不是五个功能，而是一条旅程。",
                             "size": 13.5, "color": MUTED}])
footer(s, 6)
notes(s, "【25 秒】这四步拆成五个用户故事：获得灵感、发布行程、发现同行者、建立连接、分享体验。每一条都已跑通，连成一条完整旅程。")

# ------------------------------------------------------------------ P7 closing
s = new_slide(prs, BG_WARM)
txt(s, 80, 158, 1120, 22, [{"text": "ROUTEME · 路觅", "size": 12, "color": ORANGE, "bold": True, "spc": 300, "align": PP_ALIGN.CENTER}])
txt(s, 80, 196, 1120, 88, [{"text": "路，是走出来的；伴，是寻到的。", "size": 42, "color": INK, "bold": True, "align": PP_ALIGN.CENTER}])
txt(s, 80, 300, 1120, 32, [{"text": "让每一个想出发的大学生，都能安心上路。", "size": 19, "color": BODY, "align": PP_ALIGN.CENTER}])
d = [(510, 400), (640, 372), (770, 400)]
connector(s, d[0][0], d[0][1], d[1][0], d[1][1], color="D8CFC0", width=2, dash=MSO_LINE.DASH)
connector(s, d[1][0], d[1][1], d[2][0], d[2][1], color="D8CFC0", width=2, dash=MSO_LINE.DASH)
shp(s, MSO_SHAPE.OVAL, d[0][0] - 6, d[0][1] - 6, 12, 12, fill=ORANGE_BRIGHT, line=None)
shp(s, MSO_SHAPE.OVAL, d[1][0] - 6, d[1][1] - 6, 12, 12, fill=TEAL, line=None)
shp(s, MSO_SHAPE.OVAL, d[2][0] - 6, d[2][1] - 6, 12, 12, fill=INK, line=None)
txt(s, 80, 448, 1120, 64, [{"text": "谢谢", "size": 32, "color": ORANGE, "bold": True, "align": PP_ALIGN.CENTER}])
txt(s, 80, 512, 1120, 24, [{"text": "期待与你 · 同路出发", "size": 13, "color": FAINT, "align": PP_ALIGN.CENTER}])
notes(s, "【15 秒】路，是走出来的；伴，是寻到的。让每一个想出发的大学生，都能安心上路。谢谢。")

OUT = r"c:\Users\LIUWA2\Desktop\ITA\11.13\RouteME\ai4se-baseline\RouteME\docs\RouteMe_路觅_产品发布会_3分钟.pptx"
prs.save(OUT)
print("saved slides:", len(prs.slides))
