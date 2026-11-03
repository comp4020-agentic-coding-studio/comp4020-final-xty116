import { JSDOM } from "jsdom";
import axe, { type AxeResults } from "axe-core";
import { expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");
it("gives newcomers labelled controls and semantic pages at every core entry point", async () => {
  for (const path of [
    "/",
    "/readme/",
    "/search",
    "/groups/new",
    "/join",
    "/profile",
    "/groups/1",
    "/questions/1",
  ]) {
    const response = await fetch(new URL(path, baseUrl));
    expect(response.status, path).toBe(200);
    const dom = new JSDOM(await response.text(), {
      url: new URL(path, baseUrl).href,
      runScripts: "outside-only",
    });
    try {
      dom.window.eval(axe.source);
      const result: AxeResults = await dom.window.eval(
        'axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] }, rules: { "color-contrast": { enabled: false } } })',
      );
      expect(
        result.violations.map((violation) => ({
          id: violation.id,
          elements: violation.nodes.map((node) => node.target),
        })),
        path,
      ).toEqual([]);
    } finally {
      dom.window.close();
    }
  }
}, 20000);
