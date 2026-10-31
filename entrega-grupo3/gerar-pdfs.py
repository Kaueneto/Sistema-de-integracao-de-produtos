"""Gera PDFs de leitura a partir dos documentos Markdown da entrega."""

from pathlib import Path
import html
import re
import textwrap

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape, A3
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted,
    Image as RLImage, PageBreak,
)


ROOT = Path(__file__).parent
FONT_DIR = Path('C:/Windows/Fonts')
REGULAR = FONT_DIR / 'arial.ttf'
BOLD = FONT_DIR / 'arialbd.ttf'
pdfmetrics.registerFont(TTFont('ArialEntrega', str(REGULAR)))
pdfmetrics.registerFont(TTFont('ArialEntrega-Bold', str(BOLD)))
pdfmetrics.registerFontFamily('ArialEntrega', normal='ArialEntrega', bold='ArialEntrega-Bold')


def styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(name='TituloEntrega', fontName='ArialEntrega-Bold', fontSize=17,
                            leading=22, textColor=colors.HexColor('#16324f'), spaceAfter=11))
    base.add(ParagraphStyle(name='SubtituloEntrega', fontName='ArialEntrega-Bold', fontSize=11.5,
                            leading=14, textColor=colors.HexColor('#245a81'), spaceBefore=8, spaceAfter=4))
    base.add(ParagraphStyle(name='CorpoEntrega', fontName='ArialEntrega', fontSize=8.8,
                            leading=12.4, spaceAfter=4))
    base.add(ParagraphStyle(name='TabelaEntrega', fontName='ArialEntrega', fontSize=8.2,
                            leading=11))
    base.add(ParagraphStyle(name='TabelaCabEntrega', fontName='ArialEntrega-Bold', fontSize=8.2,
                            leading=11, textColor=colors.white))
    base.add(ParagraphStyle(name='CodigoEntrega', fontName='Courier', fontSize=7.4,
                            leading=9.2, backColor=colors.HexColor('#f2f5f8'),
                            borderPadding=4, spaceAfter=5))
    base.add(ParagraphStyle(name='LegendaEntrega', fontName='ArialEntrega', fontSize=8,
                            leading=11, textColor=colors.HexColor('#506274'), alignment=TA_CENTER))
    return base


ST = styles()


def inline(s):
    s = html.escape(s.strip())
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'`([^`]+)`', r'<font name="Courier">\1</font>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1', s)
    return s


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('ArialEntrega', 8)
    canvas.setFillColor(colors.HexColor('#657789'))
    canvas.drawString(20 * mm, 12 * mm, 'Grupo 3 | Integração por banco de dados')
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, f'Página {doc.page}')
    canvas.restoreState()


def render_markdown(source, target):
    lines = source.read_text(encoding='utf-8').splitlines()
    flow = []
    i = 0
    usable = A4[0] - 40 * mm
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            flow.append(Spacer(1, 2 * mm))
            i += 1
            continue
        if line.startswith('```'):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code.extend(textwrap.wrap(lines[i], width=86, replace_whitespace=False,
                                          drop_whitespace=False) or [''])
                i += 1
            flow.append(Preformatted('\n'.join(code), ST['CodigoEntrega']))
            i += 1
            continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{3,}:?', x) for x in cells):
                    rows.append(cells)
                i += 1
            if rows:
                n = max(len(x) for x in rows)
                data = []
                for ri, row in enumerate(rows):
                    row += [''] * (n - len(row))
                    sty = ST['TabelaCabEntrega'] if ri == 0 else ST['TabelaEntrega']
                    data.append([Paragraph(inline(cell), sty) for cell in row])
                table = Table(data, colWidths=[usable / n] * n, repeatRows=1, hAlign='LEFT')
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#245a81')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4f7')]),
                    ('GRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#cbd7e0')),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 5),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ]))
                flow.append(table)
            continue
        if line.startswith('# '):
            flow.append(Paragraph(inline(line[2:]), ST['TituloEntrega']))
            i += 1
            continue
        if line.startswith('## '):
            if source.stem == 'relatorio-tecnico' and line == '## Decisões e limites atuais':
                flow.append(PageBreak())
            flow.append(Paragraph(inline(line[3:]), ST['SubtituloEntrega']))
            i += 1
            continue
        if line.startswith('- '):
            flow.append(Paragraph('• ' + inline(line[2:]), ST['CorpoEntrega']))
            i += 1
            continue
        if re.match(r'^\d+\. ', line):
            flow.append(Paragraph(inline(line), ST['CorpoEntrega']))
            i += 1
            continue
        paragraph = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not (
            lines[i].startswith('#') or lines[i].startswith('|') or
            lines[i].startswith('```') or lines[i].startswith('- ') or
            re.match(r'^\d+\. ', lines[i])
        ):
            paragraph.append(lines[i].strip())
            i += 1
        flow.append(Paragraph(inline(' '.join(paragraph)), ST['CorpoEntrega']))
    doc = SimpleDocTemplate(str(target), pagesize=A4, rightMargin=20 * mm,
                            leftMargin=20 * mm, topMargin=17 * mm,
                            bottomMargin=18 * mm, title=source.stem,
                            author='Grupo 3 - Sistema de Produtos')
    doc.build(flow, onFirstPage=footer, onLaterPages=footer)


def make_diagram(target):
    w, h = 2200, 1650
    im = Image.new('RGB', (w, h), '#ffffff')
    d = ImageDraw.Draw(im)
    title = ImageFont.truetype(str(BOLD), 48)
    head = ImageFont.truetype(str(BOLD), 29)
    body = ImageFont.truetype(str(REGULAR), 23)
    note = ImageFont.truetype(str(REGULAR), 19)
    d.text((75, 35), 'Modelo lógico — grupo3_db (PostgreSQL)', font=title, fill='#16324f')

    def box(x, y, width, height, name, fields, accent='#245a81'):
        d.rounded_rectangle((x, y, x+width, y+height), radius=14, fill='#f5f8fb',
                            outline=accent, width=3)
        d.rounded_rectangle((x, y, x+width, y+48), radius=14, fill=accent)
        d.rectangle((x, y+34, x+width, y+48), fill=accent)
        d.text((x+15, y+9), name, font=head, fill='white')
        for j, field in enumerate(fields):
            d.text((x+15, y+61+j*31), field, font=body, fill='#243746')

    def arrow(points, label=None):
        d.line(points, fill='#48708d', width=4, joint='curve')
        x, y = points[-1]
        px, py = points[-2]
        if x > px:
            d.polygon([(x,y),(x-18,y-10),(x-18,y+10)], fill='#48708d')
        elif y > py:
            d.polygon([(x,y),(x-10,y-18),(x+10,y-18)], fill='#48708d')
        if label:
            d.text((points[0][0]+10, points[0][1]-26), label, font=note, fill='#486276')

    d.text((75, 120), 'Catálogo e produtos', font=head, fill='#245a81')
    box(75, 175, 430, 140, 'categorias', ['PK nome', 'ativo'])
    box(75, 345, 430, 140, 'marcas', ['PK nome', 'ativo'])
    box(75, 515, 430, 140, 'fornecedores', ['PK nome', 'contato, ativo'])
    box(75, 685, 430, 140, 'unidades_medida', ['PK sigla', 'descricao, ativo'])
    box(850, 325, 570, 420, 'produtos', [
        'PK id_produto', 'nome, descricao', 'FK categoria → categorias.nome',
        'FK marca → marcas.nome', 'FK fornecedor → fornecedores.nome',
        'FK unidade_medida → unidades.sigla', 'preco, ativo, atualizado_em'])
    box(1640, 430, 485, 180, 'vw_integracao_produtos', ['VIEW public, 8 colunas', 'SELECT para Grupo 5'])
    for y0, y1 in [(245,390),(415,455),(585,520),(755,585)]:
        arrow([(505,y0),(690,y0),(690,y1),(850,y1)])
    arrow([(1420,520),(1640,520)], 'projeção')

    d.text((75, 870), 'Consumo do Grupo 1 e auditoria', font=head, fill='#245a81')
    box(75, 930, 600, 220, 'clientes_integrados', [
        'PK id; UK id_cliente_origem', 'nome, email, cidade, ativo',
        'atualizado_em_origem, integrado_em'], '#34806b')
    box(820, 930, 565, 220, 'integracoes', [
        'PK id; origem, destino', 'consultados, processados, rejeitados',
        'inseridos, atualizados, status'], '#34806b')
    box(1600, 930, 525, 220, 'erros_integracao', [
        'PK id; FK integracao_id', 'tipo_erro, descricao, dados',
        'ocorrido_em'], '#34806b')
    arrow([(1385,1035),(1600,1035)], '1 : N')
    d.text((77, 1170), 'id_cliente_origem referencia o código remoto; não existe FK entre bancos.', font=note, fill='#486276')

    d.text((75, 1240), 'Importação CSV preservada do trabalho anterior', font=head, fill='#245a81')
    box(75, 1300, 560, 220, 'importacoes', [
        'PK id; UK hash_arquivo', 'nome_arquivo, status', 'processados, rejeitados'], '#9b6a36')
    box(820, 1300, 565, 220, 'vendas', [
        'PK id; FK importacao_id', 'id_venda, id_cliente, id_produto',
        'quantidade, valor_total'], '#9b6a36')
    box(1600, 1300, 525, 220, 'erros_importacao', [
        'PK id; FK importacao_id', 'linha, motivo, dados'], '#9b6a36')
    arrow([(635,1390),(820,1390)], '1 : N')
    arrow([(635,1470),(1500,1470),(1500,1390),(1600,1390)], '1 : N')
    d.text((75, 1580), 'PK = chave primária · FK = chave estrangeira · UK = restrição única', font=note, fill='#486276')
    im.save(target)


def render_model(source, png, target):
    make_diagram(png)
    page = landscape(A3)
    flow = [Paragraph('4. Modelo do banco de dados', ST['TituloEntrega']),
            Paragraph('Derivado de sql/01-schema.sql. As linhas indicam relações declaradas no PostgreSQL.',
                      ST['CorpoEntrega']),
            RLImage(str(png), width=880, height=660),
            Spacer(1, 4*mm),
            Paragraph('A view publica produtos ao Grupo 5; clientes_integrados recebe identificadores externos do Grupo 1. '
                      'Não há FK entre bancos nem FK declarada de vendas para clientes ou produtos.',
                      ST['LegendaEntrega'])]
    doc = SimpleDocTemplate(str(target), pagesize=page, rightMargin=17*mm,
                            leftMargin=17*mm, topMargin=13*mm, bottomMargin=15*mm,
                            title='Modelo lógico do banco Grupo 3', author='Grupo 3')
    doc.build(flow)


if __name__ == '__main__':
    render_model(ROOT/'04-modelo'/'modelo-banco.md',
                 ROOT/'04-modelo'/'modelo-banco.png',
                 ROOT/'04-modelo'/'modelo-banco.pdf')
    for section, stem in [
        ('05-estrutura', 'estrutura-integracao'),
        ('06-configuracao', 'guia-configuracao'),
        ('07-relatorio-integracao', 'relatorio-integracao'),
        ('08-relatorio-tecnico', 'relatorio-tecnico'),
    ]:
        render_markdown(ROOT/section/f'{stem}.md', ROOT/section/f'{stem}.pdf')
    print('Gerados cinco PDFs e o PNG do modelo.')
