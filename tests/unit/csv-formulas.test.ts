// Los CSV que se exportan no dejan que Excel ejecute fórmulas que vienen de formularios públicos.
import { describe, expect, it } from "vitest";
import Papa from "papaparse";
import { FORMULA_EXCEL, celdaCsv } from "@/lib/csv-excel";

const exportar = (valor: string) => Papa.unparse([{ v: valor }], { escapeFormulae: FORMULA_EXCEL }).split("\r\n")[1];

describe("fórmulas en los CSV exportados (Papa.unparse)", () => {
  it("neutraliza lo que Excel ejecutaría", () => {
    expect(exportar('=HYPERLINK("https://malo.test","clic")')).toBe(`"'=HYPERLINK(""https://malo.test"",""clic"")"`);
    expect(exportar("@SUM(A1:A9)")).toBe(`"'@SUM(A1:A9)"`);
    expect(exportar("+cmd|' /C calc'!A0")).toBe(`"'+cmd|' /C calc'!A0"`);
    expect(exportar("-2+3+cmd")).toBe(`"'-2+3+cmd"`);
  });

  it("deja tal cual teléfonos, números negativos y texto normal", () => {
    expect(exportar("+34 600 11 22 33")).toBe("+34 600 11 22 33");
    expect(exportar("-300")).toBe("-300");
    expect(exportar("Ana Pérez")).toBe("Ana Pérez");
  });

  it("usa la misma regla que el CSV de las rutas del servidor", () => {
    expect(celdaCsv("=1+1")).toBe(`"'=1+1"`);
    expect(celdaCsv("+34 600 11 22 33")).toBe(`"+34 600 11 22 33"`);
  });
});
