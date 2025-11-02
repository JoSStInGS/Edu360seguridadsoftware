export type ColumnMapping = {
  field: string;
  column: string | null;
  required?: boolean;
};

export type ParsedCsvTable = {
  headerRow: string[];
  dataRows: string[][];
};

export type StoredStudent = {
  id: string;
  name: string;
  birthDate?: string;
  level?: string;
  group?: string;
  status: "Activo" | "Inactivo";
};

function detectDelimiter(line: string) {
  const commaCount = (line.match(/,/g) ?? []).length;
  const semicolonCount = (line.match(/;/g) ?? []).length;
  const tabCount = (line.match(/\t/g) ?? []).length;

  if (semicolonCount > commaCount && semicolonCount >= tabCount) {
    return ";";
  }

  if (tabCount > commaCount) {
    return "\t";
  }

  return ",";
}

function parseDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

export function parseCsvContent(content: string): ParsedCsvTable | null {
  const withoutBom = content.replace(/^\uFEFF/, "");
  const lines = withoutBom.split(/\r?\n/);

  while (lines.length > 0 && lines[lines.length - 1].trim().length === 0) {
    lines.pop();
  }

  while (lines.length > 0 && lines[0].trim().length === 0) {
    lines.shift();
  }

  if (lines.length === 0) {
    return null;
  }

  const delimiter = detectDelimiter(lines[0]);
  const parsedRows = lines
    .map((line) => parseDelimitedLine(line, delimiter))
    .map((row) => row.map((cell) => cell.trim()));

  if (parsedRows.length === 0) {
    return null;
  }

  const [headerRow, ...dataRows] = parsedRows;

  if (!headerRow || headerRow.every((cell) => cell.length === 0)) {
    return null;
  }

  const filteredDataRows = dataRows.filter((row) =>
    row.some((cell) => cell.length > 0),
  );

  return { headerRow, dataRows: filteredDataRows };
}

function normalizeBirthDate(input: string | undefined) {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const slashFormat = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashFormat) {
    const [, dayRaw, monthRaw, year] = slashFormat;
    const day = dayRaw.padStart(2, "0");
    const month = monthRaw.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

export function buildStudentsFromCsv(
  table: ParsedCsvTable,
  mappings: ColumnMapping[],
): StoredStudent[] {
  const headerIndex = new Map(
    table.headerRow.map((column, index) => [column.trim(), index] as const),
  );

  const fieldToColumn = new Map<string, string>();
  mappings.forEach((mapping) => {
    if (mapping.column) {
      fieldToColumn.set(mapping.field, mapping.column);
    }
  });

  const getValue = (row: string[], field: string) => {
    const column = fieldToColumn.get(field);
    if (!column) {
      return "";
    }

    const index = headerIndex.get(column.trim());
    if (index === undefined) {
      return "";
    }

    return row[index]?.trim() ?? "";
  };

  const students: StoredStudent[] = [];

  table.dataRows.forEach((row) => {
    const id = getValue(row, "Cédula");
    if (!id) {
      return;
    }

    const firstName = getValue(row, "Nombre");
    const firstLastName = getValue(row, "Primer apellido");
    const secondLastName = getValue(row, "Segundo apellido");
    const group = getValue(row, "Sección");
    const specialty = getValue(row, "Especialidad");
    const birthDate = normalizeBirthDate(getValue(row, "Fecha de nacimiento"));

    const fullName = [firstName, firstLastName, secondLastName]
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .join(" ");

    students.push({
      id,
      name: fullName || id,
      group: group || undefined,
      level: specialty || undefined,
      birthDate,
      status: "Activo",
    });
  });

  return students;
}

const FALLBACK_FIELDS = [
  "Cédula",
  "Nombre",
  "Primer apellido",
  "Segundo apellido",
  "Sección",
  "Especialidad",
  "Fecha de nacimiento",
];

export function createFallbackMappings(headerRow: string[]): ColumnMapping[] {
  return FALLBACK_FIELDS.map((field) => ({
    field,
    column:
      headerRow.find(
        (header) => header.trim().toLowerCase() === field.toLowerCase(),
      ) ?? null,
  }));
}
