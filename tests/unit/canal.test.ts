// El canal de cada cita sale del UTM o de la página de agenda.
import { describe, expect, it } from "vitest";
import { canalDeOrigen, limpiarUrl, nombreCanal } from "@/lib/canal";

describe("canalDeOrigen", () => {
  it("lee utm_source de la página", () => {
    expect(canalDeOrigen("https://tudominio.com/agenda?utm_source=callers")).toBe("callers");
    expect(canalDeOrigen("https://tudominio.com/agenda?utm_source=callers&utm_source=callers")).toBe("callers");
    expect(canalDeOrigen("https://tudominio.com/agenda?utm_source=email")).toBe("email");
    expect(canalDeOrigen("https://tudominio.com/agenda?utm_source=YT")).toBe("yt");
    expect(canalDeOrigen("tudominio.com/agenda?utm_source=ig")).toBe("ig");
  });

  it("vale el utm del widget de GHL y el que GHL ya separó", () => {
    expect(canalDeOrigen("https://api.leadconnectorhq.com/widget/booking/CALENDARIO_ID?first_name=A&utm_source=callers&inicio=Ahora")).toBe("callers");
    expect(canalDeOrigen("https://tudominio.com/agenda", "webinar")).toBe("webinar");
  });

  it("acepta los alias", () => {
    expect(canalDeOrigen(null, "instagram")).toBe("ig");
    expect(canalDeOrigen(null, "youtube")).toBe("yt");
    expect(canalDeOrigen(null, "mail")).toBe("email");
  });

  it("las páginas viejas cuentan como su canal", () => {
    expect(canalDeOrigen("https://tudominio.com/agenda-yt")).toBe("yt");
    expect(canalDeOrigen("https://tudominio.com/agenda-ig/")).toBe("ig");
  });

  it("otra web sin UTM es «directo»; si trae UTM, manda el UTM", () => {
    expect(canalDeOrigen("https://web.tudominio.com/recursos")).toBe("directo");
    expect(canalDeOrigen("https://web.tudominio.com/recursos?utm_source=yt")).toBe("yt");
    expect(canalDeOrigen("http://localhost:4321/recursos.html")).toBe("directo");
  });

  it("sin UTM es «directo»; un UTM desconocido es «otro»; sin datos, null", () => {
    expect(canalDeOrigen("https://tudominio.com/agenda")).toBe("directo");
    expect(canalDeOrigen("https://api.leadconnectorhq.com/widget/booking/CALENDARIO_ID")).toBe("directo");
    expect(canalDeOrigen("https://tudominio.com/agenda?utm_source=facebook")).toBe("otro");
    expect(canalDeOrigen(null, null)).toBeNull();
    expect(canalDeOrigen("", "")).toBeNull();
  });

  it("la página se guarda sin datos personales (solo la ruta y los utm)", () => {
    expect(limpiarUrl("https://api.leadconnectorhq.com/widget/booking/X7q?first_name=Ana&email=a@b.com&phone=+1555&utm_source=callers")).toBe(
      "https://api.leadconnectorhq.com/widget/booking/X7q?utm_source=callers"
    );
    expect(limpiarUrl("https://tudominio.com/agenda-yt")).toBe("https://tudominio.com/agenda-yt");
    expect(limpiarUrl(null)).toBeNull();
  });

  it("nombre para la pantalla", () => {
    expect(nombreCanal("yt")).toBe("YouTube");
    expect(nombreCanal(null)).toBeNull();
    expect(nombreCanal("raro")).toBeNull();
  });
});
