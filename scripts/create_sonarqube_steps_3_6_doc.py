from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ACCENT = RGBColor(28, 63, 170)
TEXT = RGBColor(40, 40, 40)
MUTED = RGBColor(95, 95, 95)


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def style_run(run, *, size=11, bold=False, color=TEXT, font="Aptos"):
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:ascii"), font)
    run._element.rPr.rFonts.set(qn("w:hAnsi"), font)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def add_paragraph(doc, text="", *, align=None, space_after=6, space_before=0):
    p = doc.add_paragraph()
    if text:
        r = p.add_run(text)
        style_run(r)
    if align is not None:
        p.alignment = align
    fmt = p.paragraph_format
    fmt.space_after = Pt(space_after)
    fmt.space_before = Pt(space_before)
    fmt.line_spacing = 1.15
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    r = p.add_run(text)
    style_run(r)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.1
    return p


def add_number(doc, text):
    p = doc.add_paragraph(style="List Number")
    r = p.add_run(text)
    style_run(r)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.1
    return p


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f"Heading {level}")
    r = p.add_run(text)
    style_run(r, size=16 if level == 1 else 13, bold=True, color=ACCENT)
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(6)
    return p


def add_summary_table(doc):
    table = doc.add_table(rows=4, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    rows = [
        ("Bugs", "9"),
        ("Vulnerabilidades", "0"),
        ("Code Smells", "266"),
        ("Modo de visualización", "MQR Mode"),
    ]
    for i, (k, v) in enumerate(rows):
        for j, text in enumerate((k, v)):
            cell = table.cell(i, j)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cell.paragraphs[0]
            r = p.add_run(text)
            style_run(r, bold=(j == 0))
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.space_before = Pt(2)
            if j == 0:
                set_cell_shading(cell, "EAF0FF")
    doc.add_paragraph()


def add_hallazgo(doc, numero, titulo, archivo, linea, detalle):
    p = doc.add_paragraph()
    r = p.add_run(f"Hallazgo {numero}: ")
    style_run(r, bold=True, color=ACCENT)
    r = p.add_run(titulo)
    style_run(r, bold=True)
    p.paragraph_format.space_after = Pt(3)

    add_bullet(doc, f"Archivo: {archivo}")
    add_bullet(doc, f"Línea afectada: {linea}")
    add_bullet(doc, f"Descripción: {detalle}")


def add_label_paragraph(doc, label, text):
    p = doc.add_paragraph()
    r = p.add_run(f"{label}: ")
    style_run(r, bold=True)
    r = p.add_run(text)
    style_run(r)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.15
    return p


def build_doc(path):
    doc = Document()

    section = doc.sections[0]
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = title.add_run("Análisis de Resultados de SonarQube")
    style_run(r, size=22, bold=True, color=ACCENT)
    title.paragraph_format.space_after = Pt(8)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = subtitle.add_run("Pasos 3 al 6 del entregable")
    style_run(r, size=12, color=MUTED)
    subtitle.paragraph_format.space_after = Pt(18)

    add_paragraph(
        doc,
        "Este documento resume los hallazgos obtenidos en SonarQube para el proyecto Mi NextJS App, su interpretación, la propuesta de corrección y la reflexión final solicitada en la actividad.",
        align=WD_ALIGN_PARAGRAPH.JUSTIFY,
        space_after=10,
    )

    add_heading(doc, "Paso 3 – Análisis de resultados", level=1)
    add_paragraph(doc, "En el dashboard del proyecto se observó el siguiente resumen:", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    add_summary_table(doc)

    add_paragraph(doc, "Severidad detectada en el análisis:", align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    add_bullet(doc, "Critical: 17")
    add_bullet(doc, "Major: 140")
    add_bullet(doc, "Minor: 116")

    add_paragraph(doc, "Tres hallazgos relevantes seleccionados:", align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=6)

    add_hallazgo(
        doc,
        1,
        "Security Hotspot MEDIUM por uso de Math.random()",
        "src/app/api/users/generate-code/route.ts",
        "9",
        "Uso de Math.random() para generar códigos de 6 dígitos.",
    )
    add_hallazgo(
        doc,
        2,
        "BUG CRITICAL por ordenamiento alfabético sin localeCompare",
        "src/app/dashboard/schedules/page.tsx",
        "209",
        "Ordenamiento alfabético sin String.localeCompare().",
    )
    add_hallazgo(
        doc,
        3,
        "CODE_SMELL CRITICAL por complejidad cognitiva alta",
        "src/app/auth/page.tsx",
        "29",
        "Complejidad cognitiva alta en la lógica de autenticación y redirección.",
    )

    add_heading(doc, "Paso 4 – Interpretación de hallazgos", level=1)

    add_paragraph(doc, "Hallazgo 1", space_after=2)
    add_label_paragraph(doc, "Tipo de vulnerabilidad", "Generación insegura de valores aleatorios, asociada a criptografía débil.")
    add_label_paragraph(doc, "Riesgo de seguridad asociado", "Math.random() no es un generador criptográficamente seguro, por lo que los códigos podrían ser predecibles o más fáciles de adivinar.")
    add_label_paragraph(doc, "Impacto potencial si llega a producción", "Si esos códigos se usan para registro, invitaciones o asignación de roles, un atacante podría intentar adivinarlos y obtener acceso no autorizado o registrar cuentas de forma indebida.")

    add_paragraph(doc, "Hallazgo 2", space_after=2, space_before=6)
    add_label_paragraph(doc, "Tipo de vulnerabilidad", "Error lógico de procesamiento de datos.")
    add_label_paragraph(doc, "Riesgo de seguridad asociado", "No es una vulnerabilidad clásica, pero sí un fallo de confiabilidad. Un ordenamiento inconsistente puede producir decisiones incorrectas en la interfaz o en reglas de negocio.")
    add_label_paragraph(doc, "Impacto potencial si llega a producción", "Los horarios podrían mostrarse desordenados, generando errores al registrar asistencia, enviar comunicados o interpretar información académica. Esto afecta integridad y confiabilidad del sistema.")

    add_paragraph(doc, "Hallazgo 3", space_after=2, space_before=6)
    add_label_paragraph(doc, "Tipo de vulnerabilidad", "Debilidad de mantenibilidad en flujo de autenticación.")
    add_label_paragraph(doc, "Riesgo de seguridad asociado", "Una lógica de login demasiado compleja hace más difícil revisar el código, probarlo y detectar errores. En módulos de autenticación, esto aumenta el riesgo de introducir fallos de autorización o redirecciones incorrectas.")
    add_label_paragraph(doc, "Impacto potencial si llega a producción", "Podrían aparecer errores donde un usuario sea redirigido a una vista no esperada, se omitan validaciones o se generen regresiones de seguridad al modificar el flujo de acceso.")

    add_heading(doc, "Paso 5 – Propuesta de corrección", level=1)

    add_paragraph(doc, "Hallazgo 1", space_after=2)
    add_label_paragraph(doc, "Cómo corregirlo", "Reemplazar Math.random() por una fuente segura como crypto.randomInt(100000, 1000000) en Node.js. También conviene limitar intentos, registrar intentos fallidos y mantener expiración corta del código.")
    add_label_paragraph(doc, "Justificación de la mejora desde desarrollo seguro", "Los valores sensibles deben generarse con aleatoriedad criptográficamente segura para evitar predicción o ataques por fuerza bruta.")

    add_paragraph(doc, "Hallazgo 2", space_after=2, space_before=6)
    add_label_paragraph(doc, "Cómo corregirlo", "Cambiar el ordenamiento para usar localeCompare, por ejemplo: const uniqueSubjects = [...new Set(scheduleData.map(s => s.asignaturaNombre))].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));")
    add_label_paragraph(doc, "Justificación de la mejora desde desarrollo seguro", "Un sistema seguro también debe ser confiable y determinista. Si el orden cambia de forma inesperada, puede inducir errores funcionales que afecten operaciones sensibles del negocio.")

    add_paragraph(doc, "Hallazgo 3", space_after=2, space_before=6)
    add_label_paragraph(doc, "Cómo corregirlo", "Dividir la lógica del login en funciones más pequeñas, por ejemplo: validación de redirect login, validación de usuario autenticado, resolución de rol, decisión de redirección y manejo de errores. También conviene agregar pruebas para cada ruta de autenticación.")
    add_label_paragraph(doc, "Justificación de la mejora desde desarrollo seguro", "Reducir complejidad facilita auditoría, pruebas y mantenimiento. En componentes de autenticación esto es especialmente importante porque disminuye el riesgo de defectos de acceso y autorización.")

    add_heading(doc, "Paso 6 – Reflexión final", level=1)
    add_label_paragraph(doc, "¿Qué tipo de errores detectó SAST?", "Detectó errores de calidad, confiabilidad y seguridad, como criptografía débil, lógica compleja en autenticación, problemas de ordenamiento y varios code smells relacionados con mantenibilidad.")
    add_label_paragraph(doc, "¿Qué errores no había notado antes?", "No había notado que usar Math.random() para generar códigos puede ser inseguro, ni que un flujo de autenticación demasiado complejo puede convertirse en un riesgo indirecto de seguridad.")
    add_label_paragraph(doc, "¿Qué cambiaría en su forma de programar?", "Aplicaría funciones más pequeñas y simples, usaría APIs seguras por defecto para datos sensibles, revisaría mejor la lógica de autenticación y haría pruebas más específicas en módulos críticos.")

    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Edu360 | Pasos 3 al 6 – SonarQube")
    style_run(r, size=9, color=MUTED)

    doc.save(path)


if __name__ == "__main__":
    build_doc("/Users/greivin/Documents/GitHub/Edu360/Entregable_SonarQube_Pasos_3_6.docx")
