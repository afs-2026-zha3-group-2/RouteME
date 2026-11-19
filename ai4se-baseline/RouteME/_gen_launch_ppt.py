# -*- coding: utf-8 -*-
"""Generate RouteMe product-launch deck (12 slides, 1280x720)."""
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

BG = "0D131F"
BG_DEEP = "0A0F18"
CARD = "161F2E"
CARD2 = "1B2436"
LINE = "27324A"
TEXT = "F2F5FA"
MUTED = "93A1B8"
ORANGE = "FF6B35"
PEACH = "FFB08F"
TEAL = "35D0BA"

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


def connector(slide, x1, y1, x2, y2, color=LINE, width=1.5, dash=None):
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


def _run(run, rd, fallback_size, fallback_color, fallback_bold):
    size = rd.get("size", fallback_size)
    run.text = rd["text"]
    run.font.size = Pt(size)
    run.font.bold = rd.get("bold", fallback_bold)
    run.font.color.rgb = RGBColor.from_string(rd.get("color", fallback_color))
    font = rd.get("font", CJK)
    run.font.name = font
    _fix_fonts(run, font)
    spc = rd.get("spc")
    if spc:
        run._r.get_or_add_rPr().set("spc", str(spc))


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
        if "before" in p:
            para.space_before = Pt(p["before"])
        para.line_spacing = p.get("line", 1.2)
        runs = p.get("runs")
        if runs is None:
            runs = [{"text": p["text"]}]
        for rd in runs:
            r = para.add_run()
            _run(r, rd, p.get("size", 14), p.get("color", TEXT), p.get("bold", False))
    return tb


def footer(slide, num):
    shp(slide, MSO_SHAPE.RECTANGLE, 80, 664, 1120, 1, fill="1E2839")
    txt(slide, 80, 680, 500, 20, [{"text": "RouteMe 路觅 · 产品发布会", "size": 10.5, "color": MUTED}])
    txt(slide, 1130, 680, 70, 20, [{"text": "%02d" % num, "size": 10.5, "color": MUTED, "align": PP_ALIGN.RIGHT}])


def heading(slide, tag, title, sub=None):
    txt(slide, 80, 74, 760, 20, [{"text": tag, "size": 12, "color": ORANGE, "bold": True, "spc": 260}])
    txt(slide, 80, 96, 1080, 66, [{"text": title, "size": 36, "color": TEXT, "bold": True}])
    if sub:
        txt(slide, 80, 168, 1080, 28, [{"text": sub, "size": 15, "color": MUTED}])


def new_slide(prs, color=BG):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg(s, color)
    return s


def card(slide, x, y, w, h, fill=CARD):
    return shp(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h, fill=fill, line=LINE, line_w=1.0, adj=0.06)


def chip(slide, x, y, text, w=None, size=12.5, color=TEXT, fill=None, stroke=None, h=36):
    if w is None:
        w = 24
        for ch in text:
            w += size * 1.4 if ord(ch) > 127 else size * 0.76
    s = shp(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h,
            fill=fill if fill else CARD2, line=stroke if stroke else LINE, line_w=1.0, adj=0.5)
    tf = s.text_frame
    tf.word_wrap = False
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    _run(r, {"text": text, "size": size, "color": color}, size, color, False)
    return s


def badge_num(slide, x, y, d, label, fill=ORANGE, color=TEXT, size=11):
    s = shp(slide, MSO_SHAPE.OVAL, x, y, d, d, fill=fill, line=None)
    tf = s.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    _run(r, {"text": label, "size": size, "color": color, "bold": True}, size, color, True)
    return s


prs = Presentation()
prs.slide_width = px(W)
prs.slide_height = px(H)

# ---------------------------------------------------------------- P1 cover
s = new_slide(prs, BG_DEEP)
# route motif: rings + nodes + dashed path
ring = shp(s, MSO_SHAPE.OVAL, 738, 108, 474, 474, fill=None, line=LINE, line_w=2)
shp(s, MSO_SHAPE.OVAL, 800, 170, 350, 350, fill=None, line="1E2839", line_w=1, dash=MSO_LINE.DASH)
shp(s, MSO_SHAPE.OVAL, 900, 272, 150, 150, fill="111827", line="1E2839", line_w=1)
cx, cy, R = 975, 345, 237
nodes = []
for ang in (200, 292, 75):
    rad = math.radians(ang)
    nodes.append((cx + R * math.cos(rad), cy + R * math.sin(rad)))
connector(s, nodes[0][0], nodes[0][1], nodes[1][0], nodes[1][1], color=ORANGE, width=2, dash=MSO_LINE.DASH)
connector(s, nodes[1][0], nodes[1][1], nodes[2][0], nodes[2][1], color=TEAL, width=2, dash=MSO_LINE.DASH)
for (nx, ny), col in zip(nodes, (ORANGE, TEAL, TEXT)):
    shp(s, MSO_SHAPE.OVAL, nx - 8, ny - 8, 16, 16, fill=col, line=BG_DEEP, line_w=3)

txt(s, 80, 176, 640, 22, [{"text": "ROUTEME · PRODUCT LAUNCH 2026", "size": 13, "color": ORANGE, "bold": True, "spc": 300}])
txt(s, 80, 208, 700, 114, [{"text": "路觅 RouteMe", "size": 66, "color": TEXT, "bold": True}])
txt(s, 80, 330, 660, 46, [{"text": "让每一次出发，都有路可循。", "size": 30, "color": PEACH, "bold": True}])
txt(s, 80, 394, 620, 26, [{"text": "面向大学生的路线驱动型轻社交旅行 App", "size": 15, "color": MUTED}])
kw = ["路线生成", "同路匹配", "安心同行"]
kx = 80
for i, k in enumerate(kw):
    c = chip(s, kx, 462, k, size=13, color=ORANGE if i == 0 else TEXT, fill=CARD, stroke=LINE, h=40)
    kx += int(c.width / PXE) + 14
txt(s, 80, 630, 700, 22, [{"text": "从旅行灵感到真实出发 · 完整闭环", "size": 12, "color": "64748B"}])

# ---------------------------------------------------------------- P2 quotes
s = new_slide(prs)
heading(s, "01 · WHY", "出发，为什么这么难？", "我们和许多同学聊过，最常听到的是这三句话——")
quotes = [
    ("想去旅行，但不知道去哪、怎么去。", "规划的门槛"),
    ("想找人一起，但开口太难了。", "社交的墙"),
    ("约到了人，又怕不靠谱。", "信任的坎"),
]
for i, (q, src) in enumerate(quotes):
    x = 80 + i * 384
    card(s, x, 232, 352, 304)
    txt(s, x + 28, 250, 108, 60, [{"text": "\u201C", "size": 46, "color": ORANGE, "bold": True}])
    txt(s, x + 28, 316, 296, 144, [{"text": q, "size": 19, "color": TEXT, "line": 1.35}])
    txt(s, x + 28, 452, 296, 22, [{"text": "—— " + src, "size": 12, "color": MUTED}])
txt(s, 80, 576, 1120, 30, [{"runs": [
    {"text": "他们不是不想出发，", "size": 17, "color": TEXT},
    {"text": "而是缺一条合适的路、一个合适的人、一份可信的保障。", "size": 17, "color": PEACH, "bold": True}]}])

# ---------------------------------------------------------------- P3 who
s = new_slide(prs)
heading(s, "02 · WHO", "我们为谁而做")
txt(s, 80, 202, 360, 100, [{"text": "18–25", "size": 60, "color": ORANGE, "bold": True, "font": "Arial"}])
txt(s, 80, 304, 360, 34, [{"text": "岁 · 在校大学生", "size": 20, "color": TEXT, "bold": True}])
txt(s, 80, 352, 340, 240, [{"text": "预算有限、规划经验有限，但旅行意愿强烈。可能偏内向、不擅长主动破冰，更接受“因共同路线而自然认识”，而不是被陌生人搭讪。",
                            "size": 14, "color": MUTED, "line": 1.5}])
personas = [
    ("特种兵挑战者", "时间短、想体验密度高；关注体力要求、装备与风险，需要可校验的高强度路线。"),
    ("悠闲探索者", "重节奏与体验；关注美食、拍照、休息与厕所，需要节奏舒适、可随时调整的路线。"),
    ("临时出发者", "只有半天或一个周末；没有明确目的地，需要 1–3 分钟内拿到可执行方案。"),
    ("无障碍需求者", "关注台阶、电梯、坡度与无障碍设施；需要可核验、标注来源的路线信息。"),
]
for i, (t, d) in enumerate(personas):
    x = 480 + (i % 2) * 372
    y = 204 + (i // 2) * 220
    card(s, x, y, 348, 194)
    badge_num(s, x + 24, y + 24, 34, "%02d" % (i + 1), fill=CARD2, color=ORANGE, size=12)
    txt(s, x + 70, y + 30, 254, 32, [{"text": t, "size": 18, "color": TEXT, "bold": True}])
    txt(s, x + 24, y + 84, 300, 96, [{"text": d, "size": 12.5, "color": MUTED, "line": 1.45}])
footer(s, 3)

# ---------------------------------------------------------------- P4 pain
s = new_slide(prs)
heading(s, "03 · PAIN", "横在“想去”与“出发”之间的三堵墙")
pains = [
    ("01", "不会规划", "攻略成千上万，却难以转化为符合自己时间、预算、体力与兴趣的可执行路线。",
     "不是缺信息，是缺一条“能走”的路线。"),
    ("02", "找不到人", "圈子小、偏内向，缺少自然的开口理由；临时起意，更难找到时间与目的地重合的同伴。",
     "不是不想社交，是缺一个“自然的起点”。"),
    ("03", "不敢同行", "陌生人同行的可靠程度无法判断；位置与隐私暴露的风险让人犹豫，宁愿放弃出发。",
     "不是不想组队，是缺一套“可信的机制”。"),
]
for i, (num, t, d, k) in enumerate(pains):
    x = 80 + i * 384
    card(s, x, 204, 352, 388)
    txt(s, x + 28, 218, 120, 78, [{"text": num, "size": 38, "color": ORANGE, "bold": True, "font": "Arial"}])
    txt(s, x + 28, 300, 296, 38, [{"text": t, "size": 24, "color": TEXT, "bold": True}])
    txt(s, x + 28, 350, 296, 128, [{"text": d, "size": 13.5, "color": MUTED, "line": 1.5}])
    shp(s, MSO_SHAPE.RECTANGLE, x + 28, 508, 296, 1, fill="1E2839")
    txt(s, x + 28, 524, 296, 52, [{"text": k, "size": 13.5, "color": PEACH, "bold": True, "line": 1.4}])
txt(s, 80, 612, 1120, 30, [{"runs": [
    {"text": "三堵墙背后是同一个缺口：", "size": 16, "color": MUTED},
    {"text": "没有一个产品，把“路线”与“人”放在同一件事里解决。", "size": 16, "color": TEXT, "bold": True}]}])
footer(s, 4)

# ---------------------------------------------------------------- P5 insight
s = new_slide(prs, BG_DEEP)
txt(s, 80, 142, 1120, 22, [{"text": "04 · INSIGHT", "size": 12, "color": ORANGE, "bold": True, "spc": 300, "align": PP_ALIGN.CENTER}])
txt(s, 80, 176, 1120, 108, [{"text": "以路线为社交媒介。", "size": 54, "color": TEXT, "bold": True, "align": PP_ALIGN.CENTER}])
txt(s, 80, 292, 1120, 32, [{"text": "RouteMe 不提供更多景点，而是回答三个具体的问题：", "size": 18, "color": MUTED, "align": PP_ALIGN.CENTER}])
qs = ["我现在适合怎样玩？", "谁可能与我同路？", "怎样安心地一起出发？"]
for i, q in enumerate(qs):
    x = 100 + i * 370
    card(s, x, 356, 340, 108, fill=CARD)
    txt(s, x + 24, 376, 292, 20, [{"text": "问题 0%d" % (i + 1), "size": 11, "color": TEAL, "bold": True, "spc": 120}])
    txt(s, x + 24, 404, 292, 34, [{"text": q, "size": 19, "color": TEXT, "bold": True}])
shp(s, MSO_SHAPE.RECTANGLE, 460, 524, 360, 1, fill="1E2839")
txt(s, 80, 546, 1120, 30, [{"text": "这条界线，就是路觅与其他旅行产品的分水岭。", "size": 16, "color": PEACH, "align": PP_ALIGN.CENTER}])
txt(s, 80, 616, 1120, 24, [{"text": "路线驱动型轻社交旅行 App", "size": 12, "color": "64748B", "align": PP_ALIGN.CENTER}])

# ---------------------------------------------------------------- P6 solution 1
s = new_slide(prs)
heading(s, "05 · SOLUTION 01", "3 分钟，从“想去”到“可执行”", "地图、AI 与天气协同，把灵感落到每一天的行程里。")
steps = [
    ("地图选点", "搜索地点，加入途经点，拖动排序，再选择出行方式。"),
    ("AI 规划师", "按天数、预算与偏好生成结构化行程，并可继续对话调整。"),
    ("天气与提醒", "目的地天气、出行提示随行程同步展示，出发前心里有数。"),
    ("发布招募", "路线、日期、人数一次发布，等同路的人出现。"),
]
shp(s, MSO_SHAPE.RECTANGLE, 97, 222, 2, 360, fill=LINE)
for i, (t, d) in enumerate(steps):
    y = 212 + i * 100
    badge_num(s, 85, y, 26, str(i + 1), fill=ORANGE if i == 0 else CARD2, color=TEXT, size=11)
    txt(s, 130, y - 2, 480, 30, [{"text": t, "size": 17, "color": TEXT, "bold": True}])
    txt(s, 130, y + 30, 470, 64, [{"text": d, "size": 12.5, "color": MUTED, "line": 1.4}])
# mini itinerary card
card(s, 700, 204, 500, 432)
txt(s, 730, 230, 200, 18, [{"text": "行程预览", "size": 10.5, "color": MUTED, "spc": 120}])
txt(s, 730, 252, 440, 34, [{"text": "珠海 · 情侣路一日游", "size": 20, "color": TEXT, "bold": True}])
chip(s, 730, 296, "11月21日 · 周六", size=11.5, color=TEXT, h=30)
chip(s, 730 + 150, 296, "悠闲模式", size=11.5, color=TEAL, h=30)
stops = [("01", "情侣路 · 海滨栈道", "预计 09:30 到达"),
         ("02", "珠海渔女", "预计 11:00 到达"),
         ("03", "香炉湾沙滩", "预计 14:30 到达")]
for i, (n, name, sub) in enumerate(stops):
    y = 354 + i * 58
    badge_num(s, 730, y, 24, n, fill=CARD2, color=ORANGE, size=10)
    txt(s, 768, y - 1, 380, 24, [{"text": name, "size": 13.5, "color": TEXT, "bold": True}])
    txt(s, 768, y + 24, 380, 18, [{"text": sub, "size": 11, "color": MUTED}])
shp(s, MSO_SHAPE.RECTANGLE, 730, 532, 440, 1, fill="1E2839")
chip(s, 730, 548, "晴 24°C", size=11.5, color=TEAL, h=30)
chip(s, 806, 548, "预算 300 元", size=11.5, color=TEXT, h=30)
chip(s, 904, 548, "2 人同行", size=11.5, color=TEXT, h=30)
btn = shp(s, MSO_SHAPE.ROUNDED_RECTANGLE, 730, 590, 170, 40, fill=ORANGE, line=None, adj=0.5)
tf = btn.text_frame
tf.margin_left = tf.margin_right = 0
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf.paragraphs[0]
p.alignment = PP_ALIGN.CENTER
r = p.add_run()
_run(r, {"text": "发布招募", "size": 14, "color": TEXT, "bold": True}, 14, TEXT, True)
footer(s, 6)

# ---------------------------------------------------------------- P7 solution 2
s = new_slide(prs)
heading(s, "06 · SOLUTION 02", "先匹配路线，再认识人", "连接的前提是共同的目的地，而不是无条件的私聊。")
flow = ["浏览灵感", "发布行程", "系统匹配", "申请同行", "双向同意", "开启沟通"]
fx = 82
for i, f in enumerate(flow):
    x = fx + i * 184
    cv = shp(s, MSO_SHAPE.CHEVRON, x, 208, 196, 72, fill=CARD if i < 5 else ORANGE, line=LINE, line_w=1)
    tf = cv.text_frame
    tf.margin_left = tf.margin_right = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    _run(r, {"text": f, "size": 14, "color": TEXT, "bold": i == 5}, 14, TEXT, i == 5)
card(s, 80, 324, 540, 196)
txt(s, 108, 348, 300, 24, [{"text": "匹配规则", "size": 15, "color": TEAL, "bold": True, "spc": 100}])
rule_lines = ["目的地相同  +50 分", "日期相同  +30 分 · 相差一天 +20 分", "共同兴趣  +10 分 / 个（最多 20 分）"]
for i, l in enumerate(rule_lines):
    txt(s, 108, 384 + i * 30, 480, 24, [{"text": l, "size": 13.5, "color": TEXT, "line": 1.2}])
txt(s, 108, 474, 480, 24, [{"text": "结果必须解释原因，而不是一个冷冰冰的百分比。", "size": 12, "color": MUTED}])
card(s, 660, 324, 540, 196)
txt(s, 688, 348, 300, 24, [{"text": "产品边界", "size": 15, "color": TEAL, "bold": True, "spc": 100}])
bound_lines = ["不能申请自己的行程；满员与已结束不可申请", "只有发布者可以接受或拒绝申请", "接受之后，双方才能进入文字聊天"]
for i, l in enumerate(bound_lines):
    txt(s, 688, 384 + i * 30, 480, 24, [{"text": l, "size": 13.5, "color": TEXT, "line": 1.2}])
txt(s, 688, 474, 480, 24, [{"text": "每一个限制，都是为了让同行关系可预期。", "size": 12, "color": MUTED}])
txt(s, 80, 578, 1120, 34, [{"runs": [
    {"text": "你不是在筛选陌生人，", "size": 18, "color": MUTED},
    {"text": "你是在筛选一段与自己重合的旅程。", "size": 18, "color": PEACH, "bold": True}]}])
footer(s, 7)

# ---------------------------------------------------------------- P8 solution 3
s = new_slide(prs)
heading(s, "07 · SOLUTION 03", "信任，是设计出来的", "陌生人同行不必靠运气——把安全感写进产品规则。")
trust = [
    ("VERIFY · 学生认证", "学生认证",
     "用姓名、院校与 12 位验证码完成学籍认证；未认证无法发起发布、申请等核心动作。"),
    ("CREDIT · 信用分", "信用分五档",
     "初始 80 分；守约与获赞加分，失约与举报扣分；低于 60 分受限，完成安全学习可恢复。"),
    ("REPORT · 举报回执", "随手举报",
     "详情页与聊天页都能一键举报；提交即得到回执，处理进展进入通知中心。"),
    ("NOTIFY · 通知中心", "八类通知",
     "申请、裁决、消息、信用、举报、客服、系统等八类事件实时送达，未读计数一目了然。"),
]
for i, (tag, t, d) in enumerate(trust):
    x = 80 + (i % 2) * 580
    y = 206 + (i // 2) * 214
    card(s, x, y, 540, 192)
    txt(s, x + 28, y + 22, 440, 20, [{"text": tag, "size": 11, "color": TEAL, "bold": True, "spc": 120}])
    txt(s, x + 28, y + 46, 460, 32, [{"text": t, "size": 19, "color": TEXT, "bold": True}])
    txt(s, x + 28, y + 86, 484, 96, [{"text": d, "size": 13, "color": MUTED, "line": 1.45}])
txt(s, 80, 632, 1120, 28, [{"runs": [
    {"text": "背后还有管理后台承接：", "size": 13.5, "color": MUTED},
    {"text": "用户管理 · 举报处理 · 人工客服工作台 · 平台概览", "size": 13.5, "color": TEXT, "bold": True}]}])
footer(s, 8)

# ---------------------------------------------------------------- P9 loop
s = new_slide(prs)
heading(s, "08 · LOOP", "一次旅行的终点，是下一次旅行的起点")
labels = ["灵感", "发布", "匹配", "连接", "同行", "分享", "新灵感"]
lcx, lcy, LR = 400, 420, 160
pts = []
for i in range(7):
    rad = math.radians(i * (360 / 7) - 90)
    pts.append((lcx + LR * math.cos(rad), lcy + LR * math.sin(rad)))
for i in range(7):
    a, b = pts[i], pts[(i + 1) % 7]
    connector(s, a[0], a[1], b[0], b[1], color=LINE, width=2)
for i, (p, lb) in enumerate(zip(pts, labels)):
    shp(s, MSO_SHAPE.OVAL, p[0] - 44, p[1] - 44, 88, 88,
        fill=ORANGE if i == 0 else CARD2, line=LINE, line_w=1)
    txt(s, p[0] - 40, p[1] - 12, 80, 24, [{"text": lb, "size": 12.5, "color": TEXT, "bold": True, "align": PP_ALIGN.CENTER}])
txt(s, 290, 372, 220, 62, [{"text": "7 步闭环", "size": 30, "color": TEXT, "bold": True, "align": PP_ALIGN.CENTER}])
txt(s, 290, 440, 220, 24, [{"text": "从想去，到出发，再到新的灵感", "size": 11.5, "color": MUTED, "align": PP_ALIGN.CENTER}])
card(s, 780, 224, 420, 178)
txt(s, 808, 248, 360, 24, [{"text": "参考此行程发布", "size": 17, "color": TEXT, "bold": True}])
txt(s, 808, 282, 364, 104, [{"text": "被别人的真实体验打动？一键预填目的地与路线，把它变成自己的新计划，只改日期与人数。",
                              "size": 12.5, "color": MUTED, "line": 1.45}])
card(s, 780, 426, 420, 178)
txt(s, 808, 450, 360, 24, [{"text": "真实体验沉淀", "size": 17, "color": TEXT, "bold": True}])
txt(s, 808, 484, 364, 104, [{"text": "轻松 / 适中 / 较累三档强度评价，加一条给后来者的建议，回到行程详情与灵感首页。",
                              "size": 12.5, "color": MUTED, "line": 1.45}])
footer(s, 9)

# ---------------------------------------------------------------- P10 stories
s = new_slide(prs)
heading(s, "09 · STORIES", "五个用户故事，一条完整旅程")
stories = [
    ("US-01", "浏览者", "获得灵感", "作为一名不知道去哪里的学生，我想浏览别人的行程和真实体验，找到旅行方向。",
     ["双视图列表", "省市与日期筛选", "体验卡参考发布"]),
    ("US-02", "发布者", "发布行程", "作为一名已有想法的学生，我想发布目的地、日期和路线，让同路的人找到我。",
     ["必填与日期校验", "地图选点路线", "发布即进入列表"]),
    ("US-03", "寻找搭子", "发现同行者", "作为一名寻找同伴的学生，我想看到目的地、日期与兴趣相近的计划，减少筛选成本。",
     ["匹配分与原因", "满员状态清晰", "只匹配招募中"]),
    ("US-04", "申请者 / 发布者", "建立连接", "我想提交同行申请，也想决定是否接受；双方同意后再开始聊天。",
     ["申请状态流转", "双向同意才可聊", "退出与举报兜底"]),
    ("US-05", "完成旅行的用户", "分享体验", "作为一名旅行归来的用户，我想留下真实体验与建议，帮助下一个出发的人。",
     ["强度与建议", "资格自动校验", "沉淀为下一条灵感"]),
]
for i, (num, role, title, story, acs) in enumerate(stories):
    x = 80 + i * 227
    card(s, x, 206, 212, 412)
    txt(s, x + 22, 230, 168, 20, [{"text": num, "size": 11, "color": ORANGE, "bold": True, "font": "Arial", "spc": 120}])
    txt(s, x + 22, 254, 168, 20, [{"text": role, "size": 11, "color": TEAL, "bold": True}])
    txt(s, x + 22, 282, 170, 30, [{"text": title, "size": 16.5, "color": TEXT, "bold": True}])
    txt(s, x + 22, 316, 170, 160, [{"text": story, "size": 12.5, "color": MUTED, "line": 1.45}])
    shp(s, MSO_SHAPE.RECTANGLE, x + 22, 486, 168, 1, fill="1E2839")
    txt(s, x + 22, 500, 170, 18, [{"text": "验收要点", "size": 10.5, "color": PEACH, "bold": True}])
    txt(s, x + 22, 522, 172, 86, [{"text": a, "size": 10.5, "color": MUTED, "line": 1.4, "after": 2} for a in acs])
txt(s, 80, 636, 1120, 26, [{"text": "五条故事共用同一套行程、同行、信用与通知能力——不是五个功能，而是一条旅程。",
                             "size": 13.5, "color": MUTED}])
footer(s, 10)

# ---------------------------------------------------------------- P11 panorama
s = new_slide(prs)
heading(s, "10 · PANORAMA", "产品全景：四层能力，托起一个闭环")
layers = [
    ("决策层", "DECIDE", ["地图路线规划", "AI 规划师", "目的地天气", "预算估算"]),
    ("连接层", "CONNECT", ["旅行灵感", "发布行程", "同行匹配", "申请与沟通", "我的旅行"]),
    ("信任层", "TRUST", ["学生认证", "信用分五档", "举报回执", "八类通知", "成长等级 LV1–LV5"]),
    ("运营层", "OPERATE", ["平台概览", "用户管理", "举报处理", "人工客服"]),
]
for i, (name, en, items) in enumerate(layers):
    y = 190 + i * 110
    card(s, 80, y, 1120, 94, fill=CARD)
    txt(s, 112, y + 20, 200, 40, [{"text": name, "size": 20, "color": TEXT, "bold": True}])
    txt(s, 112, y + 58, 200, 18, [{"text": en, "size": 10.5, "color": TEAL, "bold": True, "spc": 200}])
    cx0 = 330
    for it in items:
        c = chip(s, cx0, y + 28, it, size=12.5, color=TEXT, fill=CARD2, stroke=LINE, h=38)
        cx0 += int(c.width / PXE) + 12
txt(s, 80, 636, 1120, 24, [{"text": "从产品到运营，闭环的每一环都有对应能力承接。", "size": 12.5, "color": MUTED}])
footer(s, 11)

# ---------------------------------------------------------------- P12 closing
s = new_slide(prs, BG_DEEP)
txt(s, 80, 158, 1120, 22, [{"text": "ROUTEME · 路觅", "size": 12, "color": ORANGE, "bold": True, "spc": 300, "align": PP_ALIGN.CENTER}])
txt(s, 80, 196, 1120, 90, [{"text": "路，是走出来的；伴，是寻到的。", "size": 44, "color": TEXT, "bold": True, "align": PP_ALIGN.CENTER}])
txt(s, 80, 300, 1120, 32, [{"text": "让每一个想出发的大学生，都能安心上路。", "size": 19, "color": MUTED, "align": PP_ALIGN.CENTER}])
# minimal route decoration
dot = [(510, 400), (640, 372), (770, 400)]
connector(s, dot[0][0], dot[0][1], dot[1][0], dot[1][1], color=LINE, width=2, dash=MSO_LINE.DASH)
connector(s, dot[1][0], dot[1][1], dot[2][0], dot[2][1], color=LINE, width=2, dash=MSO_LINE.DASH)
shp(s, MSO_SHAPE.OVAL, dot[0][0] - 6, dot[0][1] - 6, 12, 12, fill=ORANGE, line=None)
shp(s, MSO_SHAPE.OVAL, dot[1][0] - 6, dot[1][1] - 6, 12, 12, fill=TEAL, line=None)
shp(s, MSO_SHAPE.OVAL, dot[2][0] - 6, dot[2][1] - 6, 12, 12, fill=TEXT, line=None)
txt(s, 80, 448, 1120, 64, [{"text": "谢谢", "size": 32, "color": ORANGE, "bold": True, "align": PP_ALIGN.CENTER}])
txt(s, 80, 512, 1120, 24, [{"text": "期待与你 · 同路出发", "size": 13, "color": "64748B", "align": PP_ALIGN.CENTER}])

OUT = r"c:\Users\LIUWA2\Desktop\ITA\11.13\RouteME\ai4se-baseline\RouteME\docs\RouteMe_路觅_产品发布会.pptx"
prs.save(OUT)
print("saved", OUT, "slides:", len(prs.slides.__iter__.__self__._sldIdLst))

