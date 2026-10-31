// CSV para abrir con Excel (separador «;», BOM para los acentos).
// Comillas en todos los campos; las fórmulas (=, +, -, @) se neutralizan para que Excel no las ejecute.
// Un teléfono como «+34 600…» o un «-300» se dejan tal cual. También la usan los CSV del navegador
// (Papa.unparse con `escapeFormulae: FORMULA_EXCEL`).
export const FORMULA_EXCEL = /^[=@\t\r]|^[+\-](?![\d\s().]*$)/;

export function celdaCsv(v: unknown) {
  let s = v === null || v === undefined ? "" : String(v);
  if (FORMULA_EXCEL.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvExcel(cabecera: string[], filas: unknown[][]) {
  return "﻿" + [cabecera, ...filas].map((f) => f.map(celdaCsv).join(";")).join("\r\n");
}

export const nombreArchivo = (txt: string) => txt.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
