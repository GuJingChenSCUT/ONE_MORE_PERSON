"""Render the editable demo guide with ReportLab. Requires reportlab and pypdf.

Usage: python scripts/build-demo-guide.py
The application itself does not depend on this document-generation script.
"""
from pathlib import Path
import html
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/system-demo-guide.md"
OUTPUT = ROOT / "output/pdf/One_More_Person_Demo_Guide.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
WIDTH = 504
styles = getSampleStyleSheet()
styles.add(ParagraphStyle("TitleOMP", fontName="Helvetica-Bold", fontSize=29, leading=34, spaceAfter=13, textColor=colors.black))
styles.add(ParagraphStyle("SectionOMP", fontName="Helvetica-Bold", fontSize=19, leading=23, spaceAfter=13, keepWithNext=True, textColor=colors.black))
styles.add(ParagraphStyle("SubOMP", fontName="Helvetica-Bold", fontSize=12.4, leading=16, spaceBefore=11, spaceAfter=6, keepWithNext=True, textColor=colors.black))
styles.add(ParagraphStyle("BodyOMP", fontName="Helvetica", fontSize=10.6, leading=14.3, spaceAfter=8, alignment=TA_LEFT, textColor=colors.HexColor("#20242b")))
styles.add(ParagraphStyle("CellOMP", parent=styles["BodyOMP"], fontSize=10, leading=13, spaceAfter=0))
styles.add(ParagraphStyle("ListOMP", parent=styles["BodyOMP"], leftIndent=13, firstLineIndent=-10, spaceAfter=5))


def inline(text):
    escaped = html.escape(text, quote=False)
    escaped = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", lambda m: '<a href="' + m[2] + '" color="#234aa6">' + m[1] + '</a>', escaped)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', escaped)
    return escaped


def paragraph(text, style="BodyOMP"):
    return Paragraph(inline(text), styles[style])


def table(rows):
    first = rows[0]
    widths = {
        "Person": [65, 173, 266],
        "Page": [65, 439],
        "Layer": [112, 392],
        "Step": [42, 223, 239],
        "Evidence": [105, 204, 195],
        "Situation": [130, 374],
    }.get(first[0], [WIDTH / len(first)] * len(first))
    data = [[paragraph("**" + cell + "**" if i == 0 else cell, "CellOMP") for cell in row] for i, row in enumerate(rows)]
    result = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    result.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef0f3")),
        ("LINEBELOW", (0, 0), (-1, 0), .5, colors.HexColor("#bcc1c8")),
        ("LINEBELOW", (0, 1), (-1, -1), .35, colors.HexColor("#d5d8dd")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return result


lines = SOURCE.read_text(encoding="utf-8").splitlines()
story = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    if not line:
        i += 1
        continue
    if line == "<!-- pagebreak -->":
        story.append(PageBreak())
    elif line.startswith("|"):
        rows = []
        while i < len(lines) and lines[i].strip().startswith("|"):
            row = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
            if not all(re.fullmatch(r"[-: ]+", cell) for cell in row):
                rows.append(row)
            i += 1
        story.extend([table(rows), Spacer(1, 8)])
        continue
    elif line.startswith("### "):
        story.append(paragraph(line[4:], "SubOMP"))
    elif line.startswith("## "):
        story.append(paragraph(line[3:], "SectionOMP"))
    elif line.startswith("# "):
        story.append(paragraph(line[2:], "TitleOMP"))
    elif line.startswith("- "):
        story.append(paragraph("- " + line[2:], "ListOMP"))
    elif re.match(r"\d+\. ", line):
        story.append(paragraph(line, "ListOMP"))
    else:
        story.append(paragraph(line))
    i += 1


def furniture(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#686f78"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(54, 766, "ONE MORE PERSON  /  SYSTEM AND DEMO GUIDE")
    canvas.drawString(54, 29, "Local rehearsal: chain 31337  |  Separate Monad evidence: chain 10143")
    canvas.drawRightString(558, 29, str(doc.page))
    canvas.restoreState()


doc = SimpleDocTemplate(str(OUTPUT), pagesize=letter, rightMargin=54, leftMargin=54,
                        topMargin=48, bottomMargin=46, title="One More Person - System and Demo Guide",
                        author="One More Person", subject="Local deployment, system explanation and live demonstration")
doc.build(story, onFirstPage=furniture, onLaterPages=furniture)
pdf = PdfReader(OUTPUT)
print(f"Created {OUTPUT} ({len(pdf.pages)} pages, {OUTPUT.stat().st_size:,} bytes)")
for number, page in enumerate(pdf.pages, 1):
    text = page.extract_text() or ""
    print(f"Page {number}: {len(text)} characters, {len(page.get('/Annots', []))} links")
