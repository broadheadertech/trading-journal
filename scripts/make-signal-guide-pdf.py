#!/usr/bin/env python3
"""Generate the Atlas 'How to Post a Signal' PDF handout."""
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT

OUT = sys.argv[1] if len(sys.argv) > 1 else "atlas-post-signal-guide.pdf"
VERSION = "2026-10-21"

# ── palette (print-friendly: white bg, dark ink, amber accent) ──
INK    = colors.HexColor("#1b2431")
MUTED  = colors.HexColor("#5c6b7e")
AMBER  = colors.HexColor("#b07a04")
GREEN  = colors.HexColor("#138a5e")
RED    = colors.HexColor("#c62c3c")
LINE   = colors.HexColor("#dde3ec")
SOFT   = colors.HexColor("#f5f8fc")
WHITE  = colors.white

styles = getSampleStyleSheet()

def S(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

h_kicker = S("kicker", fontName="Helvetica-Bold", fontSize=8.5, textColor=AMBER, spaceAfter=6, leading=11)
h_title  = S("title",  fontName="Helvetica-Bold", fontSize=23, textColor=INK, leading=27, spaceAfter=8)
h_lede   = S("lede",   fontName="Helvetica", fontSize=10.5, textColor=MUTED, leading=16, spaceAfter=2)
h_step   = S("step",   fontName="Helvetica-Bold", fontSize=12.5, textColor=INK, leading=15, spaceAfter=3)
h_body   = S("body",   fontName="Helvetica", fontSize=10, textColor=MUTED, leading=15)
h_num    = S("num",    fontName="Helvetica-Bold", fontSize=14, textColor=WHITE, alignment=1, leading=16)
h_sec    = S("sec",    fontName="Helvetica-Bold", fontSize=9, textColor=AMBER, leading=12, spaceBefore=4, spaceAfter=2)
h_fname  = S("fname",  fontName="Helvetica-Bold", fontSize=9.5, textColor=INK, leading=13)
h_freq   = S("freq",   fontName="Helvetica-Oblique", fontSize=7.5, textColor=MUTED, leading=10)
h_fdesc  = S("fdesc",  fontName="Helvetica", fontSize=9.5, textColor=MUTED, leading=14)
h_note   = S("note",   fontName="Helvetica", fontSize=9.5, textColor=INK, leading=15)
h_pill   = S("pill",   fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, alignment=1, leading=11)
h_act    = S("act",    fontName="Helvetica", fontSize=9.5, textColor=MUTED, leading=14)
h_tip    = S("tip",    fontName="Helvetica", fontSize=9.5, textColor=MUTED, leading=14)
h_foot   = S("foot",   fontName="Helvetica", fontSize=8, textColor=MUTED, leading=10)

story = []

# ── header ──
brand = Table(
    [[Paragraph('<font color="#b07a04">◆</font>&nbsp;<b>ATLAS</b>', S("brand", fontName="Helvetica-Bold", fontSize=12, textColor=INK)),
      Paragraph("SIGNAL PROVIDER GUIDE", S("br2", fontName="Helvetica-Bold", fontSize=8, textColor=MUTED, alignment=2))]],
    colWidths=[90*mm, 80*mm],
)
brand.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE"),
                           ("LEFTPADDING",(0,0),(-1,-1),0), ("RIGHTPADDING",(0,0),(-1,-1),0)]))
story += [brand, Spacer(1, 6), HRFlowable(width="100%", thickness=2, color=AMBER, spaceAfter=16)]

story += [
    Paragraph("HOW-TO", h_kicker),
    Paragraph("How to post a trading signal", h_title),
    Paragraph("A step-by-step guide for Atlas signal providers — from opening the form to managing a live "
              "call and closing it out. Everything your followers see comes from the fields below, so take "
              "a minute to fill them in cleanly.", h_lede),
    Spacer(1, 14),
]

# ── who can post callout ──
note = Table([[Paragraph(
    "<b>Who can post:</b> posting signals is available on any <b>paid plan</b> — Core, Pro, or Elite. "
    "On the free plan the button is locked; if you don't see <b>Post a Signal</b> on the Signals page, "
    "upgrade your plan or ask your admin.", h_note)]], colWidths=[170*mm])
note.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,-1), SOFT),
    ("LINEBEFORE",(0,0),(0,-1), 3, AMBER),
    ("TOPPADDING",(0,0),(-1,-1),10), ("BOTTOMPADDING",(0,0),(-1,-1),10),
    ("LEFTPADDING",(0,0),(-1,-1),13), ("RIGHTPADDING",(0,0),(-1,-1),13),
]))
story += [note, Spacer(1, 18)]


def numbox(n):
    t = Table([[Paragraph(str(n), h_num)]], colWidths=[9*mm], rowHeights=[9*mm])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),AMBER),
                           ("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                           ("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                           ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    return t


def step(n, title, *body_flowables):
    content = [Paragraph(title, h_step)] + list(body_flowables)
    t = Table([[numbox(n), content]], colWidths=[14*mm, 156*mm])
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),
                           ("LEFTPADDING",(0,0),(0,0),0),("RIGHTPADDING",(0,0),(0,0),6),
                           ("LEFTPADDING",(1,0),(1,0),0),("RIGHTPADDING",(1,0),(1,0),0),
                           ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0),
                           ("LINEABOVE",(0,0),(-1,0),0.75,LINE),("TOPPADDING",(0,0),(-1,0),14)]))
    return KeepTogether([t, Spacer(1, 6)])

story += [step(1, "Open the Signals page",
    Paragraph("Log in and open the app. In the left sidebar, click <b>Signals</b> (the broadcast icon). "
              "This is where all your posted calls live.", h_body))]
story += [step(2, "Click “Post a Signal”",
    Paragraph("Use the <b>Post a Signal</b> button near the top of the Signals page. A form opens where you "
              "enter the trade.", h_body))]

# field reference table (inside step 3)
fields = [
    ("Symbol", "required", "The instrument, e.g. XAUUSD, EURUSD, BTCUSDT. Typed in capitals automatically."),
    ("Market", "", "Commodities, Forex, Crypto, or Stocks. Sets sensible pip/lot defaults."),
    ("Order", "", "Pick direction & type: BUY / SELL as Market, Stop, or Limit (6 buttons)."),
    ("Risk Level", "", "Low, Medium, or High — your read on the setup's risk."),
    ("Entry Low", "required", "The entry price. For a single price, fill only this field."),
    ("Entry High", "optional", "Fill this to make the entry a zone (e.g. 4685–4700). Leave blank for a single price."),
    ("Stop Loss", "required", "Your invalidation level — below entry for a BUY, above entry for a SELL."),
    ("Take Profits", "1 or more", "Add TP1, TP2, … with “+ Add target” (no limit). Risk:reward is shown per target."),
    ("Description", "optional", "Your rationale / notes. Can be added or refined later via Edit."),
    ("Advanced", "optional", "Optional overrides — custom pip size, lot size, and whether to show pip annotations."),
]
rows = []
for name, req, desc in fields:
    left = [Paragraph(name, h_fname)]
    if req:
        left.append(Paragraph(req, h_freq))
    rows.append([left, Paragraph(desc, h_fdesc)])
ftable = Table(rows, colWidths=[34*mm, 122*mm])
fstyle = [
    ("VALIGN",(0,0),(-1,-1),"TOP"),
    ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7),
    ("LEFTPADDING",(0,0),(-1,-1),10),("RIGHTPADDING",(0,0),(-1,-1),10),
    ("BOX",(0,0),(-1,-1),0.75,LINE),
    ("INNERGRID",(0,0),(-1,-1),0.5,LINE),
]
for i in range(len(rows)):
    if i % 2 == 1:
        fstyle.append(("BACKGROUND",(0,i),(-1,i),SOFT))
ftable.setStyle(TableStyle(fstyle))

story += [step(3, "Fill in the trade details",
    Paragraph("Complete the fields below. Symbol, entry, stop loss, and at least one target are required — "
              "the rest are optional and can be edited later.", h_body),
    Spacer(1, 9), ftable)]

story += [step(4, "Post it",
    Paragraph("Click <b>Post Signal</b>. The call goes live on the Signals page and on your public profile, "
              "and your followers are notified. If anything is missing, a red message tells you what to fix.", h_body))]

# management actions (inside step 5)
def pill(label, color):
    t = Table([[Paragraph(label, h_pill)]], colWidths=[24*mm], rowHeights=[7*mm])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),color),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
                           ("LEFTPADDING",(0,0),(-1,-1),2),("RIGHTPADDING",(0,0),(-1,-1),2),
                           ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    return t

acts = [
    ("TP1 / TP2", GREEN, "<b>Mark a target hit while running.</b> Tap the TP chips to show a green check on "
                         "levels price has reached — the signal stays active, so followers see partial progress."),
    ("TARGET HIT", GREEN, "<b>Close as Won.</b> Pick the take-profit the position closed at — this records "
                          "the result and R-multiple."),
    ("SL", RED, "<b>Close as Lost.</b> Marks the signal stopped out (−1R)."),
    ("EDIT / CANCEL", AMBER, "<b>Adjust or withdraw.</b> Edit any field (e.g. add the rationale), or cancel a "
                             "call that's no longer valid."),
]
arows = [[pill(lbl, col), Paragraph(txt, h_act)] for lbl, col, txt in acts]
atable = Table(arows, colWidths=[28*mm, 128*mm])
atable.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),
                            ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),
                            ("LEFTPADDING",(0,0),(0,-1),0),("RIGHTPADDING",(0,0),(0,-1),8)]))

story += [step(5, "Manage it as the trade plays out",
    Paragraph("On your own signal card you have owner controls:", h_body),
    Spacer(1, 8), atable)]

# ── tips ──
story += [Spacer(1, 10), HRFlowable(width="100%", thickness=0.75, color=LINE, spaceAfter=10),
          Paragraph("TIPS FOR CLEAN SIGNALS", h_sec), Spacer(1, 4)]
tips = [
    "<b>Entry zone vs single price:</b> fill both Entry Low and Entry High for a range; leave High blank for one price.",
    "<b>Check your stop side:</b> stop loss goes below entry for a BUY and above entry for a SELL — the preview R:R looks wrong if it's flipped.",
    "<b>Ladder your targets:</b> add TP1, TP2, TP3… so followers can scale out; the per-target R:R updates live.",
    "<b>Post first, explain later:</b> the description is optional at post time — add it through Edit when you have a moment.",
    "<b>Mark partial hits</b> as price reaches each TP to keep your track record honest without closing the trade early.",
]
tip_rows = [[Paragraph('<font color="#b07a04">▪</font>', S("b", fontSize=9)), Paragraph(t, h_tip)] for t in tips]
ttable = Table(tip_rows, colWidths=[6*mm, 164*mm])
ttable.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),
                            ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),
                            ("LEFTPADDING",(0,0),(-1,-1),0)]))
story += [ttable]


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE); canvas.setLineWidth(0.75)
    canvas.line(20*mm, 14*mm, 190*mm, 14*mm)
    canvas.setFont("Helvetica", 8); canvas.setFillColor(MUTED)
    canvas.drawString(20*mm, 9*mm, f"Atlas · Signal Provider Guide · v{VERSION}")
    canvas.drawRightString(190*mm, 9*mm, f"Page {doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(OUT, pagesize=A4,
                        leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=20*mm,
                        title="How to Post a Signal - Atlas", author="Atlas")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("WROTE", OUT)
